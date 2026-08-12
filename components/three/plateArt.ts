"use client";

/**
 * The six brand plates, drawn to canvases so they can be textures.
 *
 * A4 offers a choice between drei's Html and rendering to textures. Textures,
 * for two reasons. The plates have to pass each other in depth — that is the
 * entire point of moving this section into 3D — and DOM overlaid on a canvas
 * cannot be occluded by geometry, so Html would break the one thing the
 * rework exists to deliver. And the shared canvas sits behind the page, so
 * anything Html portals out would land behind the content with it.
 *
 * At 512 across for a plate drawn around 280 CSS pixels wide, the texture is
 * sharper than the DOM version it replaces.
 */

export type PlateKind =
  | "mark"
  | "colour"
  | "type"
  | "packaging"
  | "social"
  | "interface";

export const PLATE_WIDTH = 512;
export const PLATE_HEIGHT = 410;
export const CAPTION_WIDTH = 512;
/** Two stacked bands: the exploded label on top, the service beneath. */
export const CAPTION_BAND = 72;
export const CAPTION_HEIGHT = CAPTION_BAND * 2;

interface Palette {
  card: string;
  border: string;
  fg: string;
  fgSecondary: string;
  swatches: string[];
}

const PALETTES: Record<"dark" | "light", Palette> = {
  dark: {
    card: "#0E121A",
    border: "rgba(255,255,255,0.16)",
    fg: "#FFFFFF",
    fgSecondary: "#8A8A9A",
    swatches: ["#04060A", "#080B11", "#0E121A", "#8A8A9A", "#FFFFFF"],
  },
  light: {
    card: "#E7EBF1",
    border: "rgba(8,8,10,0.16)",
    fg: "#08080A",
    fgSecondary: "#5E5E6E",
    swatches: ["#F2F5F9", "#FFFFFF", "#E7EBF1", "#5E5E6E", "#08080A"],
  },
};

/**
 * next/font generates the real family names at build time, so they are read
 * off the element that carries them rather than guessed. Canvas silently
 * falls back to a default when it is handed a family it does not know.
 */
function families() {
  const style = getComputedStyle(document.body);
  const mono =
    style.getPropertyValue("--font-technical-mono").trim() ||
    "ui-monospace, monospace";
  const sans =
    style.getPropertyValue("--font-body-sans").trim() || "system-ui, sans-serif";
  return { mono, sans };
}

function surface(width: number, height: number) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

/** The LoomieEyes mark: a stadium with two apertures punched out of it. */
function drawMark(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  colour: string
) {
  const height = width * (185 / 360);
  const radius = height / 2;

  context.save();
  context.fillStyle = colour;
  context.beginPath();
  context.roundRect(x, y, width, height, radius);
  context.fill();

  // Apertures are cut rather than painted, so the plate behind shows through
  // exactly as the SVG mark's fill-background does.
  context.globalCompositeOperation = "destination-out";
  for (const centre of [113 / 360, 247 / 360]) {
    context.beginPath();
    context.arc(x + width * centre, y + height / 2, width * (46 / 360), 0, Math.PI * 2);
    context.fill();
  }
  context.restore();
}

