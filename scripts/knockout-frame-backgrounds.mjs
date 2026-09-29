/**
 * Remove white/near-white backgrounds via edge flood-fill + soft matte.
 * Preserves ceramic body, cyan accents, and metallic highlights that are
 * not connected to the backdrop.
 *
 * Usage: npm run frames:alpha
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const SRC = path.join(ROOT, "public", "vedraya", "frames");
const DEST = path.join(ROOT, "public", "vedraya", "frames-alpha");

const TOLERANCE = 28;
const SOFT_BAND = 18;

function colorDist(r, g, b, sr, sg, sb) {
  return Math.max(Math.abs(r - sr), Math.abs(g - sg), Math.abs(b - sb));
}

function sampleCorner(data, w, h, cx, cy, size = 8) {
  let r = 0;
  let g = 0;
  let b = 0;
  let n = 0;
  for (let y = cy; y < cy + size && y < h; y += 1) {
    for (let x = cx; x < cx + size && x < w; x += 1) {
      const i = (y * w + x) * 4;
      r += data[i];
      g += data[i + 1];
      b += data[i + 2];
      n += 1;
    }
  }
  return [Math.round(r / n), Math.round(g / n), Math.round(b / n)];
}

async function processOne(file, outFile) {
  const { data, info } = await sharp(path.join(SRC, file))
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const w = info.width;
  const h = info.height;
  const px = data;

  const seeds = [
    sampleCorner(px, w, h, 0, 0),
    sampleCorner(px, w, h, w - 8, 0),
    sampleCorner(px, w, h, 0, h - 8),
    sampleCorner(px, w, h, w - 8, h - 8),
  ];

  const visited = new Uint8Array(w * h);
  const queue = new Int32Array(w * h + 8);
  let qh = 0;
  let qt = 0;

  const tryPush = (x, y) => {
    if (x < 0 || y < 0 || x >= w || y >= h) return;
    const idx = y * w + x;
    if (visited[idx]) return;
    const i = idx * 4;
    const r = px[i];
    const g = px[i + 1];
    const b = px[i + 2];
    let ok = false;
    for (const [sr, sg, sb] of seeds) {
      if (colorDist(r, g, b, sr, sg, sb) <= TOLERANCE + SOFT_BAND) {
        ok = true;
        break;
      }
    }
    if (!ok) return;
    visited[idx] = 1;
    queue[qt++] = idx;
  };

  for (let x = 0; x < w; x += 2) {
    tryPush(x, 0);
    tryPush(x, h - 1);
  }
  for (let y = 0; y < h; y += 2) {
    tryPush(0, y);
    tryPush(w - 1, y);
  }

  while (qh < qt) {
    const idx = queue[qh++];
    const x = idx % w;
    const y = (idx / w) | 0;
    tryPush(x + 1, y);
    tryPush(x - 1, y);
    tryPush(x, y + 1);
    tryPush(x, y - 1);
  }

  for (let idx = 0; idx < w * h; idx += 1) {
    if (!visited[idx]) continue;
    const i = idx * 4;
    const r = px[i];
    const g = px[i + 1];
    const b = px[i + 2];
    let dist = Infinity;
    for (const [sr, sg, sb] of seeds) {
      dist = Math.min(dist, colorDist(r, g, b, sr, sg, sb));
    }
    if (dist <= TOLERANCE) {
      px[i + 3] = 0;
    } else {
      const t = (dist - TOLERANCE) / SOFT_BAND;
      px[i + 3] = Math.round(255 * Math.min(1, Math.max(0, t)));
    }
  }

  await sharp(px, {
    raw: { width: w, height: h, channels: 4 },
  })
    .webp({ quality: 90, alphaQuality: 95, effort: 4 })
    .toFile(outFile);
}

async function main() {
  fs.mkdirSync(DEST, { recursive: true });
  const files = fs
    .readdirSync(SRC)
    .filter((f) => f.endsWith(".webp"))
    .sort();

  console.log(`Flood-fill knockout on ${files.length} frames → frames-alpha/`);
  const t0 = Date.now();
  let done = 0;
  const BATCH = 4;

  for (let i = 0; i < files.length; i += BATCH) {
    const slice = files.slice(i, i + BATCH);
    await Promise.all(
      slice.map(async (file) => {
        await processOne(file, path.join(DEST, file));
        done += 1;
        if (done % 20 === 0 || done === files.length) {
          console.log(`  ${done}/${files.length}`);
        }
      }),
    );
  }

  console.log(`Done in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
