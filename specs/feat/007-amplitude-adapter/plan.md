# Phase 1-2 Amplitude Adapter 구현 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Amplitude에서 `timer_started` 주간 이벤트 카운트 1개를 조회하고, 성공 결과를 `metric_snapshots`에 중복 없이 저장한다.

**Architecture:** 외부 원천 조회와 저장을 분리한다. `metric-sources`는 Amplitude Dashboard REST API 호출과 표준 수집 결과 변환만 담당하고, `snapshots`는 성공 수집 결과의 Prisma 저장만 담당한다. Phase 1-3 실행 파이프라인은 이 두 모듈을 조합해 수동 실행, cron, Discord 전송을 붙일 수 있다.

**Tech Stack:** TypeScript 5, NestJS 11, Prisma 7, PostgreSQL, Jest, `@nestjs/testing`, Node.js built-in `fetch`, `crypto`.

---

**Branch**: `feat/#7` | **Date**: 2026-04-27 | **Spec**: [spec.md](./spec.md)  
**Input**: Feature specification from `/specs/feat/007-amplitude-adapter/spec.md`

> Note: The `.specify` scripts resolve the issue-only branch name `feat/#7` to `specs/feat/007-amplitude-adapter/`. Slugged branch names such as `feat/#7-amplitude-adapter` remain supported for compatibility.

## Summary

Phase 1-2 adds the first real metric collection path: `timer_started` weekly event count from Amplitude, transformed into a standard `MetricCollectionResult`, then persisted as a `MetricSnapshot`. The scope remains intentionally thin: only `WEEKLY`, only `timer_started`, only `ALL` segment, no execution API, no scheduler, no Discord, no report run state.

## Technical Context

**Language/Version**: TypeScript 5 strict mode (`noImplicitAny`, `strictNullChecks`)  
**Primary Dependencies**: NestJS 11, Prisma 7 generated client, `@nestjs/config`, `@prisma/adapter-pg`, Node.js built-in `fetch`, Node.js `crypto`  
**Storage**: Existing PostgreSQL schema through Prisma (`MetricDefinition`, `MetricSnapshot`)  
**Testing**: Jest 30 + `@nestjs/testing`; external Amplitude API and Prisma are mocked in unit tests  
**Target Platform**: Node.js LTS service, local development first, Linux/Docker later  
**Project Type**: NestJS backend single project  
**Performance Goals**: One Amplitude call per `timer_started` weekly collection; no retry loop in Phase 1-2  
**Constraints**: No new DB tables, no external API call in tests, no credential persistence, `MONTHLY` rejected until Phase 1-3  
**Configuration**: Existing config validation must require `TZ=Asia/Seoul` so runtime period handling follows the project time policy  
**Scale/Scope**: One active metric, one weekly period, one whole-project segment

## Constitution Check

| Gate | Status | Notes |
|------|--------|-------|
| `nestjs-best-practices` referenced before design | PASS | Applied feature modules, DI tokens, repository pattern, external-service mocking, async error handling. |
| Layered module architecture | PASS | `metric-sources/` handles external collection; `snapshots/` handles persistence. |
| Module files first in implementation order | PASS | `MetricSourcesModule` and `SnapshotsModule` are introduced before providers are wired into `AppModule`. |
| Repository pattern for data access | PASS | `SnapshotsRepository` encapsulates Prisma `MetricSnapshot` writes. |
| Interface DI token | PASS | `METRIC_SOURCE_ADAPTER` token represents the `MetricSourceAdapter` interface at runtime. |
| TDD Red-Green-Refactor | PASS | Test contracts require `.spec.ts` before implementation. |
| Korean test descriptions | PASS | Test contract examples use Korean `describe` and `test` names. |
| External API isolation in tests | PASS | Amplitude `fetch` is injected/mocked; tests never call real Amplitude. |
| Sensitive data protection | PASS | `rawRef` stores endpoint/checksum/request id only; auth headers and keys are excluded. |
| Asia/Seoul time policy | PASS | `common/time/kst-date.ts` formats KST dates from UTC period boundaries, and config validation requires `TZ=Asia/Seoul`. |

## Project Structure

### Documentation

```text
specs/feat/007-amplitude-adapter/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── contracts/
│   ├── metric-source-adapter.md
│   └── snapshot-persistence.md
└── test-contracts/
    ├── amplitude-adapter.md
    ├── amplitude-client.md
    ├── kst-date.md
    └── snapshots.md
```

