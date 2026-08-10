import sharp from "sharp";
import { readdir, stat, rename, unlink } from "node:fs/promises";
import path from "node:path";

const DIR = path.join(process.cwd(), "public", "images");
const MAX_WIDTH = 1600;
const QUALITY = 80;

const kb = (bytes) => `${(bytes / 1024).toFixed(0)} KB`;

const files = (await readdir(DIR)).filter((f) => /\.jpe?g$/i.test(f));

let before = 0;
let after = 0;

for (const file of files) {
  const input = path.join(DIR, file);
  const temp = path.join(DIR, `tmp-${file}`);

  const originalSize = (await stat(input)).size;

  const image = sharp(input);
  const meta = await image.metadata();
  const width = meta.width > MAX_WIDTH ? MAX_WIDTH : meta.width;

  await image
    .resize({ width, withoutEnlargement: true })
    .jpeg({ quality: QUALITY, mozjpeg: true, progressive: true })
    .toFile(temp);

  const newSize = (await stat(temp)).size;

  if (newSize < originalSize) {
    await unlink(input);
    await rename(temp, input);
    console.log(`${file}: ${kb(originalSize)} -> ${kb(newSize)} (${meta.width}px -> ${width}px)`);
    before += originalSize;
    after += newSize;
  } else {
    await unlink(temp);
    console.log(`${file}: kept original (${kb(originalSize)})`);
    before += originalSize;
    after += originalSize;
  }
}

console.log(`\nTotal: ${kb(before)} -> ${kb(after)}`);
