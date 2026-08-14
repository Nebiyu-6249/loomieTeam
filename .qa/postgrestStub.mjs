import http from "node:http";
import pg from "pg";

/**
 * A PostgREST-shaped front door onto the real local Postgres.
 *
 * Supabase's REST API is PostgREST. There is no Supabase project to point at
 * here and no Docker to run one, but there *is* a real Postgres carrying the
 * real schema, the real constraints and the real partial unique index — which
 * is where the guarantee that matters actually lives. So this translates the
 * handful of request shapes the application issues into SQL and hands the rows
 * back in PostgREST's format.
 *
 * What that buys: the booking route, lib/bookingStore and supabase-js all run
 * unmodified, and a double booking is refused by the same index that will
 * refuse it in production.
 *
 * What it does not buy: this is not PostgREST. It implements the query shapes
 * this codebase uses and nothing else — a handful of operators, one level of
 * embedding, and no row level security, because the service role bypasses RLS
 * anyway and that is the only key the booking path uses. A query this app does
 * not make is a query this stub will get wrong.
 */

const OPERATORS = {
  eq: "=",
  neq: "<>",
  gt: ">",
  gte: ">=",
  lt: "<",
  lte: "<=",
};

/** `services:service_id ( slug, title )` → the embedded relation to resolve. */
function parseSelect(select) {
  if (!select || select === "*") return { columns: ["*"], embeds: [] };

  const columns = [];
  const embeds = [];
  let depth = 0;
  let buffer = "";

  const flush = () => {
    const part = buffer.trim();
    buffer = "";
    if (!part) return;

    const open = part.indexOf("(");
    if (open === -1) {
      columns.push(part);
      return;
    }

    // alias:column ( a, b )   or   table ( a, b )
    const head = part.slice(0, open).trim();
    const inner = part.slice(open + 1, part.lastIndexOf(")"));
    const [alias, source] = head.includes(":")
      ? head.split(":").map((s) => s.trim())
      : [head, head];

    embeds.push({
      alias,
      /** A foreign key column on this row, or a child table name. */
      source,
      columns: inner.split(",").map((c) => c.trim()),
    });
  };

  for (const character of select) {
    if (character === "(") depth += 1;
    if (character === ")") depth -= 1;
    if (character === "," && depth === 0) {
      flush();
      continue;
    }
    buffer += character;
  }
  flush();

  return { columns, embeds };
}

/**
 * Which table each foreign key column points at, read from the database.
 *
 * Hand-writing this map is how the stub was wrong the first time: it listed
 * hero_image_id and not hero_media_id, so a services query tried to select from
 * a relation named after the column. The catalogue already knows the answer.
 *
 * Keyed "table.column", because two tables can name a foreign key the same
 * thing and mean different tables.
 */
async function readForeignKeys(client) {
  const { rows } = await client.query(`
    select
      source.relname as table_name,
      attribute.attname as column_name,
      target.relname as target_table
    from pg_constraint c
    join pg_class source on source.oid = c.conrelid
    join pg_class target on target.oid = c.confrelid
    join pg_attribute attribute
      on attribute.attrelid = c.conrelid and attribute.attnum = c.conkey[1]
    where c.contype = 'f'
      and source.relnamespace = 'public'::regnamespace
  `);

  const map = new Map();
  for (const row of rows) {
    map.set(`${row.table_name}.${row.column_name}`, row.target_table);
  }
  return map;
}

