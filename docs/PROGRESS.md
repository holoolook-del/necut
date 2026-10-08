# PROGRESS

## T1 — 민화네컷 초기 구현 (완료)

### 한 일
- Vite/React19/TS/Tailwind4/PWA 스캐폴드 (muk 프로젝트 설정 재사용, base=/necut/)
- `src/lib/minhwa.ts` — 민화 필터: 포스터라이즈(5단계) + 채도 부스트 + 한지 틴트 + Sobel 먹선. `toImageData`는 cover 크롭 공통 유틸
- `src/lib/compose.ts` — 네컷 합성: 생성된 프레임을 배경으로, 중앙 슬롯 4개에 사진 배치 + 먹 테두리 + 주홍 낙관 + 날짜 캡션
- `src/App.tsx` — 3단계 플로우: 촬영(카메라+카운트다운 자동 4컷 / 업로드 대체) → 프레임 선택 → 결과 저장·공유(navigator.share 파일 공유 → 다운로드 폴백)
- Replicate(flux-schnell)로 프레임 4종(호랑이·모란·학·단청) + 아이콘 생성 → public/assets 정적 번들. 런타임 AI 없음
- vitest 3/3, verify 통과, 프리캐시 12개(프레임+아이콘 포함)

### 남은 문제
- 실기기 카메라/공유 동작은 미검증 (인앱 브라우저 getUserMedia 불가 시 업로드 경로로 안내하는 폴백은 있음)
- E2E 없음
- dancheong 프레임 하단 건물 현판에 작은 가짜 문자 있음 — 사진이 덮지 않는 영역, 실제 현판처럼 보여 유지

### 다음 할 일
- GitHub repo 생성 + Pages 배포
- 실기기 확인
