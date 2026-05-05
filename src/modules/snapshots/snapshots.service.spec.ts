import { MetricSnapshot } from '../../generated/prisma/client';
import {
  MetricCollectionFailure,
  MetricCollectionSuccess,
} from '../metric-sources/core/metric-collection.types';
import { SnapshotsRepository } from './snapshots.repository';
import { SnapshotsService } from './snapshots.service';

jest.mock('../prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

describe('SnapshotsService', () => {
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

  test('성공 수집 결과를 repository에 위임하고 saved를 반환한다', async () => {
    const snapshot = {
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
    } satisfies MetricSnapshot;
    const upsertCollectionSuccessMock = jest.fn().mockResolvedValue(snapshot);
    const repository = {
      upsertCollectionSuccess: upsertCollectionSuccessMock,
    } as unknown as jest.Mocked<SnapshotsRepository>;
    const service = new SnapshotsService(repository);

    const result = await service.saveCollectionResult(successResult);

    expect(upsertCollectionSuccessMock).toHaveBeenCalledWith(successResult);
    expect(result).toEqual({ status: 'saved', snapshot });
  });

  test('실패 수집 결과는 저장하지 않고 skipped를 반환한다', async () => {
    const failureResult: MetricCollectionFailure = {
      status: 'failed',
      metricDefinitionId: successResult.metricDefinitionId,
      metricKey: successResult.metricKey,
      source: 'AMPLITUDE',
      periodType: successResult.periodType,
      periodKey: successResult.periodKey,
      reasonCode: 'AMPLITUDE_API_ERROR',
      message: 'Amplitude API request failed',
    };
    const upsertCollectionSuccessMock = jest.fn();
    const repository = {
      upsertCollectionSuccess: upsertCollectionSuccessMock,
    } as unknown as jest.Mocked<SnapshotsRepository>;
    const service = new SnapshotsService(repository);

    const result = await service.saveCollectionResult(failureResult);

    expect(upsertCollectionSuccessMock).not.toHaveBeenCalled();
    expect(result).toEqual({
      status: 'skipped',
      reason: 'COLLECTION_FAILED',
    });
  });
});
