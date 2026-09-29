"""Extract morph MP4 -> square WebP with tight corner flood-fill alpha."""
from __future__ import annotations

import os
import time

import cv2
import numpy as np
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
VIDEO = os.path.join(ROOT, "Product_morph_and_mechanical_unfold_20260929042105.mp4")
OUT = os.path.join(ROOT, "public", "vedraya", "frames")
PREVIEW = os.path.join(ROOT, "tmp_video_check")
TARGET = 180
OUT_SIZE = 1024
# Tight: only studio plate (product whites/metals are farther / blocked by edges)
FLOOD_DIFF = 5
SOFT = 12


def make_alpha(bgr: np.ndarray) -> np.ndarray:
    h, w = bgr.shape[:2]
    mask = np.zeros((h + 2, w + 2), np.uint8)
    img = bgr.copy()
    flags = 4 | cv2.FLOODFILL_MASK_ONLY | (255 << 8)
    lo = (FLOOD_DIFF, FLOOD_DIFF, FLOOD_DIFF)
    up = (FLOOD_DIFF, FLOOD_DIFF, FLOOD_DIFF)
    seeds = [(0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1)]
    for x in range(0, w, 32):
        seeds += [(x, 0), (x, h - 1)]
    for y in range(0, h, 32):
        seeds += [(0, y), (w - 1, y)]
    for x, y in seeds:
        if mask[y + 1, x + 1]:
            continue
        cv2.floodFill(img, mask, (x, y), None, lo, up, flags)

    flooded = mask[1:-1, 1:-1] > 0
    corners = np.concatenate(
        [
            bgr[:10, :10].reshape(-1, 3),
            bgr[:10, -10:].reshape(-1, 3),
            bgr[-10:, :10].reshape(-1, 3),
            bgr[-10:, -10:].reshape(-1, 3),
        ]
    ).astype(np.float32)
    bgc = np.median(corners, axis=0)
    dist = np.max(np.abs(bgr.astype(np.float32) - bgc), axis=2)

    alpha = np.full((h, w), 255, np.uint8)
    # Fully clear only flooded plate
    alpha[flooded] = 0
    # Soft band: near-bg pixels just outside flood (anti-aliased rim)
    near = (~flooded) & (dist < FLOOD_DIFF + SOFT)
    t = np.clip((dist - FLOOD_DIFF) / SOFT, 0, 1)
    alpha = np.where(near, (t * 255).astype(np.uint8), alpha)

    # Kill residual soft studio shadow under device (low-sat gray, not metal detail)
    # Only in lower half, connected-ish to cleared plate via color
    gray = bgr.astype(np.float32).mean(axis=2)
    sat = bgr.astype(np.float32).std(axis=2)
    shadow = (~flooded) & (gray > 140) & (gray < 210) & (sat < 6) & (np.arange(h)[:, None] > h * 0.55)
    # shrink shadow candidate: must be adjacent to already-transparent
    kernel = np.ones((5, 5), np.uint8)
    near_clear = cv2.dilate((alpha == 0).astype(np.uint8), kernel, iterations=2) > 0
    alpha = np.where(shadow & near_clear, np.minimum(alpha, 40), alpha)

    # Feather alpha edge
    a = alpha.astype(np.float32)
    a = cv2.GaussianBlur(a, (0, 0), 1.1)
    return np.clip(a, 0, 255).astype(np.uint8)


def main() -> None:
    os.makedirs(OUT, exist_ok=True)
    os.makedirs(PREVIEW, exist_ok=True)
    cap = cv2.VideoCapture(VIDEO)
    n = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    idxs = [int(round(i * (n - 1) / (TARGET - 1))) for i in range(TARGET)]
    side = min(w, h)
    sx, sy = (w - side) // 2, (h - side) // 2
    print(f"{w}x{h} n={n} -> {TARGET}")

    t0 = time.time()
    for i, fi in enumerate(idxs):
        cap.set(cv2.CAP_PROP_POS_FRAMES, fi)
        ok, frame = cap.read()
        if not ok:
            continue
        sq = cv2.resize(
            frame[sy : sy + side, sx : sx + side],
            (OUT_SIZE, OUT_SIZE),
            interpolation=cv2.INTER_AREA,
        )
        a = make_alpha(sq)
        rgba = cv2.cvtColor(sq, cv2.COLOR_BGR2RGBA)
        rgba[:, :, 3] = a
        Image.fromarray(rgba, "RGBA").save(
            os.path.join(OUT, f"frame-{i + 1:04d}.webp"),
            "WEBP",
            quality=92,
            method=4,
        )
        if (i + 1) % 30 == 0:
            print(f"{i + 1}/{TARGET} {time.time() - t0:.1f}s")

    cap.release()
    print(f"done {time.time() - t0:.1f}s")

    for name in ("frame-0001.webp", "frame-0090.webp", "frame-0180.webp"):
        arr = np.array(Image.open(os.path.join(OUT, name)))
        a = arr[:, :, 3]
        print(
            name,
            "zero",
            round((a == 0).mean() * 100, 1),
            "solid",
            round((a > 250).mean() * 100, 1),
            "centerA",
            int(a[512, 512]),
        )
        bg = np.zeros_like(arr)
        bg[:, :, :3] = 7
        bg[:, :, 3] = 255
        al = a.astype(np.float32)[:, :, None] / 255.0
        comp = (arr.astype(np.float32) * al + bg.astype(np.float32) * (1 - al)).astype(
            np.uint8
        )
        Image.fromarray(comp[:, :, :3]).save(
            os.path.join(PREVIEW, name.replace(".webp", "_float.jpg")),
            quality=92,
        )


if __name__ == "__main__":
    main()
