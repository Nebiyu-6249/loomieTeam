import sharp from "sharp";
import { mkdir, writeFile, access } from "node:fs/promises";
import path from "node:path";

/**
 * The studio's own artefacts, drawn rather than photographed.
 *
 * Two problems met here. The first: the placeholder photography had to lose a
 * third source. project-digital.jpg was a desk of vintage computing gear with
 * "commodore", "CBM", "Model 8032" and "Nintendo GAME BOY" all legible in the
 * frame, and it went the same way as project-packaging.jpg and
 * project-editorial.jpg before it — a brand studio cannot put another
 * company's trademarks in its portfolio and call the work its own. The grade
 * had not landed on it either; it still carried the original magenta cast.
 *
 * The second: that left two photographs, and two photographs cannot carry a
 * portfolio, a services index and a process section without the same picture
 * turning up four times. New photography cannot be fetched — the network
 * policy blocks image hosts.
 *
 * So the rest of the imagery is made here, and it is made out of Loomie:
 * the real typefaces, the real logo mark, the real palette. A brand-manual
 * sheet, a type specimen, a grid diagram, a tonal ramp and a page structure —
 * the artefacts a design studio actually produces, which is a better answer
 * for a design studio's website than more stock photography would have been.
 *
 * Nothing here depicts a real company or a claimed client. It depicts the
 * system this site is built on, which is the one thing the site can show
 * without asserting anything untrue.
 *
 * Run: npm run make-artefacts
 */

const OUT = "public/images/work";
const FONT_CACHE = "node_modules/.cache/loomie-fonts";

/**
 * The site's own faces, fetched as TTF so librsvg can set them.
 *
 * next/font caches woff2, which fontconfig will not read, so these are pulled
 * separately and kept out of the repository. The legacy user-agent is what
 * makes the CSS endpoint hand back truetype instead.
 */
const FACES = [
  {
    file: "InstrumentSerif-Regular.ttf",
    url: "https://fonts.gstatic.com/s/instrumentserif/v5/jizBRFtNs2ka5fXjeivQ4LroWlx-2zI.ttf",
  },
  {
    file: "GeistMono-Regular.ttf",
    url: "https://fonts.gstatic.com/s/geistmono/v6/or3yQ6H-1_WfwkMZI_qYPLs1a-t7PU0AbeE9KJ5T.ttf",
  },
];

// The body sans is not fetched: nothing on a plate is set in it. Display and
// mono are the two voices these sheets speak in.
const SERIF = "Instrument Serif";
const MONO = "Geist Mono";

/**
 * The same two ends as the photographic grade, pulled just inside the tonal
 * window the photographs land in so a drawn plate and a graded photograph sit
 * at the same exposure.
 */
const INK = "#1B2533";
const PAPER = "#E4DDD1";
/** Annotation, on either ground. Reads as pencil rather than as a second ink. */
const NOTE_ON_PAPER = "#8A8578";
const NOTE_ON_INK = "#78838F";
/** Construction geometry. Present, but never competing with the subject. */
const GUIDE_ON_PAPER = "#C2BBAE";
const GUIDE_ON_INK = "#33414F";

async function ensureFonts() {
  await mkdir(FONT_CACHE, { recursive: true });

  for (const face of FACES) {
    const target = path.join(FONT_CACHE, face.file);
    try {
      await access(target);
      continue;
    } catch {
      /* not cached yet */
    }

    const response = await fetch(face.url);
    if (!response.ok) {
      throw new Error(
        `Could not fetch ${face.file} (${response.status}). The plates need the ` +
          `site's own typefaces; rendering them in a fallback face would defeat ` +
          `the point of drawing them.`
      );
    }
    await writeFile(target, Buffer.from(await response.arrayBuffer()));
    console.log(`fetched ${face.file}`);
  }

  const conf = path.resolve(FONT_CACHE, "fonts.conf");
  await writeFile(
    conf,
    `<?xml version="1.0"?>
<!DOCTYPE fontconfig SYSTEM "fonts.dtd">
<fontconfig>
  <dir>${path.resolve(FONT_CACHE)}</dir>
  <cachedir>${path.resolve(FONT_CACHE, "fc-cache")}</cachedir>
</fontconfig>
`
  );

  // librsvg reads fontconfig at first use, so this has to be set before any
  // rendering happens rather than passed in per call.
  process.env.FONTCONFIG_FILE = conf;
}

