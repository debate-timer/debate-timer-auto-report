# Master Checklist

전체 Phase의 상태와 선행관계를 전역적으로 관리한다.

현재 활성 Phase: `Phase 1. Walking Skeleton`

## 상태 기준

- `in progress`: 현재 집중 중
- `not started`: 아직 착수하지 않음
- `deferred`: 후속 전제 충족 전까지 보류

## 전체 Phase 현황

| Phase | 상태 | 핵심 목표 | 선행 |
|---|---|---|---|
| Phase 0. 설계 고정 | ✅ 완료 | 흔들리기 쉬운 초기 결정을 고정 | 없음 |
| Phase 1. Walking Skeleton | in progress | 지표 1개 end-to-end 경로 완성 | Phase 0 |
| Phase 2. Skeleton 안정화 | not started | 멱등성, 재시도, 운영 상태 추적 | Phase 1 |
| Phase 3. 지표 정의 확장 및 저장 모델 | not started | 3~5개 핵심 지표 확장 기반 확보 | Phase 2 일부 |
| Phase 4. Amplitude 수집 계층 확장 | not started | 다중 지표 수집 및 표준 스냅샷 변환 | Phase 2 일부 |
| Phase 5. 비교 및 이상치 판별 | not started | 숫자 비교/경고 핵심 로직 완성 | Phase 3, Phase 4 |
| Phase 6. 리포트 생성 | not started | 주간/월간/경고 payload 생성 | Phase 5 |
| Phase 7. 운영 관측성 | not started | 최근 실행 상태와 실패 원인 추적 | Phase 5 일부 |
| Phase 8. AI 요약 계층 | deferred | bounded analyzer agent 추가 | 1차 릴리스 이후 별도 트랙 가능 |
| Phase 9. Sentry 확장 | deferred | 에러 수집 및 지표/에러 결합 리포트 | Sentry 준비 이후 |

## 전역 완료 체크

- [x] Phase 0 완료
- [ ] Phase 1 완료
- [ ] Phase 2 완료
- [ ] Phase 3 완료
- [ ] Phase 4 완료
- [ ] Phase 5 완료
- [ ] Phase 6 완료
- [ ] Phase 7 완료
- [ ] Phase 8 완료
- [ ] Phase 9 완료

## 선행관계 요약

- `Phase 0 -> Phase 1 -> Phase 2`가 기본 직렬 경로다.
- `Phase 2` 완료 직후 `Phase 3`과 `Phase 4` 일부 병렬 진행이 가능하다.
- `Phase 5` 완료 직후 `Phase 6`과 `Phase 7` 일부 병렬 진행이 가능하다.
- `Phase 8`은 1차 릴리스 이후 별도 트랙으로 분리 가능하다.
- `Phase 9`는 Sentry 준비 전까지 보류 가능하다.

## 현재 집중 포인트

- [x] 문서 진입점을 `docs/README.md`로 통일
- [x] 기존 루트 문서를 `docs/`로 이동
- [x] 전역 체크리스트 2개 체계 도입
- [x] Phase 0 산출물 문서 고정 (SRS 11.1 수정 완료)
- [x] ADR 1건 작성 (`docs/adr/001-amplitude-first.md`)
- [x] `.env.example`와 환경변수 키 목록 확정

상세 작업은 [current-phase-checklist.md](./current-phase-checklist.md)를 기준으로 본다.
