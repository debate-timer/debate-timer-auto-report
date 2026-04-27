# Tasks: Phase 1-1 프로젝트 기반 구성

**Input**: Design documents from `/specs/feat/006-project-base-setup/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/health.md

**Tests**: plan.md Constitution Check에 TDD Red-Green-Refactor가 REQUIRED로 명시되어 있어 테스트 태스크가 포함됩니다.

**Organization**: 태스크는 유저 스토리별로 그룹화하여 각 스토리를 독립적으로 구현하고 테스트할 수 있습니다.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 병렬 실행 가능 (다른 파일, 상호 의존성 없음)
- **[Story]**: 해당 유저 스토리 (US1~US5)
- 파일 경로 명시 필수

---

## Phase 1: Setup (공통 기반)

**Purpose**: 패키지 설치 및 seed 설정 초기화

- [x] T001 `npm install joi @prisma/adapter-pg pg dotenv` 실행 (환경변수 검증 + Prisma 7 PostgreSQL adapter + prisma.config.ts 환경변수 로드)
- [x] T002 `npm install --save-dev pino-pretty @types/pg` 실행 (개발 환경 로그 가독성 + pg 타입)
- [x] T003 [P] `prisma.config.ts` 작성: `defineConfig({ schema: 'prisma/schema.prisma', datasource: { url: env('DATABASE_URL') }, migrations: { seed: 'ts-node prisma/seed.ts' } })`

---

## Phase 2: Foundational (블로킹 전제 조건)

**Purpose**: 4개 핵심 테이블 생성 — US4, US5의 구현 전제 조건

**⚠️ CRITICAL**: Phase 2 완료 전까지 US4(Prisma 모듈), US5(seed) 작업 시작 불가

- [x] T004 `prisma/schema.prisma` 작성: MetricDefinition, MetricSnapshot, ReportRun, Delivery 4개 모델 및 MetricSource, MetricUnit, Direction, PeriodType, RunType, RunStatus, TriggerType, DeliveryChannel, DeliveryStatus enum 정의 (data-model.md 스키마 그대로 작성, `@map`/`@@map` 포함, datasource `url` 없음, `generator client { provider = "prisma-client"; output = "../src/generated/prisma" }`)
- [x] T005 `npx prisma validate` 및 `npx prisma generate` 실행하여 Prisma 7 스키마 문법, config 연결, generated client 생성을 검증 (T003, T004 완료 후)
- [x] T006 `npx prisma migrate dev --name init` 실행하여 DB에 4개 테이블 생성 (T005 완료 후)

**Checkpoint**: `metric_definitions`, `metric_snapshots`, `report_runs`, `deliveries` 테이블 존재 확인 후 US4, US5 시작 가능

---

## Phase 3: User Story 1 - 환경 설정 오류 즉시 감지 (Priority: P1) 🎯 MVP

**Goal**: 서비스 기동 시 필수 환경변수 누락·형식 오류를 즉시 감지하고 명확한 오류 메시지와 함께 5초 이내 종료

**Independent Test**: `.env`에서 `DATABASE_URL`을 제거한 후 서비스 기동 → "DATABASE_URL is required" 형태 오류 메시지 출력 후 종료 확인

### Tests for User Story 1 ⚠️ (TDD — RED 먼저)

- [x] T007 [US1] `src/modules/config/config.schema.spec.ts` 작성: test-contracts/config.md 명세를 기준으로 아래 케이스를 각각 테스트 (RED)
  1. 모든 필수 환경변수(`DATABASE_URL`, `AMPLITUDE_API_KEY`, `AMPLITUDE_SECRET_KEY`, `DISCORD_WEBHOOK_URL_TEST`, `SCHEDULE_WEEKLY_REPORT`, `SCHEDULE_MONTHLY_REPORT`) 유효값 제공 시 정상 통과
  2. `DATABASE_URL` 누락 시 ValidationError 발생 + 오류 메시지에 `DATABASE_URL` 포함
  3. `AMPLITUDE_API_KEY` 누락 시 ValidationError 발생
  4. `AMPLITUDE_SECRET_KEY` 누락 시 ValidationError 발생
  5. `DISCORD_WEBHOOK_URL_TEST` 누락 시 ValidationError 발생
  6. `SCHEDULE_WEEKLY_REPORT` 누락 시 ValidationError 발생
  7. `SCHEDULE_MONTHLY_REPORT` 누락 시 ValidationError 발생
  8. `DATABASE_URL`에 non-URI 문자열 또는 PostgreSQL이 아닌 scheme 입력 시 ValidationError 발생 + 오류 메시지에 `DATABASE_URL` 포함
  9. `LOG_LEVEL` 미지정 시 기본값 `'info'` 적용
  10. `LOG_LEVEL`에 `'fatal'`, `'error'`, `'warn'`, `'info'`, `'debug'`, `'trace'` 각각 입력 시 정상 통과
  11. `LOG_LEVEL='verbose'` 입력 시 ValidationError 발생 + 오류 메시지에 `'LOG_LEVEL'` 포함
  12. `PORT` 미지정 시 기본값 `3000` 적용
  13. `PORT='not-a-number'` 입력 시 ValidationError 발생 + 오류 메시지에 `PORT` 포함
  14. `NODE_ENV` 미지정 시 기본값 `'development'` 적용, 허용값은 `'development'`, `'test'`, `'production'`

### Implementation for User Story 1

- [x] T008 [US1] `src/modules/config/config.schema.ts` Joi 검증 스키마 구현:
  - `NODE_ENV` — `Joi.string().valid('development','test','production').default('development')`
  - `PORT` — `Joi.number().port().default(3000)`
  - `DATABASE_URL` — `Joi.string().uri({ scheme: ['postgresql', 'postgres'] }).required()`
  - `AMPLITUDE_API_KEY` — `Joi.string().required()`
  - `AMPLITUDE_SECRET_KEY` — `Joi.string().required()`
  - `DISCORD_WEBHOOK_URL_TEST` — `Joi.string().uri().required()`
  - `DISCORD_WEBHOOK_URL_REPORT` — `Joi.string().uri().optional()` (Phase 1에서 선택 사항)
  - `DISCORD_WEBHOOK_URL_ALERT` — `Joi.string().uri().optional()` (Phase 1에서 선택 사항)
  - `DISCORD_WEBHOOK_URL_OPS` — `Joi.string().uri().optional()` (Phase 1에서 선택 사항)
  - `SCHEDULE_WEEKLY_REPORT` — `Joi.string().required()` (cron 표현식, KST 기준)
  - `SCHEDULE_MONTHLY_REPORT` — `Joi.string().required()` (cron 표현식, KST 기준)
  - `LOG_LEVEL` — `Joi.string().valid('fatal','error','warn','info','debug','trace').default('info')`
  - `AI_ENABLED` — `Joi.boolean().default(false)`
  (GREEN)
- [x] T009 [US1] `src/modules/config/config.module.ts` ConfigModule 래퍼 구현: `ConfigModule.forRoot({ isGlobal: true, validationSchema: configSchema, validationOptions: { abortEarly: false, allowUnknown: true } })`

**Checkpoint**: `npx jest src/modules/config/config.schema.spec.ts` 통과 확인

---

## Phase 4: User Story 2 - 서비스 상태 확인 (Priority: P2)

**Goal**: `GET /health` → HTTP 200 + `{ "status": "ok" }` 100ms 이내 반환

**Independent Test**: 서비스 기동 후 `curl localhost:3000/health` → HTTP 200 + `{"status":"ok"}` 응답 확인

### Tests for User Story 2 ⚠️ (TDD — RED 먼저)

- [x] T010 [P] [US2] `src/modules/health/health.controller.spec.ts` 작성: GET /health → HTTP 200 반환 테스트, 응답 body `{ status: 'ok' }` 테스트, 반복 요청 시 일관된 응답 테스트 (RED)

### Implementation for User Story 2

- [x] T011 [US2] `src/modules/health/health.controller.ts` HealthController 구현: `@Controller() @Get('health')` → `{ status: 'ok' }` 반환 (GREEN)
- [x] T012 [US2] `src/modules/health/health.module.ts` HealthModule 구현: HealthController를 controllers에 등록

**Checkpoint**: `npx jest src/modules/health/health.controller.spec.ts` 통과 확인

---

## Phase 5: User Story 4 - 핵심 데이터 저장 기반 준비 (Priority: P4)

> ⚠️ US3(P3)는 app.module.ts 조립 시 모든 모듈이 갖춰진 후 구현하므로 US4를 먼저 진행

**Goal**: PrismaService 통해 4개 핵심 테이블 연결·저장·조회 가능, DB 연결 실패 시 즉시 기동 중단

**Independent Test**: PrismaService onModuleInit/onModuleDestroy 호출 시 `$connect`/`$disconnect` 실행 확인

### Tests for User Story 4 ⚠️ (TDD — RED 먼저)

- [x] T013 [US4] `src/modules/prisma/prisma.service.spec.ts` 작성: `ConfigService.getOrThrow('DATABASE_URL')`로 연결 문자열을 읽는지, `PrismaPg` adapter로 generated `PrismaClient`를 생성하는지, `onModuleInit()` 시 `$connect` 호출, `onModuleDestroy()` 시 `$disconnect` 호출을 테스트 (RED)

### Implementation for User Story 4

- [x] T014 [US4] `src/modules/prisma/prisma.service.ts` PrismaService 구현: `PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy`, generated client(`src/generated/prisma/client`)에서 `PrismaClient` import, constructor에서 `ConfigService.getOrThrow<string>('DATABASE_URL')` 값으로 `new PrismaPg({ connectionString })` adapter 생성, `super({ adapter })`, `onModuleInit → this.$connect()`, `onModuleDestroy → this.$disconnect()` (GREEN)
- [x] T015 [US4] `src/modules/prisma/prisma.module.ts` PrismaModule 구현: PrismaService를 providers와 exports에 등록, Global 모듈로 설정

**Checkpoint**: `npx jest src/modules/prisma/prisma.service.spec.ts` 통과 확인

---

## Phase 6: User Story 5 - 초기 지표 데이터 존재 (Priority: P5)

**Goal**: `npx prisma db seed` 실행 후 `metric_definitions` 테이블에 `timer_started` 지표 1행 존재, 재실행 시 중복 없음

**Independent Test**: `npx prisma db seed` 실행 후 `SELECT COUNT(*) FROM metric_definitions WHERE key='timer_started'` → 1 확인, 재실행 후에도 여전히 1 확인

### Implementation for User Story 5

- [x] T016 [US5] `prisma/seed.ts` 작성: generated `PrismaClient`와 `PrismaPg`를 직접 import하여 `metric_definitions` 테이블에 `timer_started` 지표를 `upsert({ where: { key: 'timer_started' }, update: {}, create: { key, name, description, source: AMPLITUDE, unit: COUNT, querySpecVersion: 1, querySpec, direction: HIGHER_IS_BETTER, minSampleSize: 30, warningRule, isActive: true } })` 로 등록 후 `$disconnect()` 호출

**Checkpoint**: `npx prisma db seed` 2회 실행 후 테이블에 `timer_started` 행이 1개만 존재하는지 확인

---

## Phase 7: User Story 3 - 구조화된 로그 출력 + 앱 모듈 조립 (Priority: P3)

**Goal**: nestjs-pino JSON 로그로 HTTP 요청 자동 기록, 모든 모듈이 app.module.ts에 통합 등록, `/health` E2E 통과

**Independent Test**: 서비스 기동 후 `/health` 요청 시 터미널에 `{"level":30,"time":...,"req":{"method":"GET","url":"/health",...}}` 형태 JSON 로그 출력 확인. `LOG_LEVEL=warn` 설정 시 info 로그 미출력 확인

### Tests for User Story 3 ⚠️ (TDD — RED 먼저)

- [x] T017 [US3] `test/app.e2e-spec.ts`에 E2E 테스트 추가: 앱 부트스트랩 후 `GET /health` → HTTP 200 + `{ status: 'ok' }` 반환 테스트 (RED)

### Implementation for User Story 3

- [x] T018 [US3] `src/app.module.ts` 구현: ConfigModule(T009), `LoggerModule.forRoot({ pinoHttp: { level: process.env.LOG_LEVEL || 'info', transport: process.env.NODE_ENV !== 'production' ? { target: 'pino-pretty' } : undefined, redact: ['req.headers.authorization', 'req.headers.cookie'] } })`, HealthModule(T012), PrismaModule(T015) 등록 (GREEN)
- [x] T019 [US3] `src/main.ts` 수정: `NestFactory.create(AppModule, { bufferLogs: true })`, `app.useLogger(app.get(Logger))` pino Logger 교체, `app.useGlobalPipes(new ValidationPipe())` 등록

**Checkpoint**: `npm run test:e2e` 통과, 서비스 기동 후 `/health` 요청 시 JSON 로그 출력 확인

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: 환경변수 예시 파일 업데이트 및 전체 품질 검증

- [x] T020 [P] `.env.example` 파일에 T008 스키마의 전체 키와 예시값 업데이트: `NODE_ENV=development`, `PORT=3000`, `DATABASE_URL=postgresql://user:pass@localhost:5432/debate_timer`, `AMPLITUDE_API_KEY=your_amplitude_api_key`, `AMPLITUDE_SECRET_KEY=your_amplitude_secret_key`, `DISCORD_WEBHOOK_URL_TEST/REPORT/ALERT/OPS=https://discord.com/api/webhooks/...`, `SCHEDULE_WEEKLY_REPORT="0 9 * * 1"`, `SCHEDULE_MONTHLY_REPORT="0 9 1 * *"`, `LOG_LEVEL=info`, `AI_ENABLED=false`
- [x] T021 `npm test` 전체 단위 테스트 통과 확인 (config.schema.spec.ts, health.controller.spec.ts, prisma.service.spec.ts 포함)
- [x] T022 `npm run lint` 실행하여 코드 스타일 검사 및 자동 수정
- [x] T023 `npm run format` 실행하여 코드 포맷 정리

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: 의존성 없음 — 즉시 시작 가능
- **Foundational (Phase 2)**: Phase 1과 병렬 실행 가능 (T004는 패키지 설치와 무관)
- **US1 (Phase 3)**: Phase 1 완료 후 — Phase 2와 병렬 실행 가능
- **US2 (Phase 4)**: Phase 1 완료 후 — US1과 병렬 실행 가능 (다른 파일)
- **US4 (Phase 5)**: Phase 2 완료 필수 (스키마 마이그레이션 선행)
- **US5 (Phase 6)**: Phase 2 + US4(T014~T015) 완료 필수
- **US3 (Phase 7)**: US1(T009), US2(T012), US4(T015) 모두 완료 후 — app.module.ts 조립
- **Polish (Phase 8)**: US3(Phase 7) 완료 후