/* ── Shared furniture ──────────────────────────────────────────────────── */

const esc = (value) =>
  String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Mono, uppercase, wide-tracked: the site's annotation voice. */
const note = (x, y, text, fill, size = 15, anchor = "start", tracking = 2.4) =>
  `<text x="${x}" y="${y}" font-family="${MONO}" font-size="${size}" letter-spacing="${tracking}"
     fill="${fill}" text-anchor="${anchor}">${esc(String(text).toUpperCase())}</text>`;

/** Corner registration marks. Every sheet carries them; it is what makes it a sheet. */
const registration = (w, h, m, stroke) => {
  const arm = 26;
  return [
    [m, m, 1, 1],
    [w - m, m, -1, 1],
    [m, h - m, 1, -1],
    [w - m, h - m, -1, -1],
  ]
    .map(
      ([x, y, sx, sy]) =>
        `<path d="M${x} ${y}h${arm * sx}M${x} ${y}v${arm * sy}" stroke="${stroke}" stroke-width="1.25" fill="none"/>`
    )
    .join("");
};

/** The Loomie mark, at any size, from the same geometry as the component. */
const mark = (x, y, width, fill, hole) => {
  const s = width / 70;
  return `<g transform="translate(${x} ${y}) scale(${s})">
      <rect x="1" y="1" width="68" height="34" rx="17" fill="${fill}"/>
      <circle cx="22" cy="18" r="9" fill="${hole}"/>
      <circle cx="48" cy="18" r="9" fill="${hole}"/>
    </g>`;
};

/** A dimension line with end ticks and a label, as on a drawing sheet. */
const dimension = (x1, y1, x2, y2, label, stroke, fill) => {
  const vertical = x1 === x2;
  const tick = 7;
  const ends = vertical
    ? `M${x1 - tick} ${y1}h${tick * 2}M${x2 - tick} ${y2}h${tick * 2}`
    : `M${x1} ${y1 - tick}v${tick * 2}M${x2} ${y2 - tick}v${tick * 2}`;
  const label_ = vertical
    ? `<text x="${x1 + 14}" y="${(y1 + y2) / 2}" font-family="${MONO}" font-size="13"
         letter-spacing="1.8" fill="${fill}" dominant-baseline="middle">${esc(label)}</text>`
    : `<text x="${(x1 + x2) / 2}" y="${y1 - 14}" font-family="${MONO}" font-size="13"
         letter-spacing="1.8" fill="${fill}" text-anchor="middle">${esc(label)}</text>`;
  return `<path d="M${x1} ${y1}L${x2} ${y2}${ends}" stroke="${stroke}" stroke-width="1.25" fill="none"/>${label_}`;
};

/* ── The plates ────────────────────────────────────────────────────────── */

/**
 * 01 — The mark under construction. This is the hero image.
 *
 * It has to answer "what kind of studio is this" in one look without being a
 * project, so it is Loomie's own mark on its own geometry: the axes the two
 * apertures sit on, the radius, the overall measure. A page out of the studio's
 * manual rather than a picture of somebody else's work.
 *
 * Deliberately square. The hero frame is portrait on a phone and landscape on a
 * desktop, and object-cover has to crop one of them; a square plate with this
 * much margin loses nothing either way.
 *
 * No headline on the plate, and no discipline row. The page sets both directly
 * around it — as the h1 above and the caption below — and the same words twice
 * inside one viewport is exactly the kind of thing this pass exists to remove.
 */
