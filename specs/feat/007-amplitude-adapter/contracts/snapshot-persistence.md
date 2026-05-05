# Contract: Snapshot Persistence

**Source files**:

- `src/modules/snapshots/snapshots.repository.ts`
- `src/modules/snapshots/snapshots.service.ts`

## Service Interface

```typescript
import { MetricSnapshot } from '../../generated/prisma/client';
import {
  MetricCollectionResult,
  MetricCollectionSuccess,
} from '../metric-sources/core/metric-collection.types';

export type SaveCollectionResultOutcome =
  | { status: 'saved'; snapshot: MetricSnapshot }
  | { status: 'skipped'; reason: 'COLLECTION_FAILED' };

export class SnapshotsService {
  saveCollectionResult(
    result: MetricCollectionResult,
  ): Promise<SaveCollectionResultOutcome>;
}
```

## Repository Interface

```typescript
import { MetricSnapshot } from '../../generated/prisma/client';
import { MetricCollectionSuccess } from '../metric-sources/core/metric-collection.types';

export class SnapshotsRepository {
  upsertCollectionSuccess(
    result: MetricCollectionSuccess,
  ): Promise<MetricSnapshot>;
}
```

## Persistence Rules

- Only `MetricCollectionSuccess` is persisted.
- `MetricCollectionFailure` returns `{ status: 'skipped', reason: 'COLLECTION_FAILED' }`.
- Duplicate identity is:

```text
metricDefinitionId + periodType + periodKey + segmentKey + segmentValue
```

- Duplicate writes are no-op updates. Existing `value`, `sampleSize`, `rawRef`, and `collectedAt` remain unchanged.
- `rawRef` is persisted only after verifying it does not contain `apiKey`, `secretKey`, `authorization`, or `Authorization` keys.

## Prisma Operation Shape

```typescript
prisma.metricSnapshot.upsert({
  where: {
    metricDefinitionId_periodType_periodKey_segmentKey_segmentValue: {
      metricDefinitionId: result.metricDefinitionId,
      periodType: result.periodType,
      periodKey: result.periodKey,
      segmentKey: result.segmentKey,
      segmentValue: result.segmentValue,
    },
  },
  update: {},
  create: {
    metricDefinitionId: result.metricDefinitionId,
    source: result.source,
    periodType: result.periodType,
    periodKey: result.periodKey,
    periodStart: result.periodStart,
    periodEnd: result.periodEnd,
    segmentKey: result.segmentKey,
    segmentValue: result.segmentValue,
    value: result.value,
    sampleSize: result.sampleSize,
    querySpecVersion: result.querySpecVersion,
    rawRef: result.rawRef,
  },
});
```
