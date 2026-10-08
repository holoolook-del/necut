import { describe, expect, it } from 'vitest';
import { applyFilter, FILTERS, toneAdjust } from './filters.ts';

// jsdom에는 ImageData 생성자가 없다 — 최소 폴리필
if (typeof globalThis.ImageData === 'undefined') {
  class ImageDataShim {
    readonly width: number;
    readonly height: number;
    readonly data: Uint8ClampedArray;
    constructor(w: number, h: number) {
      this.width = w;
      this.height = h;
      this.data = new Uint8ClampedArray(w * h * 4);
    }
  }
  globalThis.ImageData = ImageDataShim as unknown as typeof ImageData;
}

function flatImage(w: number, h: number, rgb: [number, number, number]): ImageData {
  const img = new ImageData(w, h);
  for (let i = 0; i < w * h; i++) {
    img.data[i * 4] = rgb[0];
    img.data[i * 4 + 1] = rgb[1];
    img.data[i * 4 + 2] = rgb[2];
    img.data[i * 4 + 3] = 255;
  }
  return img;
}

function meanLum(img: ImageData): number {
  let sum = 0;
  for (let i = 0; i < img.width * img.height; i++) {
    sum += (img.data[i * 4] + img.data[i * 4 + 1] + img.data[i * 4 + 2]) / 3;
  }
  return sum / (img.width * img.height);
}

describe('toneAdjust', () => {
  it('노출을 올리면 전체가 밝아진다', () => {
    const src = flatImage(16, 16, [100, 100, 100]);
    const out = toneAdjust(src, { exposure: 0.5 });
    expect(meanLum(out)).toBeGreaterThan(meanLum(src));
  });

  it('흑백 필터는 R=G=B가 된다', () => {
    const out = toneAdjust(flatImage(8, 8, [200, 60, 80]), { saturation: -1, contrast: 0.3 });
    expect(out.data[0]).toBe(out.data[1]);
    expect(out.data[1]).toBe(out.data[2]);
  });

  it('비네트는 가장자리를 중앙보다 어둡게 한다', () => {
    const src = flatImage(64, 64, [160, 160, 160]);
    const out = toneAdjust(src, { vignette: 1 });
    const center = (32 * 64 + 32) * 4;
    const corner = 0;
    expect(out.data[corner]).toBeLessThan(out.data[center]);
  });
});

describe('applyFilter', () => {
  it('모든 필터가 ImageData를 반환한다', () => {
    const src = flatImage(16, 16, [120, 140, 90]);
    for (const f of FILTERS) {
      const out = applyFilter(src, f.id);
      expect(out.width).toBe(16);
      expect(out.data[3]).toBe(255);
    }
  });
});
