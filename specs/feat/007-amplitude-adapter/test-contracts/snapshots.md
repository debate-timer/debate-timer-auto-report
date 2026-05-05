# Test Contract: Snapshots Module

**Files**:

- `src/modules/snapshots/snapshots.repository.spec.ts`
- `src/modules/snapshots/snapshots.service.spec.ts`

**Test targets**:

- `src/modules/snapshots/snapshots.repository.ts`
- `src/modules/snapshots/snapshots.service.ts`

## describe: `SnapshotsRepository`

### test: `성공 수집 결과를 metric_snapshots에 upsert한다`

- Setup:
  - mocked `PrismaService.metricSnapshot.upsert`
  - `MetricCollectionSuccess` with `value=12`, `sampleSize=12`
- Expected:
  - `upsert.where.metricDefinitionId_periodType_periodKey_segmentKey_segmentValue` uses metric id, period type, period key, `ALL`, `ALL`
  - `upsert.create` maps every success result field to the corresponding snapshot field
  - `upsert.update` is `{}`

### test: `0값 성공 수집 결과도 저장한다`

- Setup:
  - `MetricCollectionSuccess` with `value=0`, `sampleSize=0`
- Expected:
  - `upsert.create.value` is `0`
  - `upsert.create.sampleSize` is `0`

### test: `rawRef에 민감정보가 있으면 저장 전에 실패한다`

- Setup:
  - `rawRef` includes `Authorization` or `apiKey`
- Expected:
  - repository rejects with a safe error
  - `PrismaService.metricSnapshot.upsert` is not called

### test: `rawRef 민감정보 key 변형도 저장 전에 실패한다`

- Setup:
  - `rawRef` includes nested key variants such as `api_key`, `accessToken`, `refresh-token`, or `password`
- Expected:
  - repository rejects with a safe error
  - `PrismaService.metricSnapshot.upsert` is not called

## describe: `SnapshotsService`

### test: `성공 수집 결과를 repository에 위임하고 saved를 반환한다`

- Setup:
  - repository mock resolves a snapshot
  - input result status is `success`
- Expected:
  - repository called once
  - service returns `{ status: 'saved', snapshot }`

### test: `실패 수집 결과는 저장하지 않고 skipped를 반환한다`

- Setup:
  - repository mock
  - input result status is `failed`
- Expected:
  - repository is not called
  - service returns `{ status: 'skipped', reason: 'COLLECTION_FAILED' }`

## Mock Strategy

- Mock `PrismaService` in repository tests.
- Mock `SnapshotsRepository` in service tests.
- Do not use a real database in unit tests.