function manual(w, h) {
  const m = Math.round(w * 0.078);
  const markW = w * 0.58;
  const markX = w / 2 - markW / 2;
  const markH = markW * (36 / 70);
  const mid = h / 2;
  const markY = mid - markH / 2;
  const s = markW / 70;

  const axisTop = m + 52;
  const axisBottom = h - m - 120;
  const leftEye = markX + 22 * s;
  const rightEye = markX + 48 * s;
  const r = 9 * s;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
    <rect width="${w}" height="${h}" fill="${PAPER}"/>
    ${registration(w, h, m, GUIDE_ON_PAPER)}

    ${note(m, m - 26, "Loomie — brand system", NOTE_ON_PAPER)}
    ${note(w - m, m - 26, "Sheet 01 / Mark", NOTE_ON_PAPER, 15, "end")}

    <!-- The apertures set the whole geometry, so their axes are the guides. -->
    <g stroke="${GUIDE_ON_PAPER}" stroke-width="1.25" fill="none">
      <path d="M${m} ${mid}H${w - m}"/>
      <path d="M${leftEye} ${axisTop}V${axisBottom}"/>
      <path d="M${rightEye} ${axisTop}V${axisBottom}"/>
      <path d="M${markX} ${axisTop}V${axisBottom}" stroke-dasharray="7 9"/>
      <path d="M${markX + markW} ${axisTop}V${axisBottom}" stroke-dasharray="7 9"/>
    </g>

    ${mark(markX, markY, markW, INK, PAPER)}

    <!-- Radius, struck into the left aperture the way it would be on a drawing. -->
    <path d="M${leftEye} ${mid}l${r * 0.7} ${-r * 0.7}" stroke="${NOTE_ON_PAPER}"
      stroke-width="1.25" fill="none"/>
    <circle cx="${leftEye}" cy="${mid}" r="3.5" fill="${NOTE_ON_PAPER}"/>
    <text x="${leftEye + 16}" y="${mid - 20}" font-family="${MONO}" font-size="14"
      letter-spacing="1.8" fill="${NOTE_ON_PAPER}">r9u</text>

    ${dimension(
      markX,
      markY + markH + 66,
      markX + markW,
      markY + markH + 66,
      "70u",
      GUIDE_ON_PAPER,
      NOTE_ON_PAPER
    )}
    ${dimension(
      w - m - 30,
      markY,
      w - m - 30,
      markY + markH,
      "36u",
      GUIDE_ON_PAPER,
      NOTE_ON_PAPER
    )}

    <path d="M${m} ${h - m - 58}H${w - m}" stroke="${INK}" stroke-width="1.5"/>
    ${note(m, h - m - 22, "Apertures at 22u / 48u", NOTE_ON_PAPER, 14)}
    ${note(w - m, h - m - 22, "One mark, every size", NOTE_ON_PAPER, 14, "end")}
  </svg>`;
}

/**
 * 02 — Type specimen. The display face, at the sizes the site actually sets it.
 */
function specimen(w, h) {
  const m = 84;
  const ladder = [
    { size: 0.115, text: "Identity systems" },
    { size: 0.072, text: "Digital and web design" },
    { size: 0.046, text: "Built to stay coherent" },
  ];

  let y = h * 0.47;
  const lines = ladder
    .map((line) => {
      const px = Math.round(w * line.size);
      const row = `<text x="${m}" y="${y}" font-family="${SERIF}" font-size="${px}" fill="${PAPER}">${esc(line.text)}</text>
        <text x="${w - m}" y="${y}" font-family="${MONO}" font-size="13" letter-spacing="1.8"
          fill="${NOTE_ON_INK}" text-anchor="end">${px}</text>
        <path d="M${m} ${y + 26}H${w - m}" stroke="${GUIDE_ON_INK}" stroke-width="1.25"/>`;
      y += px * 1.1 + 92;
      return row;
    })
    .join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
    <rect width="${w}" height="${h}" fill="${INK}"/>
    ${registration(w, h, m, GUIDE_ON_INK)}

    ${note(m, m - 24, "Loomie — brand system", NOTE_ON_INK)}
    ${note(w - m, m - 24, "Sheet 02 / Type", NOTE_ON_INK, 15, "end")}

    <!-- One pair of characters, big enough to read the drawing of them. -->
    <text x="${m - 10}" y="${h * 0.33}" font-family="${SERIF}" font-size="${w * 0.42}"
      fill="${PAPER}">Aa</text>
    <path d="M${m} ${h * 0.33}H${w - m}" stroke="${GUIDE_ON_INK}" stroke-width="1.25"/>
    ${note(w - m, h * 0.33 - 20, "Baseline", NOTE_ON_INK, 13, "end")}

    ${lines}

    <path d="M${m} ${h - m - 96}H${w - m}" stroke="${GUIDE_ON_INK}" stroke-width="1.25"/>
    ${note(m, h - m - 52, "ABCDEFGHIJKLMNOPQRSTUVWXYZ", NOTE_ON_INK, 20, "start", 3.4)}
    ${note(m, h - m - 16, "0123456789 — & @ / ( ) . ,", NOTE_ON_INK, 20, "start", 3.4)}
  </svg>`;
}

