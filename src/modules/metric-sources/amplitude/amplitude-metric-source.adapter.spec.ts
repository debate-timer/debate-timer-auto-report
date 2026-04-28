import { MetricDefinition } from '../../../generated/prisma/client';
import { MetricCollectionPeriod } from '../core/metric-collection.types';
import {
  AmplitudeClient,
  AmplitudeSegmentationResult,
} from './amplitude.client';
import { AmplitudeMetricSourceAdapter } from './amplitude-metric-source.adapter';

describe('AmplitudeMetricSourceAdapter', () => {
  const period: MetricCollectionPeriod = {
    periodType: 'WEEKLY',
    periodKey: '2026-W17',
    periodStart: new Date('2026-04-19T15:00:00.000Z'),
    periodEnd: new Date('2026-04-26T15:00:00.000Z'),
  };

  const definition: MetricDefinition = {
    id: 'metric-definition-id',
    key: 'timer_started',
    name: 'Timer Started',
    description: null,
    source: 'AMPLITUDE',
    unit: 'COUNT',
    querySpec: {
      version: 1,
      source: 'AMPLITUDE',
      kind: 'EVENT_COUNT',
      eventType: 'timer_started',
      aggregation: 'EVENT_COUNT',
      filters: [],
      groupBy: [],
    },
    querySpecVersion: 1,
    direction: 'HIGHER_IS_BETTER',
    minSampleSize: 0,
    warningRule: null,
    isActive: true,
    createdAt: new Date('2026-04-01T00:00:00.000Z'),
    updatedAt: new Date('2026-04-01T00:00:00.000Z'),
  };

  const rawRef: AmplitudeSegmentationResult['rawRef'] = {
    version: 1,
    source: 'AMPLITUDE',
    endpoint: '/api/2/events/segmentation',
    responseChecksum: 'sha256:abc123',
  };

  function createClientMock(
    result: AmplitudeSegmentationResult,
  ): jest.Mocked<AmplitudeClient> {
    return {
      fetchEventSegmentation: jest.fn().mockResolvedValue(result),
    } as unknown as jest.Mocked<AmplitudeClient>;
  }

  function createRejectingClientMock(
    error: Error,
  ): jest.Mocked<AmplitudeClient> {
    return {
      fetchEventSegmentation: jest.fn().mockRejectedValue(error),
    } as unknown as jest.Mocked<AmplitudeClient>;
  }

  test('WEEKLY timer_started 수집 성공 결과를 반환한다', async () => {
    const client = createClientMock({
      body: { data: { seriesCollapsed: [[{ value: 12 }]] } },
      rawRef,
    });
    const adapter = new AmplitudeMetricSourceAdapter(client);

    const result = await adapter.collect(definition, period);

    expect(result).toEqual({
      status: 'success',
      metricDefinitionId: definition.id,
      metricKey: definition.key,
      source: 'AMPLITUDE',
      periodType: period.periodType,
      periodKey: period.periodKey,
      periodStart: period.periodStart,
      periodEnd: period.periodEnd,
      segmentKey: 'ALL',
      segmentValue: 'ALL',
      value: 12,
      sampleSize: 12,
      querySpecVersion: definition.querySpecVersion,
      rawRef,
    });
    expect(client.fetchEventSegmentation.mock.calls).toEqual([
      [
        {
          eventType: 'timer_started',
          startDate: '20260420',
          endDate: '20260426',
        },
      ],
    ]);
  });

  test('성공 응답의 빈 결과는 0 스냅샷 후보로 변환한다', async () => {
    const client = createClientMock({
      body: { data: { seriesCollapsed: [] } },
      rawRef,
    });
    const adapter = new AmplitudeMetricSourceAdapter(client);

    const result = await adapter.collect(definition, period);

    expect(result).toMatchObject({
      status: 'success',
      value: 0,
      sampleSize: 0,
    });
  });

  test('MONTHLY 기간 타입은 Amplitude 호출 없이 실패 처리한다', async () => {
    const client = createClientMock({
      body: { data: { seriesCollapsed: [[{ value: 12 }]] } },
      rawRef,
    });
    const adapter = new AmplitudeMetricSourceAdapter(client);

    const result = await adapter.collect(definition, {
      ...period,
      periodType: 'MONTHLY',
      periodKey: '2026-04',
    });

    expect(result).toMatchObject({
      status: 'failed',
      reasonCode: 'UNSUPPORTED_PERIOD_TYPE',
      metricDefinitionId: definition.id,
      metricKey: definition.key,
      periodType: 'MONTHLY',
      periodKey: '2026-04',
    });
    expect(client.fetchEventSegmentation.mock.calls).toHaveLength(0);
  });

  test('형식이 잘못된 응답은 실패 처리한다', async () => {
    const client = createClientMock({
      body: { data: { seriesCollapsed: [[{ value: 'not-a-number' }]] } },
      rawRef,
    } as unknown as AmplitudeSegmentationResult);
    const adapter = new AmplitudeMetricSourceAdapter(client);

    const result = await adapter.collect(definition, period);

    expect(result).toMatchObject({
      status: 'failed',
      reasonCode: 'AMPLITUDE_RESPONSE_INVALID',
    });
  });

  test('Amplitude API 오류는 지표 실패 결과로 변환한다', async () => {
    const client = createRejectingClientMock(
      Object.assign(new Error('Amplitude API request failed with status 429'), {
        status: 429,
      }),
    );
    const adapter = new AmplitudeMetricSourceAdapter(client);

    const result = await adapter.collect(definition, period);

    expect(result).toMatchObject({
      status: 'failed',
      reasonCode: 'AMPLITUDE_API_ERROR',
    });

    if (result.status !== 'failed') {
      throw new Error('Expected failed result');
    }

    expect(result.message).toContain('429');
  });

  test('실패 결과와 로그에 민감정보를 남기지 않는다', async () => {
    const consoleErrorSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
    const consoleWarnSpy = jest
      .spyOn(console, 'warn')
      .mockImplementation(() => undefined);
    const secretText =
      'api-key secret-key Authorization https://discord.com/api/webhooks/1/token';
    const client = createRejectingClientMock(new Error(secretText));
    const adapter = new AmplitudeMetricSourceAdapter(client);

    const result = await adapter.collect(definition, period);
    const resultText = JSON.stringify(result);
    const loggedText = [
      ...consoleErrorSpy.mock.calls,
      ...consoleWarnSpy.mock.calls,
    ]
      .flat()
      .join(' ');

    expect(result).toMatchObject({
      status: 'failed',
      reasonCode: 'AMPLITUDE_API_ERROR',
    });
    expect(resultText).not.toContain('api-key');
    expect(resultText).not.toContain('secret-key');
    expect(resultText).not.toContain('Authorization');
    expect(resultText).not.toContain('https://discord.com/api/webhooks');
    expect(loggedText).not.toContain('api-key');
    expect(loggedText).not.toContain('secret-key');
    expect(loggedText).not.toContain('Authorization');
    expect(loggedText).not.toContain('https://discord.com/api/webhooks');

    consoleErrorSpy.mockRestore();
    consoleWarnSpy.mockRestore();
  });
});
