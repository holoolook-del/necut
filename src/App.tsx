import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toImageData } from './lib/minhwa.ts';
import { applyFilter, FILTERS } from './lib/filters.ts';
import { compose4cut } from './lib/compose.ts';

const BASE = import.meta.env.BASE_URL;
const FRAMES = [
  { id: 'horangi', name: '호랑이와 까치' },
  { id: 'moran', name: '모란 부귀' },
  { id: 'hak', name: '학과 소나무' },
  { id: 'dancheong', name: '단청 문양' },
];
const PHOTO_W = 640;
const PHOTO_H = 360;

type Step = 'shoot' | 'frame' | 'result';

export function App() {
  const [step, setStep] = useState<Step>('shoot');
  const [shots, setShots] = useState<ImageData[]>([]);
  const [filterId, setFilterId] = useState('minhwa');
  const [frameIdx, setFrameIdx] = useState(0);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [camError, setCamError] = useState(false);
  const [busy, setBusy] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // 카메라 시작/정리
  useEffect(() => {
    if (step !== 'shoot') return;
    let cancelled = false;
    navigator.mediaDevices
      ?.getUserMedia({ video: { facingMode: 'user', width: { ideal: 1280 } }, audio: false })
      .then((s) => {
        if (cancelled) {
          s.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = s;
        if (videoRef.current) videoRef.current.srcObject = s;
      })
      .catch(() => setCamError(true));
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, [step]);

  const addShot = useCallback((img: ImageData) => {
    setShots((prev) => (prev.length < 4 ? [...prev, img] : prev));
  }, []);

  // 촬영 한 컷 — 카운트다운 후 비디오 프레임 캡처
  const shootOne = useCallback(async () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    for (const n of [3, 2, 1]) {
      setCountdown(n);
      await new Promise((r) => setTimeout(r, 800));
    }
    setCountdown(null);
    const raw = toImageData(video, video.videoWidth, video.videoHeight, PHOTO_W, PHOTO_H);
    addShot(raw);
  }, [addShot]);

  // 4컷 연속 촬영
  const startShooting = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    for (let i = 0; i < 4; i++) {
      await shootOne();
      if (i < 3) await new Promise((r) => setTimeout(r, 900));
    }
    setBusy(false);
    setStep('frame');
  }, [busy, shootOne]);

  // 업로드 — 파일 1~4장
  const onFiles = useCallback(
    async (files: FileList | null) => {
      if (!files?.length) return;
      setBusy(true);
      const list = [...files].slice(0, 4 - shots.length);
      for (const f of list) {
        const url = URL.createObjectURL(f);
        const img = await new Promise<HTMLImageElement>((res, rej) => {
          const i = new Image();
          i.onload = () => res(i);
          i.onerror = rej;
          i.src = url;
        });
        const raw = toImageData(img, img.naturalWidth, img.naturalHeight, PHOTO_W, PHOTO_H);
        addShot(raw);
        URL.revokeObjectURL(url);
      }
      setBusy(false);
    },
    [addShot, shots.length],
  );

  const compose = useCallback(async () => {
    setBusy(true);
    const filtered = shots.map((s) => applyFilter(s, filterId));
    const canvas = await compose4cut(filtered, `${BASE}assets/frames/${FRAMES[frameIdx].id}.webp`);
    setResultUrl(canvas.toDataURL('image/png'));
    setBusy(false);
    setStep('result');
  }, [shots, frameIdx, filterId]);

  const download = () => {
    if (!resultUrl) return;
    const a = document.createElement('a');
    a.href = resultUrl;
    a.download = `minhwa-necut-${Date.now()}.png`;
    a.click();
  };

  const share = async () => {
    if (!resultUrl) return;
    const blob = await (await fetch(resultUrl)).blob();
    const file = new File([blob], 'minhwa-necut.png', { type: 'image/png' });
    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: '민화네컷 — 내 사진이 민화가 됐다' });
        return;
      } catch (e) {
        if ((e as Error).name === 'AbortError') return;
      }
    }
    download();
  };

  const restart = () => {
    setShots([]);
    setResultUrl(null);
    setStep('shoot');
  };

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col bg-paper px-4 pb-6 pt-5 text-ink">
      <header className="mb-4 text-center">
        <h1 className="text-2xl font-bold tracking-widest">민화네컷</h1>
        <p className="mt-1 text-xs text-inkline/70">내 사진이 민화가 되는 네 컷</p>
      </header>

      {step === 'shoot' && (
        <section className="flex flex-1 flex-col gap-4">
          {/* 뷰파인더 */}
          <div className="relative overflow-hidden rounded-2xl border-2 border-ink/20 bg-ink/5">
            {camError ? (
              <div className="flex h-72 flex-col items-center justify-center gap-2 p-6 text-center">
                <p className="text-sm text-inkline">카메라를 열 수 없습니다 (인앱 브라우저일 수 있어요)</p>
                <p className="text-xs text-inkline/60">아래에서 사진을 올려주세요</p>
              </div>
            ) : (
              <>
                <video ref={videoRef} autoPlay playsInline muted className="h-72 w-full object-cover" />
                {countdown !== null && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                    <span className="text-8xl font-bold text-paper drop-shadow-lg">{countdown}</span>
                  </div>
                )}
                <div className="absolute right-2 top-2 rounded bg-ink/70 px-2 py-0.5 text-[10px] text-paper">
                  필터는 다음 단계에서 골라요
                </div>
              </>
            )}
          </div>

          {/* 찍은 컷 썸네일 */}
          <div className="flex justify-center gap-2">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className="flex h-16 w-24 items-center justify-center overflow-hidden rounded-lg border border-ink/20 bg-paper-dim text-xs text-inkline/40"
              >
                {shots[i] ? <ShotThumb shot={shots[i]} filterId={filterId} /> : i + 1}
              </div>
            ))}
          </div>

          <div className="mt-auto flex flex-col gap-2">
            {!camError && (
              <button
                type="button"
                onClick={startShooting}
                disabled={busy}
                className="w-full rounded-xl bg-ink py-4 text-lg font-bold text-paper disabled:opacity-40"
              >
                {busy ? '촬영 중…' : '네 컷 촬영 시작'}
              </button>
            )}
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="w-full rounded-xl border border-ink/30 py-3 text-sm font-bold text-inkline"
            >
              사진 올리기 (최대 4장)
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => {
                void onFiles(e.target.files);
                e.target.value = '';
              }}
            />
            {shots.length > 0 && (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShots((s) => s.slice(0, -1))}
                  className="flex-1 rounded-lg border border-ink/20 py-2 text-xs text-inkline"
                >
                  한 장 지우기
                </button>
                <button
                  type="button"
                  onClick={() => setStep('frame')}
                  disabled={shots.length < 4}
                  className="flex-1 rounded-lg bg-ink py-2 text-xs font-bold text-paper disabled:opacity-40"
                >
                  프레임 고르기 ({shots.length}/4)
                </button>
              </div>
            )}
          </div>
        </section>
      )}

      {step === 'frame' && (
        <section className="flex flex-1 flex-col gap-4">
          <h2 className="text-sm font-bold text-inkline">필터를 고르세요</h2>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilterId(f.id)}
                className={`w-20 shrink-0 overflow-hidden rounded-lg border-2 text-left ${
                  f.id === filterId ? 'border-ink shadow-md' : 'border-ink/15'
                }`}
              >
                <FilterPreview shot={shots[0]} filterId={f.id} />
                <div className="bg-paper/90 px-1.5 py-1">
                  <p className="text-[10px] font-bold leading-tight text-inkline">{f.name}</p>
                  <p className="text-[8px] leading-tight text-inkline/60">{f.desc}</p>
                </div>
              </button>
            ))}
          </div>
          <h2 className="text-sm font-bold text-inkline">프레임을 고르세요</h2>
          <div className="grid grid-cols-2 gap-3">
            {FRAMES.map((f, i) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFrameIdx(i)}
                className={`overflow-hidden rounded-xl border-2 text-left ${
                  i === frameIdx ? 'border-ink shadow-md' : 'border-ink/15'
                }`}
              >
                <img src={`${BASE}assets/frames/${f.id}.webp`} alt={f.name} className="aspect-[3/7] w-full object-cover" />
                <p className="bg-paper/90 px-2 py-1.5 text-xs font-bold text-inkline">{f.name}</p>
              </button>
            ))}
          </div>
          <div className="mt-auto flex gap-2">
            <button
              type="button"
              onClick={() => setStep('shoot')}
              className="flex-1 rounded-xl border border-ink/30 py-3 text-sm font-bold text-inkline"
            >
              ← 다시 찍기
            </button>
            <button
              type="button"
              onClick={compose}
              disabled={busy}
              className="flex-[2] rounded-xl bg-ink py-3 text-sm font-bold text-paper disabled:opacity-40"
            >
              {busy ? '합성 중…' : '네컷 완성하기'}
            </button>
          </div>
        </section>
      )}

      {step === 'result' && resultUrl && (
        <section className="flex flex-1 flex-col gap-4">
          <div className="overflow-hidden rounded-xl border-2 border-ink/20 shadow-lg">
            <img src={resultUrl} alt="완성된 민화네컷" className="w-full" />
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={restart}
              className="rounded-xl border border-ink/30 px-4 py-3 text-sm font-bold text-inkline"
            >
              다시
            </button>
            <button
              type="button"
              onClick={download}
              className="flex-1 rounded-xl border border-ink/30 py-3 text-sm font-bold text-inkline"
            >
              저장
            </button>
            <button
              type="button"
              onClick={share}
              className="flex-1 rounded-xl bg-ink py-3 text-sm font-bold text-paper"
            >
              친구에게 공유
            </button>
          </div>
          <p className="text-center text-[11px] text-inkline/50">사진은 기기에만 저장되고 서버로 보내지 않습니다</p>
        </section>
      )}
    </main>
  );
}

