# Tasks: Phase 1-2 Amplitude Adapter 구현

**Input**: Design documents from `/specs/feat/007-amplitude-adapter/`
**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/`, `test-contracts/`

**Tests**: Required. The implementation plan and feature spec require TDD, external API isolation, Korean test descriptions, and focused unit tests before implementation.

**Organization**: Tasks are grouped by user story so each story can be implemented and tested as an independent increment.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel because it touches different files and does not depend on an incomplete task
- **[Story]**: User story label for feature work only (`US1`, `US2`, `US3`)
- Every task includes an exact repository path or exact verification target

## Path Conventions

- Backend source: `src/`
- NestJS modules: `src/modules/{domain}/`
- Shared utilities: `src/common/`
- Prisma generated client: `src/generated/prisma/`
- Feature artifacts: `specs/feat/007-amplitude-adapter/`

---

## Phase 1: Setup (Shared Structure)

**Purpose**: Create the empty module and utility structure required by the approved implementation plan.

- [x] T001 [P] Create shared time utility directory at `src/common/time/`
- [x] T002 [P] Create metric source core directory at `src/modules/metric-sources/core/`
- [x] T003 [P] Create Amplitude adapter directory at `src/modules/metric-sources/amplitude/`
- [x] T004 [P] Create snapshot persistence directory at `src/modules/snapshots/`
- [x] T005 [P] Create initial `MetricSourcesModule` shell in `src/modules/metric-sources/metric-sources.module.ts`
- [x] T006 [P] Create initial `SnapshotsModule` shell in `src/modules/snapshots/snapshots.module.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Add shared period formatting and core collection contracts that all user stories depend on.

**Critical**: No user story work should begin until this phase is complete.

- [x] T007 [P] Add failing KST date helper tests in `src/common/time/kst-date.spec.ts`
- [x] T008 Implement KST date formatting helpers in `src/common/time/kst-date.ts`
- [x] T009 Run KST helper test for `src/common/time/kst-date.spec.ts`
- [x] T010 [P] Define `MetricCollectionPeriod`, `MetricCollectionSuccess`, `MetricCollectionFailure`, `MetricCollectionFailureCode`, `MetricCollectionResult`, and `MetricSnapshotRawRef` in `src/modules/metric-sources/core/metric-collection.types.ts`
- [x] T011 [P] Define `MetricSourceAdapter.collect(...)` in `src/modules/metric-sources/core/metric-source-adapter.ts`
- [x] T012 [P] Define `METRIC_SOURCE_ADAPTER` token in `src/modules/metric-sources/core/metric-source.tokens.ts`
- [x] T013 [P] Add `TZ=Asia/Seoul` config validation tests in `src/modules/config/config.schema.spec.ts`
- [x] T014 Add required `TZ=Asia/Seoul` validation in `src/modules/config/config.schema.ts`
- [x] T015 Run TypeScript compilation for `src/common/time/kst-date.ts`, `src/modules/config/config.schema.ts`, `src/modules/metric-sources/core/metric-collection.types.ts`, `src/modules/metric-sources/core/metric-source-adapter.ts`, and `src/modules/metric-sources/core/metric-source.tokens.ts` with `npm run build`

**Checkpoint**: Core contracts, config validation, and shared KST date helper are ready.

---

## Phase 3: User Story 1 - Amplitude 지표 조회 분리 (Priority: P1) MVP

**Goal**: Hide Amplitude API details behind `MetricSourceAdapter` and return a standard collection result for weekly `timer_started`.

**Independent Test**: With a mocked Amplitude success fixture, collecting `timer_started` for `2026-W17` returns `status: 'success'`, value/sampleSize `12`, `ALL` segment fields, period fields copied from input, and sanitized `rawRef`.

### Tests for User Story 1

- [x] T016 [P] [US1] Add valid `timer_started` querySpec parser tests in `src/modules/metric-sources/amplitude/amplitude-query-spec.spec.ts`
- [x] T017 [P] [US1] Add Amplitude Event Segmentation URL and Basic auth success tests in `src/modules/metric-sources/amplitude/amplitude.client.spec.ts`
- [x] T018 [P] [US1] Add weekly `timer_started` success and empty-success-as-zero adapter tests in `src/modules/metric-sources/amplitude/amplitude-metric-source.adapter.spec.ts`

