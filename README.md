# 민화네컷

사진 4장을 찍거나 올리면 **민화풍으로 변환**해 전통 프레임의 네컷 사진 스트립으로 만들어주는 웹앱. 결과물은 PNG로 저장하거나 카톡 등으로 바로 공유 가능.

## 기술

- Vite + React 19 + TypeScript + Tailwind 4
- 민화 필터: 포스터라이즈 + Sobel 윤곽선(먹선) + 한지 틴트 (로컬 처리, 서버 없음)
- 프레임/아이콘: Replicate flux-schnell 생성물을 정적 에셋으로 번들
- PWA — 설치 + 오프라인 동작

## 명령어

```sh
pnpm dev          # 개발 서버
pnpm verify       # typecheck + lint + test + build
pnpm gen:images   # 프레임/아이콘 재생성 (REPLICATE_API_TOKEN 필요)
```

배포: `main` push → GitHub Actions → `https://holoolook-del.github.io/necut/`
