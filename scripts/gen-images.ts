/** Replicate로 프레임/아이콘 생성 — 개발 시 1회 실행, 결과물은 public/assets에 저장 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

try {
  const env = readFileSync('.env', 'utf8');
  const m = env.match(/REPLICATE_API_TOKEN=(\S+)/);
  if (m && !process.env.REPLICATE_API_TOKEN) process.env.REPLICATE_API_TOKEN = m[1];
} catch {
  // .env가 없으면 환경 변수에서만 읽는다
}
const token = process.env.REPLICATE_API_TOKEN;
if (!token) {
  console.error('REPLICATE_API_TOKEN 없음 (.env 확인)');
  process.exit(1);
}

interface Job {
  file: string;
  prompt: string;
  aspect: string;
}
const JOBS: Job[] = [
  {
    file: 'public/assets/frames/horangi.webp',
    aspect: '9:21',
    prompt:
      'Korean minhwa folk painting photo frame, tall vertical format: ornate decorative border ONLY along the edges — tiger and magpie folk motifs at top and bottom corners, pine branches on sides. The large center area is completely EMPTY plain aged hanji paper texture, warm cream color. Traditional Korean painting style, flat mineral pigments, no text, no letters.',
  },
  {
    file: 'public/assets/frames/moran.webp',
    aspect: '9:21',
    prompt:
      'Korean minhwa folk painting photo frame, tall vertical format: decorative border ONLY along the edges — lush peony flowers (moran) blooming at top and bottom edges, butterflies on the sides. The large center area is completely EMPTY plain aged hanji paper, warm cream. Traditional Korean folk art style, vivid mineral reds and greens, no text, no letters.',
  },
  {
    file: 'public/assets/frames/hak.webp',
    aspect: '9:21',
    prompt:
      'Korean minhwa folk painting photo frame, tall vertical format: decorative border ONLY along the edges — crane birds and pine tree motifs at top and bottom, clouds along the sides. The large center area is completely EMPTY plain aged hanji paper, warm cream. Traditional Korean sipjangsaeng folk art, muted mineral pigments, no text, no letters.',
  },
  {
    file: 'public/assets/frames/dancheong.webp',
    aspect: '9:21',
    prompt:
      'Korean dancheong temple pattern photo frame, tall vertical format: geometric lotus and cloud pattern border ONLY along the edges in teal, vermilion, ochre, indigo. The large center area is completely EMPTY plain aged hanji paper, warm cream. Flat traditional Korean decorative style, no text, no letters.',
  },
  {
    file: 'public/assets/icon.png',
    aspect: '1:1',
    prompt:
      'App icon: a stack of four small photo frames arranged vertically like a Korean photo strip, minhwa folk painting style, tiger face motif on the top frame, vermilion red and ink on warm cream paper background, flat traditional Korean folk art, centered composition, no text.',
  },
];

async function run(job: Job) {
  if (existsSync(job.file)) {
    console.log(`skip ${job.file}`);
    return;
  }
  console.log(`gen ${job.file}…`);
  const res = await fetch('https://api.replicate.com/v1/models/black-forest-labs/flux-schnell/predictions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      input: { prompt: job.prompt, aspect_ratio: job.aspect, output_format: 'webp', num_outputs: 1 },
    }),
  });
  const pred = (await res.json()) as { id?: string; urls?: { get: string }; error?: string };
  if (!pred.id || !pred.urls) {
    console.error('생성 실패:', pred.error ?? res.status);
    return;
  }
  let out: { status: string; output?: string[] } | null = null;
  for (let i = 0; i < 60; i++) {
    await new Promise((r) => setTimeout(r, 1500));
    const g = await fetch(pred.urls.get, { headers: { Authorization: `Bearer ${token}` } });
    out = (await g.json()) as { status: string; output?: string[] };
    if (out.status === 'succeeded' || out.status === 'failed' || out.status === 'canceled') break;
  }
  if (!out || out.status !== 'succeeded' || !out.output?.length) {
    console.error('대기 실패:', out?.status);
    return;
  }
  const img = await fetch(out.output[0]);
  writeFileSync(job.file, Buffer.from(await img.arrayBuffer()));
  console.log(`saved ${job.file}`);
}

for (const job of JOBS) await run(job);
console.log('done');
