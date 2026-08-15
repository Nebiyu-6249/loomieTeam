/**
 * What a team member looks like before anybody uploads a photograph.
 *
 * Not a stock portrait, not a generated face, not a grey silhouette. A drawn
 * plate on the studio's own ground carrying the member's number and the Loomie
 * mark — the same language as every other artefact on the site, and honest
 * about being a slot nobody has filled rather than pretending to be a person.
 *
 * Drawn to a canvas so the WebGL ring and the plain DOM roster can use the
 * same image. The alternative was two placeholders that drift apart, one of
 * which is only ever seen by people the other one was hidden from.
 */

/**
 * The site's own two ends, as literals — this runs outside React's CSS.
 *
 * The plate is a step lighter than the site's ink, because the About page's
 * ground is very nearly black and a plate painted in the same value as the
 * page reads as a hole rather than as an object.
 */
const INK = "#232E3D";
const PAPER = "#E4DDD1";
const GUIDE = "rgba(228, 221, 209, 0.22)";
const NOTE = "rgba(228, 221, 209, 0.55)";

/**
 * The Loomie mark, from the same geometry as the component: a rounded bar with
 * two apertures knocked out of it.
 */
function mark(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number
) {
  const scale = width / 70;
  context.save();
  context.translate(x, y);
  context.scale(scale, scale);

  context.fillStyle = PAPER;
  context.beginPath();
  context.roundRect(1, 1, 68, 34, 17);
  context.fill();

  // The apertures are cut rather than painted, so the plate shows through.
  context.globalCompositeOperation = "destination-out";
  for (const cx of [22, 48]) {
    context.beginPath();
    context.arc(cx, 18, 9, 0, Math.PI * 2);
    context.fill();
  }
  context.restore();
}

/**
 * Draws the plate. Returns the canvas so a caller can use it as a texture or
 * as an image source.
 *
 * `size` is the square edge in device pixels. The ring asks for something
 * generous because its planes are large on a wide screen; the DOM roster asks
 * for less.
 */
export function drawTeamPlaceholder(index: string, size = 512): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;

  const context = canvas.getContext("2d");
  if (!context) return canvas;

  context.fillStyle = INK;
  context.fillRect(0, 0, size, size);

  // A single centred rule, so the plate has the same drawn quality as the
  // sector and process artefacts rather than being a flat rectangle.
  context.strokeStyle = GUIDE;
  context.lineWidth = Math.max(1, size / 512);
  context.beginPath();
  context.moveTo(size * 0.12, size * 0.62);
  context.lineTo(size * 0.88, size * 0.62);
  context.stroke();

  mark(context, size * 0.5 - size * 0.13, size * 0.42, size * 0.26);

  context.fillStyle = NOTE;
  context.font = `${Math.round(size * 0.052)}px ui-monospace, "Geist Mono", monospace`;
  context.textAlign = "center";
  context.textBaseline = "top";
  // Letter-spaced by hand: canvas has no tracking, and the number set tight
  // looks like a different typeface from the rest of the site's annotation.
  const spaced = index.split("").join("  ");
  context.fillText(spaced, size * 0.5, size * 0.68);

  return canvas;
}

/** A data URL, for anywhere an `<img>` is easier than a canvas. */
export function teamPlaceholderUrl(index: string, size = 512): string {
  return drawTeamPlaceholder(index, size).toDataURL("image/png");
}
