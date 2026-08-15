/**
 * A Supabase-Storage-shaped front door, in memory.
 *
 * The media uploader no longer sends bytes through a Server Action — it asks
 * the server for a signed ticket and PUTs the file straight to Storage. That
 * path cannot be tested against the PostgREST stub, because none of it is
 * PostgREST: it is `/storage/v1/*`, a different service with its own wire
 * format. This implements the handful of shapes the uploader actually uses.
 *
 * Objects live in a Map. That is enough, because what is being tested is the
 * *protocol* — that a ticket is issued for a server-chosen path, that the
 * browser can PUT to it without any key, that the row is only written once the
 * object is really there, and that a failure at either end cleans up after
 * itself.
 *
 * `faults` is the point of the whole thing. Storage failures are the ones that
 * matter and the ones you cannot cause on demand against a real project, so
 * they are switchable here: no bucket, a refused upload, a refused read-back.
 */

/** Parses exactly the multipart body supabase-js sends for a signed upload. */
function parseMultipart(buffer, contentType) {
  const match = /boundary=(?:"([^"]+)"|([^;]+))/i.exec(contentType ?? "");
  if (!match) return null;

  const boundary = Buffer.from(`--${match[1] ?? match[2]}`);
  const parts = [];
  let index = buffer.indexOf(boundary);

  while (index !== -1) {
    const start = index + boundary.length;
    const next = buffer.indexOf(boundary, start);
    if (next === -1) break;

    // Between the boundaries, minus the trailing CRLF.
    const chunk = buffer.subarray(start, next - 2);
    const split = chunk.indexOf("\r\n\r\n");
    if (split !== -1) {
      const headers = chunk.subarray(0, split).toString("utf8");
      const body = chunk.subarray(split + 4);
      const name = /name="([^"]*)"/i.exec(headers);
      const type = /content-type:\s*([^\r\n]+)/i.exec(headers);
      parts.push({
        name: name ? name[1] : null,
        contentType: type ? type[1].trim() : null,
        body,
      });
    }
    index = next;
  }

  return parts;
}