### Implementation for User Story 1

- [x] T019 [US1] Implement Phase 1-2 `AmplitudeEventCountQuerySpec` parser in `src/modules/metric-sources/amplitude/amplitude-query-spec.ts`
- [x] T020 [US1] Implement injectable `AmplitudeClient` success path with local `AMPLITUDE_FETCH` token and built-in `fetch` in `src/modules/metric-sources/amplitude/amplitude.client.ts`
- [x] T021 [US1] Implement `AmplitudeMetricSourceAdapter` weekly success transformation in `src/modules/metric-sources/amplitude/amplitude-metric-source.adapter.ts`
- [x] T022 [US1] Register `AMPLITUDE_FETCH`, `AmplitudeClient`, `AmplitudeMetricSourceAdapter`, and `METRIC_SOURCE_ADAPTER` providers in `src/modules/metric-sources/metric-sources.module.ts`
- [x] T023 [US1] Run focused US1 tests for `src/modules/metric-sources/amplitude/amplitude-query-spec.spec.ts`, `src/modules/metric-sources/amplitude/amplitude.client.spec.ts`, and `src/modules/metric-sources/amplitude/amplitude-metric-source.adapter.spec.ts`

**Checkpoint**: User Story 1 is functional and testable without a real Amplitude call.

---

## Phase 4: User Story 2 - 조회 결과 스냅샷 저장 (Priority: P2)

**Goal**: Persist successful `timer_started` collection results into `metric_snapshots` without duplicate rows or overwrites.

**Independent Test**: With mocked `PrismaService.metricSnapshot.upsert`, a successful collection result maps to the existing compound unique key, uses `update: {}`, creates the expected fields, and preserves zero-value snapshots.

### Tests for User Story 2

- [x] T024 [P] [US2] Add no-op upsert, field mapping, and zero-value repository tests in `src/modules/snapshots/snapshots.repository.spec.ts`
- [x] T025 [P] [US2] Add successful collection result delegation tests in `src/modules/snapshots/snapshots.service.spec.ts`

### Implementation for User Story 2

- [x] T026 [US2] Implement `SnapshotsRepository.upsertCollectionSuccess(...)` in `src/modules/snapshots/snapshots.repository.ts`
- [x] T027 [US2] Implement `SnapshotsService.saveCollectionResult(...)` success path in `src/modules/snapshots/snapshots.service.ts`
- [x] T028 [US2] Register `SnapshotsRepository` and `SnapshotsService` providers and exports in `src/modules/snapshots/snapshots.module.ts`
- [x] T029 [US2] Run focused US2 tests for `src/modules/snapshots/snapshots.repository.spec.ts` and `src/modules/snapshots/snapshots.service.spec.ts`

**Checkpoint**: User Story 2 persists success results independently with mocked Prisma.

---

## Phase 5: User Story 3 - 지표 단위 실패 격리 (Priority: P3)

**Goal**: Convert unsupported scope, Amplitude failures, malformed responses, and failed collection results into safe per-metric failures without persisting bad data.

**Independent Test**: Mocked failures return `MetricCollectionFailure` with a safe reason code and message, do not emit credential-bearing logs, do not call Amplitude when `periodType` is `MONTHLY`, and do not call snapshot persistence when result status is `failed`.

### Tests for User Story 3

- [x] T030 [P] [US3] Add unsupported querySpec rejection tests in `src/modules/metric-sources/amplitude/amplitude-query-spec.spec.ts`
- [x] T031 [P] [US3] Add non-2xx, fetch exception, credential-redaction, and no-secret logging tests covering API key, secret key, Authorization header, and Webhook URL strings in `src/modules/metric-sources/amplitude/amplitude.client.spec.ts`
- [x] T032 [P] [US3] Add `MONTHLY`, malformed response, API error, safe failure message, and no-secret logging adapter tests covering API key, secret key, Authorization header, and Webhook URL strings in `src/modules/metric-sources/amplitude/amplitude-metric-source.adapter.spec.ts`
- [x] T033 [P] [US3] Add failed collection skip tests in `src/modules/snapshots/snapshots.service.spec.ts`
- [x] T034 [P] [US3] Add sensitive `rawRef` rejection tests in `src/modules/snapshots/snapshots.repository.spec.ts`

