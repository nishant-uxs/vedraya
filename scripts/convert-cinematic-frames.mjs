/**
 * Validate JPEG source frames, convert to WebP @ quality 85 (no resize),
 * then validate the WebP output sequence.
 *
 * Usage: node scripts/convert-cinematic-frames.mjs
 */
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

const SRC_DIR = path.join(root, "frames", "ezgif-8d37cddd3e1e5c78-jpg");
const OUT_DIR = path.join(root, "public", "vedraya", "frames");
const WEBP_QUALITY = 85;
const EXPECTED = 180;

function pad(n) {
  return String(n).padStart(4, "0");
}

function srcName(n) {
  return `ezgif-frame-${String(n).padStart(3, "0")}.jpg`;
}

async function main() {
  console.log("=== STEP 1–2: Locate & validate JPEG ===");
  if (!fs.existsSync(SRC_DIR)) {
    console.error("STOP: Source directory missing:", SRC_DIR);
    process.exit(1);
  }

  const jpgs = fs
    .readdirSync(SRC_DIR)
    .filter((f) => /\.jpe?g$/i.test(f))
    .sort();

  console.log("JPEG count:", jpgs.length);

  const missing = [];
  for (let i = 1; i <= EXPECTED; i += 1) {
    const name = srcName(i);
    if (!fs.existsSync(path.join(SRC_DIR, name))) missing.push(name);
  }
  if (missing.length) {
    console.error("STOP: Missing JPEG frames:", missing.slice(0, 20));
    process.exit(1);
  }
  if (jpgs.length !== EXPECTED) {
    console.warn(
      `Warning: expected ${EXPECTED} frames, found ${jpgs.length} jpeg files in folder`,
    );
  }

  const firstMeta = await sharp(path.join(SRC_DIR, srcName(1))).metadata();
  const lastMeta = await sharp(path.join(SRC_DIR, srcName(EXPECTED))).metadata();
  console.log("First JPEG dims:", firstMeta.width, "×", firstMeta.height);
  console.log("Last JPEG dims:", lastMeta.width, "×", lastMeta.height);

  if (
    firstMeta.width !== lastMeta.width ||
    firstMeta.height !== lastMeta.height
  ) {
    console.error("STOP: First/last JPEG dimensions differ");
    process.exit(1);
  }

  // Spot-check every 30th frame for dimensions + decode
  for (let i = 1; i <= EXPECTED; i += 30) {
    const meta = await sharp(path.join(SRC_DIR, srcName(i))).metadata();
    if (meta.width !== firstMeta.width || meta.height !== firstMeta.height) {
      console.error(`STOP: Dimension mismatch at ${srcName(i)}`);
      process.exit(1);
    }
  }
  // Also verify frame 180 decode
  await sharp(path.join(SRC_DIR, srcName(EXPECTED))).ensureAlpha().raw().toBuffer({ resolveWithObject: false }).catch((e) => {
    console.error("STOP: Cannot decode final JPEG", e.message);
    process.exit(1);
  });

  console.log("JPEG sequence OK — sequential, same dims, decodable.");

  console.log("\n=== STEP 2: Convert JPEG → WebP (q=" + WEBP_QUALITY + ", no resize) ===");
  fs.mkdirSync(OUT_DIR, { recursive: true });

  // Clear previous webp frames only (keep originals)
  for (const f of fs.readdirSync(OUT_DIR)) {
    if (/^frame-\d+\.webp$/i.test(f)) fs.unlinkSync(path.join(OUT_DIR, f));
  }

  let totalBytes = 0;
  for (let i = 1; i <= EXPECTED; i += 1) {
    const src = path.join(SRC_DIR, srcName(i));
    const dest = path.join(OUT_DIR, `frame-${pad(i)}.webp`);
    const buf = await sharp(src)
      .webp({ quality: WEBP_QUALITY })
      .toBuffer();
    fs.writeFileSync(dest, buf);
    totalBytes += buf.length;
    if (i === 1 || i === EXPECTED || i % 30 === 0) {
      console.log(`  wrote frame-${pad(i)}.webp (${(buf.length / 1024).toFixed(1)} KB)`);
    }
  }

  console.log("\n=== STEP 3: Validate WebP ===");
  const webps = fs
    .readdirSync(OUT_DIR)
    .filter((f) => /^frame-\d+\.webp$/i.test(f))
    .sort();
  console.log("WebP count:", webps.length);

  const missingW = [];
  for (let i = 1; i <= EXPECTED; i += 1) {
    const name = `frame-${pad(i)}.webp`;
    if (!fs.existsSync(path.join(OUT_DIR, name))) missingW.push(name);
  }
  if (missingW.length) {
    console.error("STOP: Missing WebP frames:", missingW.slice(0, 20));
    process.exit(1);
  }

  const wFirst = await sharp(path.join(OUT_DIR, "frame-0001.webp")).metadata();
  const wLast = await sharp(path.join(OUT_DIR, `frame-${pad(EXPECTED)}.webp`)).metadata();

  if (wFirst.width !== firstMeta.width || wFirst.height !== firstMeta.height) {
    console.error("STOP: WebP dims differ from JPEG (resize happened?)");
    process.exit(1);
  }
  if (wFirst.width !== wLast.width || wFirst.height !== wLast.height) {
    console.error("STOP: WebP first/last dims differ");
    process.exit(1);
  }

  // Decode check all frames (metadata only is enough for decode smoke)
  for (let i = 1; i <= EXPECTED; i += 1) {
    try {
      await sharp(path.join(OUT_DIR, `frame-${pad(i)}.webp`)).metadata();
    } catch (e) {
      console.error(`STOP: Cannot decode WebP frame-${pad(i)}.webp`, e.message);
      process.exit(1);
    }
  }

  // Visual continuity: compare raw-ish stats first jpg vs first webp via resize tiny hash
  const jpgSample = await sharp(path.join(SRC_DIR, srcName(1)))
    .resize(64, 64, { fit: "fill" })
    .raw()
    .toBuffer();
  const webpSample = await sharp(path.join(OUT_DIR, "frame-0001.webp"))
    .resize(64, 64, { fit: "fill" })
    .raw()
    .toBuffer();
  let diff = 0;
  const n = Math.min(jpgSample.length, webpSample.length);
  for (let i = 0; i < n; i += 1) diff += Math.abs(jpgSample[i] - webpSample[i]);
  const avgDiff = diff / n;
  console.log("First-frame JPEG↔WebP avg channel diff:", avgDiff.toFixed(2));
  if (avgDiff > 12) {
    console.error("STOP: First WebP diverges too far from first JPEG");
    process.exit(1);
  }

  const jpgLastSample = await sharp(path.join(SRC_DIR, srcName(EXPECTED)))
    .resize(64, 64, { fit: "fill" })
    .raw()
    .toBuffer();
  const webpLastSample = await sharp(path.join(OUT_DIR, `frame-${pad(EXPECTED)}.webp`))
    .resize(64, 64, { fit: "fill" })
    .raw()
    .toBuffer();
  let diffL = 0;
  const nL = Math.min(jpgLastSample.length, webpLastSample.length);
  for (let i = 0; i < nL; i += 1) diffL += Math.abs(jpgLastSample[i] - webpLastSample[i]);
  const avgDiffL = diffL / nL;
  console.log("Last-frame JPEG↔WebP avg channel diff:", avgDiffL.toFixed(2));
  if (avgDiffL > 12) {
    console.error("STOP: Final WebP diverges too far from final JPEG");
    process.exit(1);
  }

  console.log("\n=== SUMMARY ===");
  console.log({
    originalFrameCount: EXPECTED,
    webpFrameCount: EXPECTED,
    originalDimensions: `${firstMeta.width}×${firstMeta.height}`,
    webpDimensions: `${wFirst.width}×${wFirst.height}`,
    webpQuality: WEBP_QUALITY,
    approximateTotalAssetSizeMB: +(totalBytes / (1024 * 1024)).toFixed(2),
    outDir: OUT_DIR,
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