### Source Code

```text
src/
├── common/
│   └── time/
│       ├── kst-date.ts
│       └── kst-date.spec.ts
├── modules/
│   ├── config/
│   │   ├── config.schema.ts
│   │   └── config.schema.spec.ts
│   ├── metric-sources/
│   │   ├── metric-sources.module.ts
│   │   ├── core/
│   │   │   ├── metric-collection.types.ts
│   │   │   ├── metric-source-adapter.ts
│   │   │   └── metric-source.tokens.ts
│   │   └── amplitude/
│   │       ├── amplitude.client.ts
│   │       ├── amplitude.client.spec.ts
│   │       ├── amplitude-query-spec.ts
│   │       ├── amplitude-query-spec.spec.ts
│   │       ├── amplitude-metric-source.adapter.ts
│   │       └── amplitude-metric-source.adapter.spec.ts
│   └── snapshots/
│       ├── snapshots.module.ts
│       ├── snapshots.repository.ts
│       ├── snapshots.repository.spec.ts
│       ├── snapshots.service.ts
│       └── snapshots.service.spec.ts
└── app.module.ts
```

**Structure Decision**: Follow the existing `src/modules/{domain}/` pattern. `common/time` is added because KST date conversion is shared infrastructure, not Amplitude-specific behavior. The existing config schema is updated because `TZ=Asia/Seoul` is a process-level operational requirement.

## Phase 0: Research Findings

See [research.md](./research.md). Key decisions:

- Use Amplitude Dashboard REST API Event Segmentation endpoint `GET /api/2/events/segmentation`.
- Use Basic auth from `AMPLITUDE_API_KEY` and `AMPLITUDE_SECRET_KEY`.
- Query `timer_started` with `m=totals` and weekly interval `i=7`.
- Treat empty successful Amplitude response as `0`.
- Use no-op duplicate snapshot persistence to preserve the first collected value for a period.
- Add no new runtime dependency; inject `fetch` for testability.

## Phase 1: Design Artifacts

- [data-model.md](./data-model.md): standard collection result types, Amplitude response shape, snapshot persistence mapping.
- [contracts/metric-source-adapter.md](./contracts/metric-source-adapter.md): internal adapter contract for Phase 1-2 and Phase 1-3 reuse.
- [contracts/snapshot-persistence.md](./contracts/snapshot-persistence.md): persistence contract for successful collection results.
- [test-contracts/](./test-contracts): TDD behavior lists and mock strategies.

## Architecture Decision Table

| Decision | Options Considered | Chosen | Rationale | Testability Impact |
|----------|-------------------|--------|-----------|--------------------|
| HTTP client | Add Axios, add `@nestjs/axios`, use built-in `fetch` | Built-in `fetch` behind injectable token | Keeps Phase 1-2 small and avoids new dependency for one GET call | Unit tests inject a mocked fetch function. |
| Amplitude endpoint | Events list, Export API, Event Segmentation | Event Segmentation | It supports event totals for a date range and maps directly to `timer_started` count | Fixture-based response transform tests are straightforward. |
| Metric value source | `seriesCollapsed`, sum of `series`, events list totals | `seriesCollapsed[0][0].value`, fallback to `0` only when successful empty response | `seriesCollapsed` is the endpoint's total for the visualization interval; Phase 1-2 needs one total | Tests cover normal, empty, and malformed responses. |
| Duplicate snapshot behavior | Update existing, throw, no-op | No-op | Prevents accidental overwrites during repeated local runs; Phase 1-3 can add force policy if needed | Repository test asserts Prisma `upsert` update is `{}`. |
| DB access location | Adapter writes directly, service writes directly, repository | `SnapshotsRepository` + `SnapshotsService` | Keeps external source code independent from Prisma details | Service tests mock repository; repository tests mock Prisma. |
| Period scope | Weekly only, weekly+monthly, caller-defined | Weekly only with `periodType` preserved | Matches Walking Skeleton while leaving Phase 1-3 monthly extension path | Tests explicitly reject `MONTHLY`. |
| Error model | Throw errors, return nullable result, discriminated union | Discriminated union result | Caller can distinguish success/failure per metric without exceptions for expected failures | Tests assert failure code and no persistence on failure. |
| DI strategy | Concrete class injection only, interface token, abstract class | Symbol token for adapter and fetch | TypeScript interfaces need runtime tokens; external fetch is swappable | Testing module can replace tokens cleanly. |