function drawArt(
  context: CanvasRenderingContext2D,
  kind: PlateKind,
  palette: Palette
) {
  const { mono, sans } = families();
  const w = PLATE_WIDTH;
  const h = PLATE_HEIGHT;
  const pad = 34;

  context.fillStyle = palette.card;
  context.fillRect(0, 0, w, h);

  context.strokeStyle = palette.border;
  context.lineWidth = 2;
  context.strokeRect(1, 1, w - 2, h - 2);

  const eyebrow = (text: string) => {
    context.fillStyle = palette.fgSecondary;
    context.font = `600 20px ${mono}`;
    context.letterSpacing = "3px";
    context.textBaseline = "top";
    context.fillText(text.toUpperCase(), pad, pad);
    context.letterSpacing = "0px";
  };

  switch (kind) {
    case "mark":
      drawMark(context, w * 0.16, h * 0.33, w * 0.68, palette.fg);
      break;

    case "colour": {
      eyebrow("Palette");
      const stripY = h * 0.48;
      const stripH = h * 0.32;
      const each = (w - pad * 2) / palette.swatches.length;
      palette.swatches.forEach((tone, index) => {
        context.fillStyle = tone;
        context.fillRect(pad + each * index, stripY, each, stripH);
      });
      context.strokeStyle = palette.border;
      context.strokeRect(pad, stripY, w - pad * 2, stripH);
      break;
    }

    case "type":
      eyebrow("Specimen");
      context.fillStyle = palette.fg;
      context.font = `900 78px ${sans}`;
      context.textBaseline = "alphabetic";
      context.fillText("Loomie", pad, h * 0.66);
      context.fillStyle = palette.fgSecondary;
      context.font = `400 20px ${mono}`;
      context.letterSpacing = "2px";
      context.fillText("Aa Bb Cc 0123", pad, h - pad);
      context.letterSpacing = "0px";
      break;

    case "packaging": {
      context.strokeStyle = palette.border;
      context.strokeRect(pad, pad, w - pad * 2, h - pad * 2);
      context.fillStyle = palette.fgSecondary;
      context.font = `600 20px ${mono}`;
      context.letterSpacing = "3px";
      context.textBaseline = "top";
      context.fillText("LABEL", pad * 1.7, pad * 1.7);
      context.letterSpacing = "0px";

      context.fillStyle = palette.fg;
      context.font = `900 40px ${sans}`;
      context.textBaseline = "alphabetic";
      context.fillText("LOOMIE", pad * 1.7, h - pad * 2);

      // A barcode, not a real one: no scannable code invented for decoration.
      const bars = [3, 5, 2, 5, 3, 4, 2, 5, 3];
      const barBase = h - pad * 2;
      bars.forEach((height, index) => {
        context.fillRect(w - pad * 1.7 - (bars.length - index) * 10, barBase - height * 11, 5, height * 11);
      });
      break;
    }

    case "social": {
      const box = h - pad * 2;
      const left = (w - box) / 2;
      context.strokeStyle = palette.border;
      context.strokeRect(left, pad, box, box);
      drawMark(context, left + box * 0.24, pad + box * 0.34, box * 0.52, palette.fg);
      context.fillStyle = palette.fgSecondary;
      context.font = `600 18px ${mono}`;
      context.letterSpacing = "3px";
      context.textAlign = "center";
      context.textBaseline = "top";
      context.fillText("POST 01", w / 2, pad + box * 0.66);
      context.letterSpacing = "0px";
      context.textAlign = "left";
      break;
    }

    case "interface": {
      let y = pad;
      for (let dot = 0; dot < 3; dot += 1) {
        context.fillStyle = palette.fgSecondary;
        context.fillRect(pad + dot * 18, y, 9, 9);
      }
      y += 44;
      context.fillStyle = palette.fg;
      context.fillRect(pad, y, (w - pad * 2) * 0.72, 22);
      y += 46;
      context.fillStyle = palette.border;
      context.fillRect(pad, y, w - pad * 2, 12);
      y += 28;
      context.fillRect(pad, y, (w - pad * 2) * 0.84, 12);
      context.fillStyle = palette.fg;
      context.fillRect(pad, h - pad - 46, (w - pad * 2) * 0.46, 46);
      break;
    }
  }
}

export function drawPlateArt(kind: PlateKind, theme: "dark" | "light") {
  const canvas = surface(PLATE_WIDTH, PLATE_HEIGHT);
  const context = canvas.getContext("2d");
  if (context) drawArt(context, kind, PALETTES[theme]);
  return canvas;
}

/**
 * One texture, two bands. The exploded label sits in the top half and the
 * service in the bottom, and the plate swaps between them by moving the UV
 * offset rather than by carrying a second texture.
 */
export function drawPlateCaption(
  label: string,
  service: string,
  theme: "dark" | "light"
) {
  const canvas = surface(CAPTION_WIDTH, CAPTION_HEIGHT);
  const context = canvas.getContext("2d");
  if (!context) return canvas;

  const palette = PALETTES[theme];
  const { mono } = families();

  context.textBaseline = "middle";
  context.letterSpacing = "4px";

  context.fillStyle = palette.fgSecondary;
  context.font = `400 26px ${mono}`;
  context.fillText(label.toUpperCase(), 4, CAPTION_BAND * 0.5);

  context.fillStyle = palette.fg;
  context.font = `700 26px ${mono}`;
  context.fillText(service.toUpperCase(), 4, CAPTION_BAND * 1.5);

  context.letterSpacing = "0px";
  return canvas;
}
