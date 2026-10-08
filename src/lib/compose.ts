/**
 * 네컷 스트립 합성 — 생성된 프레임 배경 위에 민화화된 사진 4장을 배치한다.
 * 프레임 아트는 가장자리 장식 + 비어있는 중앙, 사진이 중앙 슬롯을 덮는 구조.
 */

const INK_LINE = 'rgba(22,21,26,0.85)';
const SEAL = '#c8402a';

function load(src: string): Promise<HTMLImageElement> {
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => res(img);
    img.onerror = rej;
    img.src = src;
  });
}

/** ImageData → 임시 캔버스 */
function toCanvas(img: ImageData): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = img.width;
  c.height = img.height;
  c.getContext('2d')!.putImageData(img, 0, 0);
  return c;
}

/** cover 크롭으로 목표 영역에 그리기 */
function drawCover(
  ctx: CanvasRenderingContext2D,
  src: CanvasImageSource,
  sw: number,
  sh: number,
  dx: number,
  dy: number,
  dw: number,
  dh: number,
) {
  const srcRatio = sw / sh;
  const dstRatio = dw / dh;
  let cw = sw;
  let ch = sh;
  if (srcRatio > dstRatio) cw = sh * dstRatio;
  else ch = sw / dstRatio;
  ctx.drawImage(src, (sw - cw) / 2, (sh - ch) / 2, cw, ch, dx, dy, dw, dh);
}

/**
 * 사진 4장(16:9 권장) + 프레임 이미지 → 네컷 스트립 캔버스.
 * 출력은 프레임 원본의 1.6배 크기.
 * 슬롯 크기는 가용 높이에서 자동 산출하고 사진 비율(16:9)에 정확히 맞춘다 —
 * 프레임이 조금 달라져도 사진이 배경을 넘치거나 공백이 생기지 않는다.
 */
export async function compose4cut(shots: ImageData[], frameSrc: string): Promise<HTMLCanvasElement> {
  const frame = await load(frameSrc);
  const scale = 1.6;
  const W = Math.round(frame.width * scale);
  const H = Math.round(frame.height * scale);
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingQuality = 'high';

  ctx.drawImage(frame, 0, 0, W, H);

  // 프레임 장식이 가장자리 밴드에만 있으므로, 안쪽 빈 영역의 대략 여백
  const insetX = W * 0.075;
  const top = H * 0.06;
  const bottom = H * 0.1;
  const gap = H * 0.022;
  const maxSlotW = W - insetX * 2;

  // 가용 높이에서 슬롯 높이를 산출하고 16:9 비율에 맞춰 폭을 정함 — 넘치지 않는 최대 크기
  const availH = H - top - bottom - gap * 3;
  let slotH = availH / 4;
  let slotW = slotH * (16 / 9);
  if (slotW > maxSlotW) {
    slotW = maxSlotW;
    slotH = slotW * (9 / 16);
  }
  const slotX = (W - slotW) / 2;
  const totalH = slotH * 4 + gap * 3;
  const slotY = top + Math.max(0, (availH - totalH) / 2);

  shots.slice(0, 4).forEach((shot, i) => {
    const x = slotX;
    const y = slotY + i * (slotH + gap);
    const c = toCanvas(shot);
    // 한지 여백(안쪽 매트) + 먹 테두리
    ctx.fillStyle = '#f7f1e3';
    ctx.fillRect(x - W * 0.008, y - W * 0.008, slotW + W * 0.016, slotH + W * 0.016);
    drawCover(ctx, c, shot.width, shot.height, x, y, slotW, slotH);
    ctx.strokeStyle = INK_LINE;
    ctx.lineWidth = Math.max(2, W * 0.004);
    ctx.strokeRect(x, y, slotW, slotH);
  });

  // 낙관 — 우하단 주홍 도장
  const seal = W * 0.055;
  const sx = W - insetX - seal;
  const sy = H - bottom * 0.45 - seal / 2;
  ctx.fillStyle = SEAL;
  ctx.fillRect(sx, sy, seal, seal);
  ctx.fillStyle = '#f5eedd';
  ctx.font = `bold ${seal * 0.55}px serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('墨', sx + seal / 2, sy + seal / 2);

  // 하단 캡션
  ctx.fillStyle = 'rgba(74,69,54,0.8)';
  ctx.font = `${W * 0.022}px serif`;
  ctx.fillText(`민화네컷 · ${new Date().toISOString().slice(0, 10)}`, W / 2, H - bottom * 0.42);

  return canvas;
}