### User Story Dependencies

| Story | 선행 조건 | 병렬 가능 대상 |
|-------|----------|--------------|
| US1 (P1) | Phase 1 | Phase 2, US2 |
| US2 (P2) | Phase 1 | Phase 2, US1 |
| US4 (P4) | Phase 2 | — |
| US5 (P5) | Phase 2 + US4 | — |
| US3 (P3) | US1 + US2 + US4 | — |

### Within Each User Story (TDD 사이클)

1. `.spec.ts` 테스트 먼저 작성 → 실패 확인 (**RED**)
2. 구현 파일 작성 → 테스트 통과 (**GREEN**)
3. 코드 정리 (**REFACTOR**)
4. 모듈 파일(`*.module.ts`) 작성

---

## Parallel Example: Phase 1 + Phase 2 동시 실행

```bash
# package-lock.json 충돌을 피하기 위해 npm install 계열은 순차 실행:
Task: "npm install joi @prisma/adapter-pg pg dotenv"
Task: "npm install --save-dev pino-pretty @types/pg"

# 설치와 독립적인 문서/스키마 파일 작업은 병렬 가능:
Task: "prisma.config.ts 작성"
Task: "prisma/schema.prisma 4개 모델 + enum 작성"

# 이후 T003, T004 완료 후:
Task: "npx prisma validate"
```