/**
 * 03 — The grid. Twelve columns, the margins, and a layout part-placed on it,
 * which is the difference between a diagram of a grid and a grid in use.
 */
function grid(w, h) {
  /**
   * Wider than the other sheets on purpose.
   *
   * This plate is 16:10 and the case study hero frame is 16:9, so object-cover
   * takes five per cent off the top and bottom. At the standard margin that
   * crop lands straight through the sheet's own header line, which reads as a
   * mistake rather than as a crop. The margin is set to survive it.
   */
  const m = 150;
  const columns = 12;
  const gutter = 26;
  const inner = w - m * 2;
  const colW = (inner - gutter * (columns - 1)) / columns;
  const span = (start, count) => ({
    x: m + start * (colW + gutter),
    w: count * colW + (count - 1) * gutter,
  });

  const fills = Array.from({ length: columns }, (_, i) => {
    const x = m + i * (colW + gutter);
    return `<rect x="${x}" y="${m}" width="${colW}" height="${h - m * 2}" fill="${GUIDE_ON_PAPER}" opacity="0.32"/>`;
  }).join("");

  const baselines = Array.from({ length: Math.floor((h - m * 2) / 44) }, (_, i) => {
    const y = m + (i + 1) * 44;
    return `<path d="M${m} ${y}H${w - m}" stroke="${GUIDE_ON_PAPER}" stroke-width="0.9" opacity="0.6"/>`;
  }).join("");

  // A layout sitting on the grid, filling the sheet the way a real one would:
  // a headline against an image, a run of three, and a closing band.
  const head = span(0, 5);
  const image = span(6, 6);
  let y = m + 66;

  const headline =
    `<rect x="${head.x}" y="${y}" width="${head.w}" height="22" fill="${INK}"/>` +
    `<rect x="${head.x}" y="${y + 44}" width="${head.w * 0.74}" height="22" fill="${INK}"/>` +
    `<rect x="${head.x}" y="${y + 110}" width="${head.w * 0.46}" height="11" fill="${INK}" opacity="0.4"/>` +
    `<rect x="${image.x}" y="${y}" width="${image.w}" height="264" fill="${INK}" opacity="0.92"/>`;
  y += 264 + 104;

  const rule = `<path d="M${m} ${y}H${w - m}" stroke="${INK}" stroke-width="1.5"/>`;
  y += 52;

  const cardH = 176;
  const cards = [0, 4, 8]
    .map((start) => {
      const c = span(start, 3);
      return (
        `<rect x="${c.x}" y="${y}" width="${c.w}" height="${cardH}" fill="none" stroke="${INK}" stroke-width="1.5"/>` +
        `<rect x="${c.x}" y="${y + cardH + 22}" width="${c.w * 0.58}" height="11" fill="${INK}" opacity="0.4"/>`
      );
    })
    .join("");
  y += cardH + 22 + 11 + 96;

  // Two measures of running text, which is the other thing the grid has to hold.
  const measure = (start, count, rows) => {
    const c = span(start, count);
    return Array.from({ length: rows }, (_, i) => {
      const last = i === rows - 1;
      return `<rect x="${c.x}" y="${y + i * 34}" width="${last ? c.w * 0.55 : c.w}" height="10"
        fill="${INK}" opacity="0.28"/>`;
    }).join("");
  };
  const columnsOfText = measure(0, 4, 6) + measure(5, 4, 6);
  const closing = `<rect x="${span(9, 3).x}" y="${y}" width="${span(9, 3).w}" height="${6 * 34 - 14}"
    fill="${INK}" opacity="0.92"/>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
    <rect width="${w}" height="${h}" fill="${PAPER}"/>
    ${fills}${baselines}
    ${registration(w, h, m, GUIDE_ON_PAPER)}

    ${note(m, m - 26, "Loomie — brand system", NOTE_ON_PAPER)}
    ${note(w - m, m - 26, "Sheet 03 / Grid", NOTE_ON_PAPER, 15, "end")}

    ${headline}${rule}${cards}${columnsOfText}${closing}

    ${dimension(m, h - m + 44, m + colW, h - m + 44, "1 col", GUIDE_ON_PAPER, NOTE_ON_PAPER)}
    ${dimension(
      m + colW,
      h - m + 44,
      m + colW + gutter,
      h - m + 44,
      "gut",
      GUIDE_ON_PAPER,
      NOTE_ON_PAPER
    )}
    ${note(w - m, h - m + 48, `${columns} columns`, NOTE_ON_PAPER, 14, "end")}
  </svg>`;
}

