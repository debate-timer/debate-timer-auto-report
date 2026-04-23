# Current Phase Checklist

현재 활성 Phase: `Phase 0. 설계 고정`

## 목표

개발 도중 흔들리기 쉬운 초기 결정을 문서로 먼저 고정한다.

현재 범위는 문서 작업만이다.

- Walking Skeleton 구현 안 함
- Nest CLI 실행 안 함
- 코드 초기화 안 함

## 현재까지 반영된 문서 작업

- [x] 기존 루트 문서를 `docs/`로 이동
- [x] `docs/README.md` 전역 인덱스 작성
- [x] `master-checklist.md` 작성
- [x] `current-phase-checklist.md` 작성
- [x] `decisions.md` 전역 의사결정 문서 작성

## Phase 0 체크리스트

### 범위와 운영 원칙

- [x] 1차 범위를 `Amplitude only`로 문서화
- [x] 기본 타임존 정책 `Asia/Seoul`을 문서화
- [x] 주간/월간 경계 규칙을 문서화
- [x] 테스트 채널과 운영 채널 분리 원칙을 문서화
- [x] 현재 목표를 `로컬에서 동작 가능`으로 한정하는 원칙을 문서화

### 기술/구조 결정

- [x] Node.js / TypeScript / NestJS / Prisma / PostgreSQL 권장 조합을 문서화
- [x] Pino와 Nest built-in Logger 비교 및 권장안을 문서화
- [x] AI SDK Core 선택 근거를 문서화
- [ ] ADR 1건 확정

### 환경변수/부트스트랩 준비

- [x] Nest CLI 기반 부트스트랩 방식을 향후 실행 규칙으로 문서화
- [ ] 환경변수 파일 구조 확정
- [ ] `.env.example` 초안 작성
- [ ] 필수 환경변수 키 목록 별도 정리

## 향후 실행 규칙

코드 작업이 허용되면 부트스트랩은 `Nest CLI` 기준으로 진행한다.

- 임시 폴더에서 생성 후 필요한 파일만 반영
- `--skip-install`, `--skip-git`, `--strict` 사용
- 부트스트랩 이후에만 Phase 1 작업 착수

## Phase 0 완료 기준

- [ ] “1차에서는 Sentry를 직접 구현하지 않는다”는 점이 문서상 명확히 고정됨
- [ ] 필수 환경변수 목록이 확정됨
- [ ] Phase 0 산출물과 다음 액션이 문서 기준으로 바로 이어짐