### Implementation for User Story 3

- [x] T035 [US3] Implement unsupported querySpec rejection in `src/modules/metric-sources/amplitude/amplitude-query-spec.ts`
- [x] T036 [US3] Implement safe Amplitude non-2xx and fetch exception handling in `src/modules/metric-sources/amplitude/amplitude.client.ts`
- [x] T037 [US3] Implement `MONTHLY` guard, malformed response failure, and API error failure mapping in `src/modules/metric-sources/amplitude/amplitude-metric-source.adapter.ts`
- [x] T038 [US3] Implement failed result skip behavior in `src/modules/snapshots/snapshots.service.ts`
- [x] T039 [US3] Implement sensitive `rawRef` guard before Prisma writes in `src/modules/snapshots/snapshots.repository.ts`
- [x] T040 [US3] Run focused US3 tests for `src/modules/metric-sources/amplitude/amplitude-query-spec.spec.ts`, `src/modules/metric-sources/amplitude/amplitude.client.spec.ts`, `src/modules/metric-sources/amplitude/amplitude-metric-source.adapter.spec.ts`, `src/modules/snapshots/snapshots.service.spec.ts`, and `src/modules/snapshots/snapshots.repository.spec.ts`

**Checkpoint**: User Story 3 safely isolates collection failures and prevents invalid persistence.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Wire feature modules into the app and verify the existing Phase 1-1 behavior still passes.

- [x] T041 Import `MetricSourcesModule` and `SnapshotsModule` in `src/app.module.ts`
- [x] T042 Run the full Jest suite for `src/` with `npm test -- --runInBand`
- [x] T043 Run lint verification for `src/` with `npm run lint`
- [x] T044 Run production build verification for `src/` with `npm run build`
- [x] T045 If local PostgreSQL is available, run a Prisma-backed smoke check that saves the same successful `timer_started` snapshot twice and verifies one `metric_snapshots` row remains; record the result or DB blocker in `specs/feat/007-amplitude-adapter/tasks.md`
  - Result: DB smoke check skipped because local PostgreSQL was unavailable. `.env` contains a local `DATABASE_URL`, but `pg_isready` returned `/tmp:5432 - no response`. Mocked repository tests verify the no-op upsert behavior for this phase.

---

## Phase 7: CodeRabbit Review Hardening

**Purpose**: Address verified CodeRabbit review findings without broadening Phase 1-2 scope.

- [x] T046 Replace broad `specs/` ignore with narrow local/temporary spec patterns in `.gitignore`
- [x] T047 Add invalid `Date` guards and tests for `src/common/time/kst-date.ts`
- [x] T048 Enforce exact Amplitude querySpec keys and unsupported `eventType` rejection in `src/modules/metric-sources/amplitude/amplitude-query-spec.ts`
- [x] T049 Treat malformed `seriesCollapsed` structure as `AMPLITUDE_RESPONSE_INVALID` instead of `0` success in `src/modules/metric-sources/amplitude/amplitude-metric-source.adapter.ts`
- [x] T050 Add Amplitude fetch timeout, raw response text checksum, and malformed JSON conversion in `src/modules/metric-sources/amplitude/amplitude.client.ts`
- [x] T051 Add `package.json`/`package-lock.json` Node `>=20.19` engines metadata for built-in `fetch` and current dependency compatibility
- [x] T052 Broaden recursive `rawRef` sensitive-key detection in `src/modules/snapshots/snapshots.repository.ts`
- [x] T053 Run focused review-hardening tests: `npm test -- --runInBand common/time/kst-date.spec.ts modules/metric-sources/amplitude/amplitude-query-spec.spec.ts modules/metric-sources/amplitude/amplitude-metric-source.adapter.spec.ts modules/metric-sources/amplitude/amplitude.client.spec.ts modules/snapshots/snapshots.repository.spec.ts`
- [x] T054 Run full test/build/lint verification: `npm test -- --runInBand`, `npm run build`, `npm run lint`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1**: No dependencies; directory setup can start immediately.
- **Phase 2**: Depends on Phase 1; blocks all user stories.
- **Phase 3 (US1)**: Depends on Phase 2; MVP scope.
- **Phase 4 (US2)**: Depends on Phase 2 and can be built with mocked `MetricCollectionSuccess`, but final integration benefits from US1 types.
- **Phase 5 (US3)**: Depends on US1 and US2 file scaffolding because it extends the same adapter and snapshot files with failure behavior.
- **Phase 6**: Depends on selected user stories being complete.