/**
 * 04 — The tonal ramp. Snow at one end, river at the other, which is the
 * palette the whole site scrolls along.
 */
function swatch(w, h) {
  const m = 92;
  const steps = [
    ["#1B2533", "River"],
    ["#2C3948", "Deep"],
    ["#48545F", "Shade"],
    ["#6E7682", "Mid"],
    ["#9AA0A4", "Light"],
    ["#C4C3BC", "Pale"],
    ["#E4DDD1", "Snow"],
  ];
  const inner = w - m * 2;
  const gap = 12;
  const chipW = (inner - gap * (steps.length - 1)) / steps.length;
  const chipY = h * 0.28;
  const chipH = h * 0.42;

  const chips = steps
    .map(([hex, name], i) => {
      const x = m + i * (chipW + gap);
      return `<rect x="${x}" y="${chipY}" width="${chipW}" height="${chipH}" fill="${hex}"
          stroke="${GUIDE_ON_INK}" stroke-width="1.25"/>
        <text x="${x}" y="${chipY + chipH + 36}" font-family="${MONO}" font-size="15"
          letter-spacing="2" fill="${NOTE_ON_INK}">${esc(name.toUpperCase())}</text>
        <text x="${x}" y="${chipY + chipH + 60}" font-family="${MONO}" font-size="13"
          letter-spacing="1.6" fill="${NOTE_ON_INK}" opacity="0.6">${esc(hex.toUpperCase())}</text>`;
    })
    .join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
    <defs>
      <linearGradient id="ramp" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stop-color="#1B2533"/>
        <stop offset="1" stop-color="#E4DDD1"/>
      </linearGradient>
    </defs>
    <rect width="${w}" height="${h}" fill="${INK}"/>
    ${registration(w, h, m, GUIDE_ON_INK)}

    ${note(m, m - 24, "Loomie — brand system", NOTE_ON_INK)}
    ${note(w - m, m - 24, "Sheet 04 / Tone", NOTE_ON_INK, 15, "end")}

    <text x="${m}" y="${h * 0.215}" font-family="${SERIF}" font-size="${w * 0.075}"
      fill="${PAPER}">Snow to river</text>

    ${chips}

    <rect x="${m}" y="${h - m - 104}" width="${inner}" height="46" fill="url(#ramp)"
      stroke="${GUIDE_ON_INK}" stroke-width="1.25"/>
    ${note(m, h - m - 26, "Continuous — driven by scroll position", NOTE_ON_INK, 14)}
  </svg>`;
}

/**
 * 05 — Page structure. What a website looks like before it looks like
 * anything: regions, proportions, and the order they are read in.
 *
 * Every label is placed from the flow rather than guessed at, and each one sits
 * in the margin left for it. A wireframe whose annotations overlap the thing
 * they annotate is not a design artefact, it is a mistake.
 */
function wireframe(w, h) {
  const m = 88;
  const inner = w - m * 2;
  const gap = 26;
  const label = (x, y, text, anchor = "start") => note(x, y, text, NOTE_ON_PAPER, 13, anchor);
  const ink = (x, y, ww, hh, opacity = 1) =>
    `<rect x="${x}" y="${y}" width="${ww}" height="${hh}" fill="${INK}" opacity="${opacity}"/>`;
  const outline = (x, y, ww, hh) =>
    `<rect x="${x}" y="${y}" width="${ww}" height="${hh}" fill="none" stroke="${INK}" stroke-width="1.5"/>`;

  const parts = [];
  let y = m + 74;

  // Nav.
  parts.push(label(m, y - 14, "Nav"));
  parts.push(ink(m, y, 148, 16), ink(w - m - 240, y, 240, 16, 0.32));
  y += 16 + 84;

  // Proposition against the lead image.
  const textW = inner * 0.46;
  const imageX = m + inner * 0.54;
  const imageW = inner * 0.46;
  const imageH = 268;
  parts.push(label(m, y - 14, "Proposition"));
  parts.push(label(w - m, y - 14, "Lead image", "end"));
  parts.push(ink(m, y, textW, 32), ink(m, y + 50, textW * 0.78, 32));
  parts.push(ink(m, y + 124, textW * 0.6, 11, 0.4));
  parts.push(ink(m, y + 168, 168, 11, 0.66));
  parts.push(outline(imageX, y, imageW, imageH));
  parts.push(
    `<path d="M${imageX} ${y}l${imageW} ${imageH}M${imageX + imageW} ${y}l${-imageW} ${imageH}"
      stroke="${GUIDE_ON_PAPER}" stroke-width="1.25"/>`
  );
  y += imageH + 80;

  parts.push(`<path d="M${m} ${y}H${w - m}" stroke="${INK}" stroke-width="1.5"/>`);
  y += 56;

  // Selected work.
  const cardW = (inner - gap * 2) / 3;
  const cardH = 196;
  parts.push(label(m, y - 14, "Selected work"));
  for (let i = 0; i < 3; i += 1) {
    const x = m + i * (cardW + gap);
    parts.push(outline(x, y, cardW, cardH), ink(x, y + cardH + 24, cardW * 0.62, 11, 0.4));
  }
  y += cardH + 24 + 11 + 84;

  // Services index.
  const rowH = 62;
  parts.push(label(m, y - 14, "Services"));
  for (let i = 0; i < 4; i += 1) {
    const ry = y + i * rowH;
    parts.push(`<path d="M${m} ${ry}H${w - m}" stroke="${INK}" stroke-width="1.25" opacity="0.5"/>`);
    parts.push(ink(m, ry + 20, 34, 10, 0.35), ink(m + 60, ry + 16, inner * 0.34, 16, 0.8));
  }
  y += rowH * 4 + 46;

  // Contact.
  const footerH = h - m - y - 34;
  parts.push(label(m, y - 14, "Contact"));
  parts.push(ink(m, y, inner, footerH, 0.1), ink(m + 26, y + 40, inner * 0.34, 22));

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
    <rect width="${w}" height="${h}" fill="${PAPER}"/>
    ${registration(w, h, m, GUIDE_ON_PAPER)}

    ${note(m, m - 24, "Loomie — brand system", NOTE_ON_PAPER)}
    ${note(w - m, m - 24, "Sheet 05 / Structure", NOTE_ON_PAPER, 15, "end")}

    ${parts.join("")}
  </svg>`;
}