function ShotThumb({ shot, filterId }: { shot: ImageData; filterId: string }) {
  const filtered = useMemo(() => applyFilter(shot, filterId), [shot, filterId]);
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    ref.current?.getContext('2d')?.putImageData(filtered, 0, 0);
  }, [filtered]);
  return <canvas ref={ref} width={filtered.width} height={filtered.height} className="h-full w-full object-cover" />;
}

/** 첫 컷을 축소해 필터별 미리보기 칩으로 렌더링 */
function FilterPreview({ shot, filterId }: { shot: ImageData | undefined; filterId: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const ctx = cv.getContext('2d')!;
    const w = 96;
    const h = 54;
    if (!shot) {
      ctx.fillStyle = '#ece2cc';
      ctx.fillRect(0, 0, w, h);
      return;
    }
    // 축소 복사 → 필터 적용 → 출력
    const tmp = document.createElement('canvas');
    tmp.width = shot.width;
    tmp.height = shot.height;
    tmp.getContext('2d')!.putImageData(shot, 0, 0);
    const small = document.createElement('canvas');
    small.width = w;
    small.height = h;
    small.getContext('2d')!.drawImage(tmp, 0, 0, w, h);
    const img = applyFilter(small.getContext('2d')!.getImageData(0, 0, w, h), filterId);
    ctx.putImageData(img, 0, 0);
  }, [shot, filterId]);
  return <canvas ref={ref} width={96} height={54} className="block w-full" />;
}
