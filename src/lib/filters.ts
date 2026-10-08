/**
 * 필터 시스템 — 민화 외에 사진 보정/감성 필터들을 한 레지스트리로 제공한다.
 * toneAdjust는 실제 보정 레시피 기반 단일 패스 파이프라인:
 * 온도 → 노출 → 대비 → 스플릿 토닝 → 채도 → 페이드(블랙 리프트) → 그레인 → 비네트
 */
import { minhwaize } from './minhwa.ts';

export interface Tone {
  /** 노출 -1..1 (+ 밝게) */
  exposure?: number;
  /** 대비 -1..1 */
  contrast?: number;
  /** 채도 -1..1 */
  saturation?: number;
  /** 색온도 -1..1 (+ 따뜻하게, - 차갑게) */
  temperature?: number;
  /** 블랙 리프트 0..1 — 필름식 페이드 */
  fade?: number;
  /** 비네트 0..1 */
  vignette?: number;
  /** 그레인 0..1 */
  grain?: number;
  /** 어두운 영역에 섞는 색 (스플릿 토닝) */
  shadowTint?: [number, number, number];
  /** 밝은 영역에 섞는 색 — 할레이션 효과에도 사용 */
  highTint?: [number, number, number];
}

export interface FilterDef {
  id: string;
  name: string;
  desc: string;
  tone?: Tone;
}

const clamp = (v: number) => Math.min(255, Math.max(0, v));

/** 톤 보정 파이프라인 — 단일 패스 */
export function toneAdjust(src: ImageData, p: Tone): ImageData {
  const { width: w, height: h, data: s } = src;
  const out = new ImageData(w, h);
  const d = out.data;
  const temp = (p.temperature ?? 0) * 32;
  const expo = (p.exposure ?? 0) * 55;
  const cont = 1 + (p.contrast ?? 0) * 0.9;
  const sIn = p.saturation ?? 0;
  const sat = Math.max(0, 1 + (sIn > 0 ? sIn * 1.1 : sIn)); // -1 → 완전 무채색
  const lift = (p.fade ?? 0) * 42;
  const vg = p.vignette ?? 0;
  const gr = (p.grain ?? 0) * 55;
  const shT = p.shadowTint;
  const hiT = p.highTint;
  const cx = w / 2;
  const cy = h / 2;
  const maxDist = Math.sqrt(cx * cx + cy * cy);

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      let r = s[i];
      let g = s[i + 1];
      let b = s[i + 2];

      // 색온도
      r += temp;
      b -= temp;
      // 노출(가산)
      r += expo;
      g += expo;
      b += expo;
      // 대비
      r = (r - 128) * cont + 128;
      g = (g - 128) * cont + 128;
      b = (b - 128) * cont + 128;

      // 스플릿 토닝 — 명도 가중 블렌드
      const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
      if (shT) {
        const wsh = Math.pow(1 - lum, 2) * 0.38;
        r += (shT[0] - r) * wsh;
        g += (shT[1] - g) * wsh;
        b += (shT[2] - b) * wsh;
      }
      if (hiT) {
        const whi = Math.pow(lum, 2) * 0.38;
        r += (hiT[0] - r) * whi;
        g += (hiT[1] - g) * whi;
        b += (hiT[2] - b) * whi;
      }

      // 채도
      const m = (r + g + b) / 3;
      r = m + (r - m) * sat;
      g = m + (g - m) * sat;
      b = m + (b - m) * sat;

      // 페이드 — 블랙을 회색으로 들어올림
      r = lift + (r * (255 - lift)) / 255;
      g = lift + (g * (255 - lift)) / 255;
      b = lift + (b * (255 - lift)) / 255;

      // 그레인 — 어두운 곳에 더 강하게
      if (gr > 0) {
        const n = (Math.random() - 0.5) * gr * (0.6 + (1 - lum) * 0.8);
        r += n;
        g += n;
        b += n;
      }

      // 비네트
      if (vg > 0) {
        const dx = (x - cx) / maxDist;
        const dy = (y - cy) / maxDist;
        const f = 1 - (dx * dx + dy * dy) * vg * 0.7;
        r *= f;
        g *= f;
        b *= f;
      }

      d[i] = clamp(r);
      d[i + 1] = clamp(g);
      d[i + 2] = clamp(b);
      d[i + 3] = 255;
    }
  }
  return out;
}

export const FILTERS: FilterDef[] = [
  { id: 'minhwa', name: '민화', desc: '먹선 + 한지 색감' },
  {
    id: 'japan',
    name: '일본 감성',
    desc: '맑고 화사한 하이키',
    tone: { exposure: 0.38, contrast: -0.34, temperature: -0.1, saturation: 0.08, fade: 0.32, shadowTint: [170, 205, 195], highTint: [255, 246, 228] },
  },
  {
    id: 'pastel',
    name: '화사한 보정',
    desc: '피부 화사하게 잘 나오는 톤',
    tone: { exposure: 0.3, contrast: -0.18, temperature: 0.14, saturation: 0.16, fade: 0.16, highTint: [255, 228, 220] },
  },
  {
    id: 'film',
    name: '코닥 필름',
    desc: '따뜻한 아날로그',
    tone: { temperature: 0.3, contrast: 0.1, saturation: -0.08, fade: 0.44, grain: 0.34, vignette: 0.28, shadowTint: [92, 70, 50], highTint: [255, 218, 168] },
  },
  {
    id: 'fuji',
    name: '후지 청량',
    desc: '청록 파스텔 필름',
    tone: { temperature: -0.24, exposure: 0.14, contrast: -0.16, saturation: -0.14, fade: 0.3, grain: 0.16, shadowTint: [160, 198, 184], highTint: [240, 250, 246] },
  },
  {
    id: 'cinema',
    name: '시네마틱',
    desc: '틸 & 오렌지 영화 톤',
    tone: { contrast: 0.3, saturation: 0.1, temperature: 0.05, vignette: 0.34, shadowTint: [28, 78, 90], highTint: [255, 172, 92] },
  },
  {
    id: 'night',
    name: '도시 네온',
    desc: '야경 네온 감성',
    tone: { contrast: 0.34, saturation: 0.3, temperature: -0.2, vignette: 0.4, shadowTint: [24, 44, 110], highTint: [232, 82, 142] },
  },
  {
    id: 'country',
    name: '시골 여름',
    desc: '골든아워 전원',
    tone: { temperature: 0.34, saturation: 0.2, exposure: 0.1, contrast: 0.06, vignette: 0.24, grain: 0.18, highTint: [255, 210, 130] },
  },
  {
    id: 'mono',
    name: '흑백',
    desc: '클래식 모노',
    tone: { saturation: -1, contrast: 0.3, grain: 0.28, fade: 0.1 },
  },
];

export function applyFilter(src: ImageData, id: string): ImageData {
  const def = FILTERS.find((f) => f.id === id) ?? FILTERS[0];
  if (def.id === 'minhwa') return minhwaize(src);
  return toneAdjust(src, def.tone ?? {});
}
