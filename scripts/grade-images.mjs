import sharp from "sharp";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

/**
 * The Loomie grade.
 *
 * The placeholder photography arrived from six different visual universes —
 * a CGI gradient, neon-lit retro hardware, suburban architecture, a concrete
 * sculpture. Different sectors are fine; different universes are not, and no
 * amount of layout makes a purple gradient and a brutalist stairwell look
 * like one studio shot them.
 *
 * So they all go through one treatment: pulled almost to monochrome, then a
 * duotone that puts cold blue in the shadows and warm cream in the highlights,
 * with a little of the original colour allowed back so it reads as graded
 * photography rather than a filter. That is the snow-to-river palette applied
 * to the imagery instead of only to the interface.
 *
 * Four sources were removed from the repository rather than graded.
 * project-packaging.jpg photographed another company's product, logo and all;
 * project-editorial.jpg was a laptop displaying a different studio's copy; and
 * hero-3d-fluid.jpg was a purple-to-teal CGI gradient, which is the clearest
 * tell on the avoid-list and the one image this grade could not rescue — at
 * the settings that pull concrete and architecture into one tonality it still
 * came back with twice every other image's channel spread.
 *
 * project-digital.jpg went last, and it should have gone first: a desk of
 * vintage computing gear with "commodore", its C= logo, "CBM", "Model 8032"
 * and "Nintendo GAME BOY" all legible in frame. A studio that sells identity
 * work cannot show another company's trademarks as its own portfolio. It was
 * also the one source this grade never took — it still came back carrying the
 * original magenta cast, at roughly three times the channel spread of the
 * others, which is the measurement that should have caught it.
 *
 * That leaves two photographic sources. The rest of the imagery is drawn
 * instead, from the studio's own type, mark and palette — see
 * scripts/make-artefacts.mjs.
 *
 * Run: npm run grade-images
 */

const SOURCE = "public/images";
const OUT = "public/images/work";

/** Shadows toward this. Screened, so it lifts black rather than washing it. */
const SHADOW = { r: 0x1b, g: 0x25, b: 0x33 };
/** Highlights toward this. Multiplied, so it tints white rather than dimming. */
const HIGHLIGHT = { r: 0xf4, g: 0xed, b: 0xe1 };

/**
 * How much original colour is allowed back over the duotone.
 *
 * It has to be composited as PNG. ensureAlpha on a JPEG buffer is silently
 * discarded — JPEG carries no alpha channel — so the "14%" original lands at
 * full opacity and there is no grade at all, only a darker copy of the source.
 */
const COLOUR_RETURN = 0.16;

/**
 * The tonal window everything is pushed into. Nothing reaches pure black or
 * pure white, which is what stops four unrelated photographs from reading as
 * four different exposures.
 */
const FLOOR = 26;
const CEILING = 232;

/**
 * One crop per use. Cropping is part of the art direction, not a layout
 * detail: the archive wants tall frames, the hero wants a wide one, and a
 * source photographed for neither has to be composed for both.
 */
const RENDITIONS = [
  { name: "form", source: "project-minimal.jpg", width: 1600, height: 2000 },
  { name: "form-wide", source: "project-minimal.jpg", width: 2000, height: 1250 },
  { name: "structure", source: "project-spatial.jpg", width: 2000, height: 1250 },
  { name: "structure-tall", source: "project-spatial.jpg", width: 1400, height: 1750 },
  // Close crops. Two sources cannot carry a portfolio at one framing each,
  // and a tight detail of a material is a different photograph from the wide
  // shot it came out of — which is how a real archive gets its rhythm.
  {
    name: "concrete",
    source: "project-minimal.jpg",
    region: { left: 0.0, top: 0.0, width: 0.52, height: 0.52 },
    width: 1500,
    height: 1500,
  },
  {
    name: "canopy",
    source: "project-spatial.jpg",
    region: { left: 0.0, top: 0.0, width: 0.55, height: 0.6 },
    width: 1500,
    height: 1500,
  },
];

const solid = (width, height, colour, alpha) =>
  sharp({
    create: {
      width,
      height,
      channels: 4,
      background: { ...colour, alpha },
    },
  })
    .png()
    .toBuffer();

async function grade({ name, source, width, height, region }) {
  const file = path.join(SOURCE, source);

  let pipeline = sharp(file);

  if (region) {
    const { width: sw, height: sh } = await sharp(file).metadata();
    pipeline = pipeline.extract({
      left: Math.round(region.left * sw),
      top: Math.round(region.top * sh),
      width: Math.round(region.width * sw),
      height: Math.round(region.height * sh),
    });
  }

  const base = pipeline.resize(width, height, {
    fit: "cover",
    position: "attention",
  });

  const original = await base.clone().png().toBuffer();

  // Greyscale first, and normalised, so every source starts from the same
  // full-range luminance regardless of how it was exposed.
  const scale = (CEILING - FLOOR) / 255;
  const ramp = await sharp(original)
    .greyscale()
    .normalise()
    .linear(scale, FLOOR)
    .png()
    .toBuffer();

  const duotone = await sharp(ramp)
    .composite([
      { input: await solid(width, height, SHADOW, 1), blend: "screen" },
      { input: await solid(width, height, HIGHLIGHT, 1), blend: "multiply" },
    ])
    .png()
    .toBuffer();

  const finished = await sharp(duotone)
    .composite([
      {
        input: await sharp(original).ensureAlpha(COLOUR_RETURN).png().toBuffer(),
        blend: "over",
      },
    ])
    .jpeg({ quality: 82, progressive: true, mozjpeg: true })
    .toBuffer();

  const out = path.join(OUT, `${name}.jpg`);
  await writeFile(out, finished);

  const { channels } = await sharp(finished).stats();
  const luma =
    0.2126 * channels[0].mean + 0.7152 * channels[1].mean + 0.0722 * channels[2].mean;
  const spread = Math.max(...channels.map((c) => c.mean)) - Math.min(...channels.map((c) => c.mean));

  return { file: out, kb: Math.round(finished.length / 1024), luma, spread };
}

await mkdir(OUT, { recursive: true });

for (const rendition of RENDITIONS) {
  const { file, kb, luma, spread } = await grade(rendition);
  // Mean luma and channel spread are the check that the grade actually landed:
  // four images from one studio should sit in one tonal band, not four.
  console.log(
    `${file.padEnd(38)} ${kb.toString().padStart(4)}KB  luma ${luma.toFixed(1).padStart(5)}  spread ${spread.toFixed(1)}`
  );
}