### User Story Dependencies

- **US1 (P1)**: Can start after foundational contracts are complete. Delivers the MVP adapter boundary.
- **US2 (P2)**: Can start after foundational contracts are complete. Uses mocked successful collection results and does not need real Amplitude.
- **US3 (P3)**: Should follow US1 and US2 because it extends their files with failure handling and persistence skip behavior.

### Within Each User Story

- Write `.spec.ts` tests first and confirm they fail before implementation.
- Keep external Amplitude calls mocked through the injected fetch/client boundary.
- Keep Prisma mocked in repository and service tests.
- Complete each story checkpoint before moving to the next priority unless parallel work is intentionally coordinated.

---

## Parallel Execution Examples

### User Story 1

```text
Task: T016 Add valid querySpec parser tests in src/modules/metric-sources/amplitude/amplitude-query-spec.spec.ts
Task: T017 Add Amplitude client success tests in src/modules/metric-sources/amplitude/amplitude.client.spec.ts
Task: T018 Add adapter success tests in src/modules/metric-sources/amplitude/amplitude-metric-source.adapter.spec.ts
```

### User Story 2

```text
Task: T024 Add repository persistence tests in src/modules/snapshots/snapshots.repository.spec.ts
Task: T025 Add service success delegation tests in src/modules/snapshots/snapshots.service.spec.ts
```

### User Story 3

```text
Task: T030 Add unsupported querySpec tests in src/modules/metric-sources/amplitude/amplitude-query-spec.spec.ts
Task: T031 Add client failure tests in src/modules/metric-sources/amplitude/amplitude.client.spec.ts
Task: T032 Add adapter failure tests in src/modules/metric-sources/amplitude/amplitude-metric-source.adapter.spec.ts
Task: T033 Add snapshot failed-result skip tests in src/modules/snapshots/snapshots.service.spec.ts
Task: T034 Add sensitive rawRef rejection tests in src/modules/snapshots/snapshots.repository.spec.ts
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1 setup.
2. Complete Phase 2 foundational contracts, config validation, and KST helper.
3. Complete Phase 3 User Story 1.
4. Stop and validate the adapter boundary with focused tests.

### Incremental Delivery

1. Add US1 to prove Amplitude collection can be isolated and transformed.
2. Add US2 to persist successful collection results through the existing Prisma model.
3. Add US3 to make failures explicit, safe, and non-persistent.
4. Run full verification after module wiring.

### Parallel Team Strategy

1. One engineer completes Phase 2 contracts.
2. After contracts compile, US1 test files and US2 test files can be drafted in parallel.
3. US3 should wait until the base adapter and snapshot files exist, then extend failure handling.

---

## Coverage Summary

- **US1 tasks**: T016-T023
- **US2 tasks**: T024-T029
- **US3 tasks**: T030-T040
- **MVP scope**: Phase 1, Phase 2, and Phase 3
- **Parallel opportunities**: T001-T006, T007/T010-T013, T016-T018, T024-T025, T030-T034
- **Format validation**: All implementation tasks use the required `- [ ] T### [P?] [US?] Description with file path` checklist format.
