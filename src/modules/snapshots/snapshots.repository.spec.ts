import { MetricSnapshot } from '../../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { MetricCollectionSuccess } from '../metric-sources/core/metric-collection.types';
import { SnapshotsRepository } from './snapshots.repository';

jest.mock('../prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

describe('SnapshotsRepository', () => {
  const successResult: MetricCollectionSuccess = {
    status: 'success',
    metricDefinitionId: 'metric-definition-id',
    metricKey: 'timer_started',
    source: 'AMPLITUDE',
    periodType: 'WEEKLY',
    periodKey: '2026-W17',
    periodStart: new Date('2026-04-19T15:00:00.000Z'),
    periodEnd: new Date('2026-04-26T15:00:00.000Z'),
    segmentKey: 'ALL',
    segmentValue: 'ALL',
    value: 12,
    sampleSize: 12,
    querySpecVersion: 1,
    rawRef: {
      version: 1,
      source: 'AMPLITUDE',
      endpoint: '/api/2/events/segmentation',
      responseChecksum: 'sha256:abc123',
    },
  };

  function createSnapshot(overrides: Partial<MetricSnapshot> = {}) {
    return {
      id: 'snapshot-id',
      metricDefinitionId: successResult.metricDefinitionId,
      source: successResult.source,
      periodType: successResult.periodType,
      periodKey: successResult.periodKey,
      periodStart: successResult.periodStart,
      periodEnd: successResult.periodEnd,
      segmentKey: successResult.segmentKey,
      segmentValue: successResult.segmentValue,
      value: successResult.value as unknown as MetricSnapshot['value'],
      sampleSize: successResult.sampleSize,
      querySpecVersion: successResult.querySpecVersion,
      rawRef: successResult.rawRef,
      collectedAt: new Date('2026-04-27T00:00:00.000Z'),
      ...overrides,
    } satisfies MetricSnapshot;
  }

  function createRepository(snapshot = createSnapshot()) {
    const upsertMock = jest.fn().mockResolvedValue(snapshot);
    const prismaService = {
      metricSnapshot: {
        upsert: upsertMock,
      },
    } as unknown as PrismaService;

    return {
      prismaService,
      repository: new SnapshotsRepository(prismaService),
      upsertMock,
    };
  }

  test('성공 수집 결과를 metric_snapshots에 upsert한다', async () => {
    const snapshot = createSnapshot();
    const { repository, upsertMock } = createRepository(snapshot);

    const result = await repository.upsertCollectionSuccess(successResult);

    expect(result).toBe(snapshot);
    expect(upsertMock).toHaveBeenCalledWith({
      where: {
        metricDefinitionId_periodType_periodKey_segmentKey_segmentValue: {
          metricDefinitionId: successResult.metricDefinitionId,
          periodType: successResult.periodType,
          periodKey: successResult.periodKey,
          segmentKey: successResult.segmentKey,
          segmentValue: successResult.segmentValue,
        },
      },
      update: {},
      create: {
        metricDefinitionId: successResult.metricDefinitionId,
        source: successResult.source,
        periodType: successResult.periodType,
        periodKey: successResult.periodKey,
        periodStart: successResult.periodStart,
        periodEnd: successResult.periodEnd,
        segmentKey: successResult.segmentKey,
        segmentValue: successResult.segmentValue,
        value: successResult.value,
        sampleSize: successResult.sampleSize,
        querySpecVersion: successResult.querySpecVersion,
        rawRef: successResult.rawRef,
      },
    });
  });

  test('0값 성공 수집 결과도 저장한다', async () => {
    const { repository, upsertMock } = createRepository(
      createSnapshot({ value: 0 as unknown as MetricSnapshot['value'] }),
    );
    const zeroResult: MetricCollectionSuccess = {
      ...successResult,
      value: 0,
      sampleSize: 0,
    };

    await repository.upsertCollectionSuccess(zeroResult);

    expect(upsertMock).toHaveBeenCalledWith({
      where: {
        metricDefinitionId_periodType_periodKey_segmentKey_segmentValue: {
          metricDefinitionId: zeroResult.metricDefinitionId,
          periodType: zeroResult.periodType,
          periodKey: zeroResult.periodKey,
          segmentKey: zeroResult.segmentKey,
          segmentValue: zeroResult.segmentValue,
        },
      },
      update: {},
      create: {
        metricDefinitionId: zeroResult.metricDefinitionId,
        source: zeroResult.source,
        periodType: zeroResult.periodType,
        periodKey: zeroResult.periodKey,
        periodStart: zeroResult.periodStart,
        periodEnd: zeroResult.periodEnd,
        segmentKey: zeroResult.segmentKey,
        segmentValue: zeroResult.segmentValue,
        value: 0,
        sampleSize: 0,
        querySpecVersion: zeroResult.querySpecVersion,
        rawRef: zeroResult.rawRef,
      },
    });
  });

  test('rawRef에 민감정보가 있으면 저장 전에 실패한다', async () => {
    const { repository, upsertMock } = createRepository();
    const unsafeResult: MetricCollectionSuccess = {
      ...successResult,
      rawRef: {
        ...successResult.rawRef,
        Authorization: 'Basic secret',
      } as unknown as MetricCollectionSuccess['rawRef'],
    };

    await expect(
      repository.upsertCollectionSuccess(unsafeResult),
    ).rejects.toThrow('rawRef contains sensitive data');
    expect(upsertMock).not.toHaveBeenCalled();
  });
});
