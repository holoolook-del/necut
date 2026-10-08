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

## 배포 (완료)
- repo: github.com/holoolook-del/necut (API 생성)
- Pages: build_type=workflow 활성화, deploy.yml(pnpm→build→Pages) 자동 실행 성공
- https://holoolook-del.github.io/necut/ 200 확인, 프레임 에셋 200 확인

## T2 — 필터 확장 (완료)
- `src/lib/filters.ts` — 톤 보정 파이프라인 toneAdjust(온도→노출→대비→스플릿토닝→채도→페이드→그레인→비네트) + FILTERS 레지스트리 9종
- 필터: 민화 / 일본 감성(하이키) / 화사한 보정 / 코닥 필름 / 후지 청량 / 시네마틱 / 도시 네온 / 시골 여름 / 흑백
- 레시피 근거: 일본풍=노출↑+대비↓+블랙리프트, 필름=페이드+그레인+스플릿토닝(Kodak 따뜻/Fuji 청록), 시네마틱=틸섀도·오렌지하이라이트, 흑백=Ilford식 고대비+그레인
- App: 촬영 시 raw ImageData 저장 → 꾸미기 단계에서 필터 실시간 전환(썸네일·필터 칩 미리보기·최종 합성 모두 적용)
- vitest 7/7 (노출/무채색/비네트/전필터 스모크)

## T3 — 프레임 재생성 + 자동핏 + UX 수정 (완료)
- 프레임 4종 재생성: 장식을 가장자리 밴드로만 한정하는 엄격 프롬프트 → 중앙 빈 영역 보장 (dancheong은 완전한 내부 사각)
- compose4cut: 슬롯을 가용 높이에서 자동 산출 + 16:9 비율 정합 → 프레임/사진 크기 미스매치 해소
- 공유: 파일공유→텍스트공유→다운로드 3단 폴백 + 미지원 시 안내 메시지
- 결과 화면: '필터·배경 바꾸기'(꾸미기 복귀), '다시 찍기' 분리
- 헤더에 '← 사주 홈으로' 링크
