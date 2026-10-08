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
const CENTER = 'The center is one large uninterrupted EMPTY rectangle of plain warm-cream hanji paper filling about 80% of the image — absolutely no motifs, objects, ornaments, shadows or text inside the center area.';

const JOBS: Job[] = [
  {
    file: 'public/assets/frames/horangi.webp',
    aspect: '9:21',
    prompt: `Korean minhwa folk painting photo-strip frame, tall vertical format: a thin decorative border band hugging the outermost edges only — tiger and magpie folk motifs inside the top border band and bottom border band only. ${CENTER} Flat mineral pigments on aged paper, traditional Korean folk art.`,
  },
  {
    file: 'public/assets/frames/moran.webp',
    aspect: '9:21',
    prompt: `Korean minhwa folk painting photo-strip frame, tall vertical format: a thin decorative border band hugging the outermost edges only — lush peony flowers and butterflies inside the top and bottom border bands only, thin vine lines along the side bands. ${CENTER} Vivid mineral reds and greens, traditional Korean folk art.`,
  },
  {
    file: 'public/assets/frames/hak.webp',
    aspect: '9:21',
    prompt: `Tall vertical Korean folk art border frame: thin decorative band along the outermost edges only, painted with herons, pine branches and drifting clouds in the top and bottom bands. ${CENTER} Ink and light mineral colors on warm aged paper.`,
  },
  {
    file: 'public/assets/frames/dancheong.webp',
    aspect: '9:21',
    prompt: `Korean dancheong temple pattern photo-strip frame, tall vertical format: a geometric lotus-and-cloud border band hugging the outermost edges only, in teal, vermilion, ochre and indigo. ${CENTER} Flat traditional Korean decorative pattern.`,
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
