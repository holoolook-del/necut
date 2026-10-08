# CODE_INDEX

## lib
- `src/lib/filters.ts` — 필터 레지스트리 `FILTERS` 9종 + `applyFilter(ImageData, id)` + `toneAdjust(ImageData, Tone)` 톤 보정 파이프라인
- `src/lib/minhwa.ts` — 민화 필터. `minhwaize(ImageData, opts?) → ImageData` (포스터라이즈+틴트+Sobel 먹선), `toImageData(source, sw, sh, outW, outH) → ImageData` (cover 크롭+다운스케일)
- `src/lib/compose.ts` — 네컷 합성. `compose4cut(ImageData[4], frameSrc) → Promise<HTMLCanvasElement>` (프레임 배경 + 4슬롯 + 낙관/캡션)

## ui
- `src/App.tsx` — 전체 플로우 단일 컴포넌트 (shoot → frame → result), `ShotThumb` (ImageData → canvas 썸네일)

## scripts
- `scripts/gen-images.ts` — Replicate flux-schnell로 프레임/아이콘 생성 (개발용, `pnpm gen:images`, .env의 REPLICATE_API_TOKEN 사용, 결과물은 git에 커밋)

## assets
- `public/assets/frames/{horangi,moran,hak,dancheong}.webp` — 생성된 민화 프레임 (중앙 빈 공간)
- `public/assets/icon.png` — 생성된 앱 아이콘
