/**
 * 앱 아이콘 생성 — 외부 이미지 없이 PNG를 직접 인코딩한다 (node:zlib).
 * 한지 배경 + 먹 방울 + 주홍 도장 낙관.
 * 실행: node scripts/gen-icon.mjs
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

const S = 1024;

// --- CRC32 ---
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

// --- 픽셀 그리기 ---
const px = new Uint8Array(S * S * 4);
const PAPER = [245, 238, 221];
const INKC = [22, 21, 26];
const SEAL = [200, 64, 42];

function setPx(x, y, rgb, a = 1) {
  if (x < 0 || y < 0 || x >= S || y >= S) return;
  const i = (y * S + x) * 4;
  px[i] = px[i] * (1 - a) + rgb[0] * a;
  px[i + 1] = px[i + 1] * (1 - a) + rgb[1] * a;
  px[i + 2] = px[i + 2] * (1 - a) + rgb[2] * a;
  px[i + 3] = 255;
}

// 배경 (둥근 모서리)
for (let y = 0; y < S; y++) {
  for (let x = 0; x < S; x++) {
    setPx(x, y, PAPER);
  }
}

// 먹 방울 — 위로 갸름한 물방울 모양, 가장자리에 살짝 번짐
const cx = S * 0.44;
const cy = S * 0.5;
const R = S * 0.3;
for (let y = 0; y < S; y++) {
  for (let x = 0; x < S; x++) {
    const dx = (x - cx) / R;
    const dy = (y - cy) / R;
    // 위가 좁은 방울: 위쪽 y에서 반경 축소
    const wobble = 0.05 * Math.sin((x + y) * 0.05);
    const d = Math.sqrt(dx * dx + dy * dy * (dy < 0 ? 1.5 : 1)) + wobble;
    if (d < 1) {
      const edge = Math.min(1, (1 - d) * 6); // 가장자리 부드럽게
      setPx(x, y, INKC, edge * 0.96);
    } else if (d < 1.12) {
      setPx(x, y, INKC, (1.12 - d) * 0.22); // 번짐 테두리
    }
  }
}

// 물방울 꼭지 — 위로 뾰족
for (let y = 0; y < S; y++) {
  for (let x = 0; x < S; x++) {
    const dx = (x - cx) / (R * 0.55);
    const dy = (y - (cy - R * 1.15)) / (R * 0.75);
    if (dx * dx + dy * dy < 1) setPx(x, y, INKC, 0.9);
  }
}

// 광택 — 방울 왼쪽 위 하이라이트
for (let y = 0; y < S; y++) {
  for (let x = 0; x < S; x++) {
    const dx = (x - (cx - R * 0.28)) / (R * 0.16);
    const dy = (y - (cy - R * 0.18)) / (R * 0.22);
    const d = dx * dx + dy * dy;
    if (d < 1) setPx(x, y, PAPER, (1 - d) * 0.18);
  }
}

// 도장 낙관 — 우하단 주홍 사각
const sealS = S * 0.14;
const sx = S * 0.72;
const sy = S * 0.7;
for (let y = Math.floor(sy); y < sy + sealS; y++) {
  for (let x = Math.floor(sx); x < sx + sealS; x++) {
    const border =
      x < sx + 6 || x > sx + sealS - 6 || y < sy + 6 || y > sy + sealS - 6;
    setPx(x, y, SEAL, border ? 0.95 : 0.85);
  }
}

// --- PNG 인코딩 ---
const raw = Buffer.alloc(S * (S * 4 + 1));
for (let y = 0; y < S; y++) {
  const rowStart = y * (S * 4 + 1);
  raw[rowStart] = 0; // filter none
  Buffer.from(px.buffer, y * S * 4, S * 4).copy(raw, rowStart + 1);
}
const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(S, 0);
ihdr.writeUInt32BE(S, 4);
ihdr[8] = 8; // bit depth
ihdr[9] = 6; // RGBA
const png = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  chunk('IHDR', ihdr),
  chunk('IDAT', deflateSync(raw, { level: 9 })),
  chunk('IEND', Buffer.alloc(0)),
]);
mkdirSync('public/assets', { recursive: true });
writeFileSync('public/assets/icon.png', png);
console.log(`icon.png 생성 (${(png.length / 1024).toFixed(0)}KB)`);