## TDD Implementation Order

### Step 1: KST date formatter

- RED: `src/common/time/kst-date.spec.ts`
- GREEN: `src/common/time/kst-date.ts`
- Behaviors: KST `YYYYMMDD` formatting, exclusive end date minus one day, no server timezone dependency.

### Step 2: Core collection types and DI tokens

- Files: `metric-collection.types.ts`, `metric-source-adapter.ts`, `metric-source.tokens.ts`
- Tests: Type-only files do not need runtime tests; compile verification happens through dependent specs.
- Behaviors: `MetricCollectionResult` discriminates `success` and `failed`; `periodType` remains present for Phase 1-3.

### Step 2A: Timezone config validation

- RED: `src/modules/config/config.schema.spec.ts`
- GREEN: `src/modules/config/config.schema.ts`
- Behaviors: require `TZ=Asia/Seoul` at application startup, matching the constitution time policy.

### Step 3: Amplitude query spec parser

- RED: `amplitude-query-spec.spec.ts`
- GREEN: `amplitude-query-spec.ts`
- Behaviors: accept Phase 1 seed shape, reject unsupported `source`, `kind`, `aggregation`, filters, and groupBy.

### Step 4: Amplitude HTTP client

- RED: `amplitude.client.spec.ts`
- GREEN: `amplitude.client.ts`
- Behaviors: builds Event Segmentation URL, uses Basic auth without exposing credentials, sends `m=totals`, sends `i=7`, handles non-2xx as safe error, records checksum/request id.

### Step 5: Amplitude adapter

- RED: `amplitude-metric-source.adapter.spec.ts`
- GREEN: `amplitude-metric-source.adapter.ts`
- Behaviors: weekly success result, `MONTHLY` failure without HTTP call, empty success as zero, malformed response failure, API error failure.

### Step 6: Snapshot repository

- RED: `snapshots.repository.spec.ts`
- GREEN: `snapshots.repository.ts`
- Behaviors: Prisma no-op `upsert`, compound unique key use, `rawRef` credential exclusion.

### Step 7: Snapshot service

- RED: `snapshots.service.spec.ts`
- GREEN: `snapshots.service.ts`
- Behaviors: save success result, skip failed result, return persisted/skipped status.

### Step 8: Module wiring

- RED: module registration assertions in provider specs or a focused module spec if needed.
- GREEN: `metric-sources.module.ts`, `snapshots.module.ts`, `app.module.ts` imports.
- Behaviors: modules compile with mocked dependencies; existing config/health/prisma tests keep passing.

### Step 9: Verification

- Run `npm test`.
- Run `npm run lint`.
- Run `npm run build`.
- If local PostgreSQL is available, run an optional manual Prisma-backed smoke check for one successful snapshot save. If DB is unavailable, record the blocker and rely on mocked repository tests for this phase.

## Requirement Coverage

| Requirement | Planned Coverage |
|-------------|------------------|
| FR-001 | Core adapter interface and result types in Step 2 |
| FR-002 | Amplitude adapter in Step 5 |
| FR-003 | Adapter response transform in Step 5 |
| FR-004 | Snapshot service/repository in Steps 6-7 |
| FR-005 | Repository no-op upsert in Step 6 |
| FR-006 | Discriminated failure result in Steps 3-5 and skip persistence in Step 7 |
| FR-007 | Client/adapter rawRef and credential tests in Steps 4-6 |
| FR-008 | Query parser and adapter scope checks in Steps 3 and 5 |
| FR-009 | No controller/scheduler/Discord/report modules in source structure |
| FR-010 | `MONTHLY` rejection test in Step 5 |
| FR-011 | `periodType` preserved in core types and snapshot mapping |
| FR-012 | Empty success as zero in Step 5 and persistence in Step 7 |

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|--------------------------------------|
| Symbol DI token for `MetricSourceAdapter` | Runtime interface injection in NestJS | Direct concrete injection would make Phase 9 Sentry expansion harder to explain and test. |
| Separate `snapshots` module | Persistence boundary for later run pipeline | Letting Amplitude adapter write DB records would couple external API details to Prisma persistence. |

## Next Step

Run `codex:tasks` to break this plan into executable TDD tasks.
