/**
 * 민화 필터 — 사진을 민화풍으로 변환한다.
 * 1) 명도 추출 → Sobel로 윤곽선(먹선) 감지
 * 2) 색상 포스터라이즈(채널별 단계 압축) + 채도 부스트 + 따뜻한 한지 틴트
 * 3) 먹선 위치를 잉크색으로 덮어 씀 — 목판화/민화 질감
 */

export interface MinhwaOptions {
  /** 포스터라이즈 단계 수 (기본 5) */
  levels?: number;
  /** 먹선 감지 임계값 0~255 (기본 42) */
  edgeThreshold?: number;
  /** 먹선 강도 0~1 (기본 0.75) */
  inkStrength?: number;
}

function luma(r: number, g: number, b: number) {
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

/** src ImageData → 민화풍 ImageData (새 객체 반환) */
export function minhwaize(src: ImageData, opts: MinhwaOptions = {}): ImageData {
  const { levels = 5, edgeThreshold = 42, inkStrength = 0.75 } = opts;
  const { width: w, height: h, data: s } = src;
  const out = new ImageData(w, h);
  const d = out.data;

  // 1) 명도 필드
  const lum = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) {
    lum[i] = luma(s[i * 4], s[i * 4 + 1], s[i * 4 + 2]);
  }

  const stepQ = 255 / (levels - 1);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      const p = i * 4;

      // 2) 포스터라이즈 + 채도 강조 + 한지 틴트
      let r = Math.round(s[p] / stepQ) * stepQ;
      let g = Math.round(s[p + 1] / stepQ) * stepQ;
      let b = Math.round(s[p + 2] / stepQ) * stepQ;
      const m = (r + g + b) / 3;
      const sat = 1.28;
      r = m + (r - m) * sat;
      g = m + (g - m) * sat;
      b = m + (b - m) * sat;
      // 한지 틴트: 따뜻하게, 전체를 살짝 종이색으로
      r = r * 1.05 + 245 * 0.045;
      g = g * 1.0 + 238 * 0.045;
      b = b * 0.9 + 221 * 0.045;

      // 3) Sobel 먹선 — 경계 제외
      let edge = 0;
      if (x > 0 && y > 0 && x < w - 1 && y < h - 1) {
        const gx =
          -lum[i - w - 1] - 2 * lum[i - 1] - lum[i + w - 1] +
          lum[i - w + 1] + 2 * lum[i + 1] + lum[i + w + 1];
        const gy =
          -lum[i - w - 1] - 2 * lum[i - w] - lum[i - w + 1] +
          lum[i + w - 1] + 2 * lum[i + w] + lum[i + w + 1];
        edge = Math.sqrt(gx * gx + gy * gy);
      }
      if (edge > edgeThreshold) {
        const k = Math.min(1, (edge / 255) * 2) * inkStrength;
        r = r * (1 - k) + 22 * k;
        g = g * (1 - k) + 21 * k;
        b = b * (1 - k) + 26 * k;
      }

      d[p] = Math.min(255, Math.max(0, r));
      d[p + 1] = Math.min(255, Math.max(0, g));
      d[p + 2] = Math.min(255, Math.max(0, b));
      d[p + 3] = 255;
    }
  }
  return out;
}

/** 이미지(파일/비디오 프레임)를 cover 크롭해 작업 해상도 ImageData로 */
export function toImageData(
  source: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement,
  sw: number,
  sh: number,
  outW = 480,
  outH = 360,
): ImageData {
  const c = document.createElement('canvas');
  c.width = outW;
  c.height = outH;
  const ctx = c.getContext('2d')!;
  // cover 크롭: 소스 중앙에서 outW:outH 비율 영역
  const srcRatio = sw / sh;
  const dstRatio = outW / outH;
  let cw = sw;
  let ch = sh;
  if (srcRatio > dstRatio) cw = sh * dstRatio;
  else ch = sw / dstRatio;
  ctx.drawImage(source, (sw - cw) / 2, (sh - ch) / 2, cw, ch, 0, 0, outW, outH);
  return ctx.getImageData(0, 0, outW, outH);
}