export async function startPostgrestStub(port, connectionString) {
  const client = new pg.Client({ connectionString });
  await client.connect();
  const foreignKeys = await readForeignKeys(client);

  const server = http.createServer(async (request, response) => {
    const url = new URL(request.url, `http://localhost:${port}`);
    const send = (status, body, headers = {}) => {
      const payload = body === undefined ? "" : JSON.stringify(body);
      response.writeHead(status, {
        "Content-Type": "application/json",
        ...headers,
      });
      response.end(payload);
    };

    // /rest/v1/<table>
    const match = url.pathname.match(/^\/rest\/v1\/([a-z_]+)$/);
    if (!match) return send(404, { message: "Not found" });
    const table = match[1];

    const params = url.searchParams;
    const { columns, embeds } = parseSelect(params.get("select"));

    /** Everything that is not a reserved PostgREST parameter is a filter. */
    const filters = [];
    const values = [];
    for (const [key, raw] of params.entries()) {
      if (["select", "order", "limit", "offset", "on_conflict"].includes(key)) continue;
      const [operator, ...rest] = raw.split(".");
      const sql = OPERATORS[operator];
      if (!sql) continue;
      values.push(rest.join("."));
      filters.push(`"${key}" ${sql} $${values.length}`);
    }
    const where = filters.length ? `where ${filters.join(" and ")}` : "";

    /** `Accept: application/vnd.pgrst.object+json` is .single()/.maybeSingle(). */
    const single = (request.headers.accept ?? "").includes("pgrst.object");
    const wantsRows =
      request.method === "GET" ||
      (request.headers.prefer ?? "").includes("return=representation");

    const readBody = async () => {
      const chunks = [];
      for await (const chunk of request) chunks.push(chunk);
      const raw = Buffer.concat(chunks).toString("utf8");
      return raw ? JSON.parse(raw) : null;
    };

    /** The table a foreign key on this table points at, or undefined. */
    const target = (column) => foreignKeys.get(`${table}.${column}`);

    /** Resolves embedded relations one row at a time. Correct, not fast. */
    const expand = async (rows) => {
      if (embeds.length === 0) return rows;

      for (const row of rows) {
        for (const embed of embeds) {
          const referenced = target(embed.source);
          if (referenced) {
            // Foreign key embed: services:service_id ( slug, title )
            const id = row[embed.source];
            if (embed.alias !== embed.source) delete row[embed.source];
            if (!id) {
              row[embed.alias] = null;
              continue;
            }
            const child = await client.query(
              `select ${embed.columns.map((c) => `"${c}"`).join(", ")}
                 from ${referenced} where id = $1`,
              [id]
            );
            row[embed.alias] = child.rows[0] ?? null;
          } else {
            // Child table embed: project_media ( role, alt, ... )
            const child = await client.query(
              `select ${embed.columns
                .filter((c) => !c.includes("("))
                .map((c) => `"${c}"`)
                .join(", ")}
                 from ${embed.source} where ${table.replace(/s$/, "")}_id = $1`,
              [row.id]
            );
            row[embed.alias] = child.rows;
          }
        }
      }
      return rows;
    };

    /**
     * Columns to actually select.
     *
     * Wider than what was asked for: a foreign key embed needs its key column
     * to follow, and a child table embed needs this row's id to match on.
     * Both are stripped again after expansion unless they were requested.
     */
    const extra = new Set();
    for (const embed of embeds) {
      if (target(embed.source)) extra.add(embed.source);
      else extra.add("id");
    }
    for (const column of columns) extra.delete(column);

    const projection = () => {
      if (columns.length === 0 || columns.includes("*")) return "*";
      return [...new Set([...columns, ...extra])].map((c) => `"${c}"`).join(", ");
    };

    const tidy = (rows) => {
      if (columns.includes("*")) return rows;
      for (const row of rows) for (const key of extra) delete row[key];
      return rows;
    };

    try {
      if (request.method === "GET") {
        const order = params.get("order");
        const orderSql = order
          ? `order by "${order.split(".")[0]}" ${
              order.endsWith(".desc") ? "desc" : "asc"
            }`
          : "";
        const { rows } = await client.query(
          `select ${projection()} from ${table} ${where} ${orderSql}`,
          values
        );
        await expand(rows);
        tidy(rows);
        if (single) {
          if (rows.length > 1) {
            return send(406, {
              code: "PGRST116",
              message: "more than one row returned",
            });
          }
          return send(200, rows[0] ?? null);
        }
        return send(200, rows);
      }

      if (request.method === "POST") {
        const body = await readBody();
        const list = Array.isArray(body) ? body : [body];
        const inserted = [];

        for (const item of list) {
          const keys = Object.keys(item);
          const placeholders = keys.map((_, i) => `$${i + 1}`);
          const { rows } = await client.query(
            `insert into ${table} (${keys.map((k) => `"${k}"`).join(", ")})
             values (${placeholders.join(", ")}) returning ${projection()}`,
            keys.map((k) => item[k])
          );
          inserted.push(...rows);
        }

        if (!wantsRows) return send(201, undefined);
        await expand(inserted);
        tidy(inserted);
        return send(201, single ? (inserted[0] ?? null) : inserted);
      }

      if (request.method === "PATCH") {
        const body = await readBody();
        const keys = Object.keys(body);
        const sets = keys.map((k, i) => `"${k}" = $${values.length + i + 1}`);
        const { rows } = await client.query(
          `update ${table} set ${sets.join(", ")} ${where} returning ${projection()}`,
          [...values, ...keys.map((k) => body[k])]
        );
        if (!wantsRows) return send(204, undefined);
        return send(200, single ? (rows[0] ?? null) : rows);
      }

      if (request.method === "DELETE") {
        const { rows } = await client.query(
          `delete from ${table} ${where} returning ${projection()}`,
          values
        );
        if (!wantsRows) return send(204, undefined);
        return send(200, single ? (rows[0] ?? null) : rows);
      }

      return send(405, { message: "Method not allowed" });
    } catch (error) {
      // PostgREST hands the Postgres SQLSTATE straight through, which is what
      // lib/bookingStore checks for: 23505 is the slot already being taken.
      return send(error.code === "23505" ? 409 : 400, {
        code: error.code ?? "unknown",
        message: error.message,
        details: error.detail ?? null,
        hint: error.hint ?? null,
      });
    }
  });

  await new Promise((resolve) => server.listen(port, resolve));

  return {
    url: `http://localhost:${port}`,
    async reset() {
      await client.query("delete from bookings");
      await client.query("delete from enquiries");
    },
    async close() {
      await new Promise((resolve) => server.close(resolve));
      await client.end();
    },
  };
}
