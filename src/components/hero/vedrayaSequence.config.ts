/**
 * VEDRAYA cinematic scroll sequence — floating product stage.
 *
 * Morph video → square WebP with tight corner flood-fill alpha so the
 * research core / network floats on the dark hero (no white card).
 */
export const SEQUENCE_CONFIG = {
  FRAME_DIRECTORY: "/vedraya/frames-alpha",
  FRAME_PREFIX: "frame-",
  FRAME_EXT: "webp",
  FRAME_COUNT: 180,
  SCROLL_HEIGHT: 400,
  WEBP_QUALITY: 88,
  MAX_DPR: 2,
  /** Real flood-fill alpha on morph frames — circular matte off */
  USE_SOFT_PRODUCT_MATTE: false,
  MOBILE_FRAME_STEP: 2,
  DESKTOP_FRAME_STEP: 1,
  MOBILE_BREAKPOINT: 768,
  HERO_MAX_W: 1480,
  /** Left copy reserve — product dominates the right */
  STAGE_LEFT_FRAC_START: 0.3,
  STAGE_LEFT_FRAC_END: 0.02,
  STAGE_SETTLE_START: 0.14,
  STAGE_SETTLE_END: 0.52,
  STAGE_FIT_START: 1.28,
  STAGE_FIT_END: 1.38,
  STAGE_OVERFLOW_X: 0.08,
  TEXT: {
    headlineFullUntil: 0.16,
    typographyLiftEnd: 0.4,
    canvasDominantAt: 0.56,
    expandedAt: 0.8,
  },
  COMMAND_HANDOFF_START: 0.88,
} as const;

export function frameUrl(index1Based: number): string {
  const n = String(index1Based).padStart(4, "0");
  return `${SEQUENCE_CONFIG.FRAME_DIRECTORY}/${SEQUENCE_CONFIG.FRAME_PREFIX}${n}.${SEQUENCE_CONFIG.FRAME_EXT}`;
}

function easeSmooth(t: number) {
  return t * t * (3 - 2 * t);
}

function lerpRange(
  progress: number,
  start: number,
  end: number,
  a: number,
  b: number,
) {
  if (progress <= a) return start;
  if (progress >= b) return end;
  const t = easeSmooth((progress - a) / (b - a));
  return start + (end - start) * t;
}

export type ProductStage = {
  x: number;
  y: number;
  w: number;
  h: number;
  fit: number;
};

/** Right-side floating stage — large product, soft edge bleed allowed */
export function resolveProductStage(
  progress: number,
  viewportW: number,
  viewportH: number,
  mobile: boolean,
): ProductStage {
  const nav = 64;
  const fit = lerpRange(
    progress,
    SEQUENCE_CONFIG.STAGE_FIT_START,
    SEQUENCE_CONFIG.STAGE_FIT_END,
    SEQUENCE_CONFIG.STAGE_SETTLE_START,
    SEQUENCE_CONFIG.STAGE_SETTLE_END,
  );

  if (mobile) {
    const pad = Math.max(16, viewportW * 0.04);
    return {
      x: pad,
      y: viewportH * 0.48,
      w: viewportW - pad * 2,
      h: viewportH * 0.5,
      fit: Math.min(fit, 1.05),
    };
  }

  const leftFrac = lerpRange(
    progress,
    SEQUENCE_CONFIG.STAGE_LEFT_FRAC_START,
    SEQUENCE_CONFIG.STAGE_LEFT_FRAC_END,
    SEQUENCE_CONFIG.STAGE_SETTLE_START,
    SEQUENCE_CONFIG.STAGE_SETTLE_END,
  );

  const contentW = Math.min(viewportW, SEQUENCE_CONFIG.HERO_MAX_W);
  const contentLeft = (viewportW - contentW) / 2;
  const overflow = viewportW * SEQUENCE_CONFIG.STAGE_OVERFLOW_X;

  const stageX = contentLeft + contentW * leftFrac;
  const stageY = nav + viewportH * 0.04;
  const stageW = viewportW - stageX + overflow;
  const stageH = viewportH - stageY - viewportH * 0.04;

  return {
    x: stageX,
    y: stageY,
    w: Math.max(280, stageW),
    h: Math.max(280, stageH),
    fit,
  };
}