/* ── Render ────────────────────────────────────────────────────────────── */

const PLATES = [
  { name: "sheet-mark", draw: manual, width: 1600, height: 1600 },
  { name: "sheet-type", draw: specimen, width: 1400, height: 1750 },
  { name: "sheet-grid", draw: grid, width: 2000, height: 1250 },
  { name: "sheet-tone", draw: swatch, width: 1600, height: 1600 },
  { name: "sheet-structure", draw: wireframe, width: 1400, height: 1750 },
];

/**
 * Grain, at the same strength the photographs carry.
 *
 * Flat colour is where JPEG bands worst, and a drawn plate is almost all flat
 * colour. The noise dithers the ramps and, more usefully, stops the plates
 * looking vector-crisp beside photography that is not.
 */
async function grain(width, height) {
  const pixels = Buffer.alloc(width * height);
  for (let i = 0; i < pixels.length; i += 1) {
    pixels[i] = 118 + Math.round((Math.random() - 0.5) * 30);
  }
  return sharp(pixels, { raw: { width, height, channels: 1 } })
    .toColourspace("b-w")
    .png()
    .toBuffer();
}

await ensureFonts();
await mkdir(OUT, { recursive: true });

for (const plate of PLATES) {
  const { name, draw, width, height } = plate;
  const svg = draw(width, height);

  const flat = await sharp(Buffer.from(svg)).png().toBuffer();

  const finished = await sharp(flat)
    .composite([{ input: await grain(width, height), blend: "overlay" }])
    .jpeg({ quality: 86, progressive: true, mozjpeg: true })
    .toBuffer();

  const out = path.join(OUT, `${name}.jpg`);
  await writeFile(out, finished);

  const { channels } = await sharp(finished).stats();
  const luma =
    0.2126 * channels[0].mean + 0.7152 * channels[1].mean + 0.0722 * channels[2].mean;

  console.log(
    `${out.padEnd(40)} ${Math.round(finished.length / 1024)
      .toString()
      .padStart(4)}KB  luma ${luma.toFixed(1).padStart(5)}`
  );
}
