/**
 * Builds public/vedraya/frames/frame-XXXX.webp from story keyframes.
 * Each keyframe is held for HOLD frames so scroll scrubbing feels weighted.
 *
 * Usage: node scripts/build-sequence-frames.mjs
 */
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const assets = path.join(root, "assets", "sequence");
const outDir = path.join(root, "public", "vedraya", "frames");

const KEYFRAMES = [
  "vedraya-seq-start.png",
  "vedraya-seq-20.png",
  "vedraya-seq-40.png",
  "vedraya-seq-60.png",
  "vedraya-seq-80.png",
  "vedraya-seq-end.png",
  "vedraya-seq-100.png",
];

const HOLD = 12; // 7 * 12 = 84 frames
const TARGET_WIDTH = 1920;

async function main() {
  fs.mkdirSync(outDir, { recursive: true });
  for (const f of fs.readdirSync(outDir)) {
    if (f.startsWith("frame-")) fs.unlinkSync(path.join(outDir, f));
  }

  let index = 1;
  for (const name of KEYFRAMES) {
    const src = path.join(assets, name);
    if (!fs.existsSync(src)) {
      console.error("Missing keyframe:", src);
      process.exit(1);
    }

    const buf = await sharp(src)
      .resize({ width: TARGET_WIDTH, withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer();

    for (let h = 0; h < HOLD; h += 1) {
      const file = `frame-${String(index).padStart(4, "0")}.webp`;
      fs.writeFileSync(path.join(outDir, file), buf);
      index += 1;
    }
    console.log("held", name, "→", HOLD, "frames");
  }

  console.log(`Wrote ${index - 1} frames to ${outDir}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