## Parallel Example: US1 + US2 동시 실행 (Phase 1 완료 후)

```bash
# US1 테스트와 US2 테스트를 병렬 작성:
Task: "src/modules/config/config.schema.spec.ts 테스트 작성 (RED)"
Task: "src/modules/health/health.controller.spec.ts 테스트 작성 (RED)"
```

---

## Implementation Strategy

### MVP First (User Story 1만)

1. Phase 1: Setup 완료 (T001~T003)
2. Phase 2: Foundational 완료 (T004~T006) — 스키마 생성
3. Phase 3: US1 완료 (T007~T009) — 환경변수 검증
4. **STOP and VALIDATE**: `.env`에서 `DATABASE_URL` 제거 후 기동 → 오류 출력 확인
5. 검증 완료 후 다음 우선순위 User Story 진행

### Incremental Delivery

1. Phase 1 + 2 → 기반 완료
2. US1 (Phase 3) → 환경변수 검증 ✅
3. US2 (Phase 4) → `/health` 엔드포인트 ✅
4. US4 (Phase 5) → DB 연결 및 저장 기반 ✅
5. US5 (Phase 6) → `timer_started` seed ✅
6. US3 (Phase 7) → 구조화 로그 + 전체 모듈 통합 ✅
7. Polish (Phase 8) → 코드 품질 정리

---

## Notes

- 테스트 설명(`describe`/`it`/`test`)은 모두 **한국어**로 작성
- RED 단계: 테스트가 **실패**하는지 반드시 확인 후 GREEN 진행
- [P] 표시 태스크는 같은 의존성 레벨에서 병렬 실행 가능
- 각 Checkpoint 후 커밋하여 진행 이력 관리
- `nestjs-best-practices` 스킬을 구현 시 반드시 참조
- `.env` 파일은 절대 커밋 금지 — `.env.example`만 커밋
