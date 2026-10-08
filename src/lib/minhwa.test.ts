import { describe, expect, it } from 'vitest';
import { minhwaize } from './minhwa.ts';

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

describe('minhwaize', () => {
  it('출력 크기와 알파를 유지한다', () => {
    const out = minhwaize(flatImage(32, 24, [120, 200, 80]));
    expect(out.width).toBe(32);
    expect(out.height).toBe(24);
    expect(out.data[3]).toBe(255);
  });

  it('단색은 먹선 없이 포스터라이즈된다', () => {
    const out = minhwaize(flatImage(16, 16, [128, 128, 128]));
    // 내부 픽셀들이 서로 같아야 함(윤곽선 없음)
    const mid = (8 * 16 + 8) * 4;
    const mid2 = (9 * 16 + 9) * 4;
    expect(out.data[mid]).toBe(out.data[mid2]);
    // 먹선이 그어지지 않음(검정으로 안 가라앉음)
    expect(out.data[mid]).toBeGreaterThan(80);
  });

  it('명암 경계에 먹선이 생긴다', () => {
    const img = flatImage(16, 16, [20, 20, 20]);
    // 오른쪽 절반을 밝게 → 중앙 경계
    for (let y = 0; y < 16; y++) {
      for (let x = 8; x < 16; x++) {
        const p = (y * 16 + x) * 4;
        img.data[p] = img.data[p + 1] = img.data[p + 2] = 235;
      }
    }
    const out = minhwaize(img);
    // 경계 근처(x=7~8)에 어두운 픽셀이 존재
    let dark = 0;
    for (let y = 1; y < 15; y++) {
      for (const x of [7, 8]) {
        const p = (y * 16 + x) * 4;
        if (out.data[p] < 60) dark++;
      }
    }
    expect(dark).toBeGreaterThan(10);
  });
});