export function makeStorage() {
  /** bucket name → Map(path → { body, contentType, createdAt }) */
  const buckets = new Map([["site", new Map()]]);
  /** token → { bucket, path } */
  const tickets = new Map();

  const faults = {
    /** getBucket answers "not found", as it does before anybody creates it. */
    missingBucket: false,
    /** The PUT of the bytes fails, as a network or quota problem would. */
    uploadFails: false,
    /** The object cannot be read back, so the row must not be written. */
    infoFails: false,
    /** Signing itself fails. */
    signFails: false,
  };

  const json = (send, status, body) => send(status, body);

  /**
   * Returns false when the path is not Storage's, so the caller can carry on
   * to its own routing.
   */
  async function handle(url, request, readBody, send, sendRaw) {
    if (!url.pathname.startsWith("/storage/v1/")) return false;

    const rest = url.pathname.slice("/storage/v1".length);

    /* ── getBucket ─────────────────────────────────────────────────────── */
    const bucketMatch = /^\/bucket\/([^/]+)$/.exec(rest);
    if (bucketMatch && request.method === "GET") {
      const name = bucketMatch[1];
      if (faults.missingBucket || !buckets.has(name)) {
        return json(send, 404, { statusCode: "404", error: "Bucket not found", message: "Bucket not found" });
      }
      return json(send, 200, { id: name, name, public: true });
    }

    /* ── createSignedUploadUrl ─────────────────────────────────────────── */
    const signMatch = /^\/object\/upload\/sign\/([^/]+)\/(.+)$/.exec(rest);
    if (signMatch && request.method === "POST") {
      const [, bucket, path] = signMatch;

      if (faults.signFails) {
        return json(send, 500, { statusCode: "500", error: "Internal", message: "signing failed" });
      }
      if (faults.missingBucket || !buckets.has(bucket)) {
        return json(send, 404, { statusCode: "404", error: "Bucket not found", message: "Bucket not found" });
      }

      const token = `tkn_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
      tickets.set(token, { bucket, path });

      // supabase-js resolves this against its own base, so it must be the
      // path only — exactly what the real API returns.
      return json(send, 200, { url: `/object/upload/sign/${bucket}/${path}?token=${token}` });
    }

    /* ── uploadToSignedUrl (the browser's PUT) ─────────────────────────── */
    if (signMatch && request.method === "PUT") {
      const [, bucket, path] = signMatch;
      const token = url.searchParams.get("token");
      const ticket = token ? tickets.get(token) : null;

      if (!ticket || ticket.bucket !== bucket || ticket.path !== path) {
        return json(send, 400, {
          statusCode: "400",
          error: "InvalidJWT",
          message: "The signed upload token is not valid for this object.",
        });
      }
      if (faults.uploadFails) {
        return json(send, 500, {
          statusCode: "500",
          error: "Internal",
          message: "Storage could not accept the file.",
        });
      }

      const raw = await readBody();
      const parts = parseMultipart(raw, request.headers["content-type"]);
      const file = parts?.find((part) => !part.name) ?? parts?.[parts.length - 1];

      if (!file) return json(send, 400, { statusCode: "400", error: "Invalid", message: "No file part" });

      // One shot: the ticket is spent whether or not it is used again.
      tickets.delete(token);
      buckets.get(bucket).set(path, {
        body: file.body,
        contentType: file.contentType ?? "application/octet-stream",
        createdAt: new Date().toISOString(),
      });

      return json(send, 200, { Key: `${bucket}/${path}` });
    }

    /* ── info ──────────────────────────────────────────────────────────── */
    const infoMatch = /^\/object\/info\/([^/]+)\/(.+)$/.exec(rest);
    if (infoMatch && request.method === "GET") {
      const [, bucket, path] = infoMatch;
      const object = buckets.get(bucket)?.get(path);

      if (faults.infoFails) {
        return json(send, 500, { statusCode: "500", error: "Internal", message: "info failed" });
      }
      if (!object) {
        return json(send, 404, { statusCode: "404", error: "not_found", message: "Object not found" });
      }

      // snake_case on purpose: supabase-js camelizes this response.
      return json(send, 200, {
        id: path,
        name: path,
        version: "1",
        size: object.body.length,
        content_type: object.contentType,
        cache_control: "max-age=3600",
        etag: '"stub"',
        created_at: object.createdAt,
        updated_at: object.createdAt,
        last_accessed_at: object.createdAt,
        metadata: {},
      });
    }

    /* ── remove ────────────────────────────────────────────────────────── */
    const removeMatch = /^\/object\/([^/]+)$/.exec(rest);
    if (removeMatch && request.method === "DELETE") {
      const bucket = removeMatch[1];
      const raw = await readBody();
      const parsed = raw.length ? JSON.parse(raw.toString("utf8")) : {};
      const removed = [];

      for (const path of parsed.prefixes ?? []) {
        if (buckets.get(bucket)?.delete(path)) removed.push({ name: path });
      }
      return json(send, 200, removed);
    }

    /* ── the public URL, so an uploaded image actually renders ─────────── */
    const publicMatch = /^\/object\/public\/([^/]+)\/(.+)$/.exec(rest);
    if (publicMatch && (request.method === "GET" || request.method === "HEAD")) {
      const [, bucket, path] = publicMatch;
      const object = buckets.get(bucket)?.get(decodeURIComponent(path));
      if (!object) return json(send, 404, { message: "Object not found" });
      return sendRaw(200, object.body, { "Content-Type": object.contentType });
    }

    return json(send, 404, { message: "Not found" });
  }

  return {
    handle,
    faults,
    /** For assertions: what is actually in the bucket right now. */
    list: (bucket = "site") => [...(buckets.get(bucket)?.keys() ?? [])],
    count: (bucket = "site") => buckets.get(bucket)?.size ?? 0,
    get: (path, bucket = "site") => buckets.get(bucket)?.get(path) ?? null,
    /** Simulates a project where nobody has made the bucket yet. */
    dropBucket: (bucket = "site") => buckets.delete(bucket),
    createBucket: (bucket = "site") => buckets.set(bucket, new Map()),
    reset() {
      buckets.clear();
      buckets.set("site", new Map());
      tickets.clear();
      faults.missingBucket = false;
      faults.uploadFails = false;
      faults.infoFails = false;
      faults.signFails = false;
    },
  };
}
