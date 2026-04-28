import { Injectable } from '@nestjs/common';
import { MetricDefinition } from '../../../generated/prisma/client';
import {
  MetricCollectionFailure,
  MetricCollectionPeriod,
  MetricCollectionResult,
} from '../core/metric-collection.types';
import { MetricSourceAdapter } from '../core/metric-source-adapter';
import {
  formatAmplitudeEndDateFromExclusiveEnd,
  formatKstDate,
} from '../../../common/time/kst-date';
import { AmplitudeClient } from './amplitude.client';
import { parseAmplitudeEventCountQuerySpec } from './amplitude-query-spec';

@Injectable()
export class AmplitudeMetricSourceAdapter implements MetricSourceAdapter {
  constructor(private readonly amplitudeClient: AmplitudeClient) {}

  async collect(
    definition: MetricDefinition,
    period: MetricCollectionPeriod,
  ): Promise<MetricCollectionResult> {
    // Phase 1-2는 WEEKLY만 지원합니다. MONTHLY는 Phase 1-3 확장 지점이므로
    // Amplitude를 호출하지 않고 지표 단위 실패로 반환합니다.
    if (period.periodType !== 'WEEKLY') {
      return createFailure(definition, period, {
        reasonCode: 'UNSUPPORTED_PERIOD_TYPE',
        message: `Unsupported period type: ${period.periodType}`,
      });
    }

    let querySpec: ReturnType<typeof parseAmplitudeEventCountQuerySpec>;

    try {
      // DB의 querySpec JSON을 Amplitude 호출에 필요한 eventType으로 좁힙니다.
      querySpec = parseAmplitudeEventCountQuerySpec(definition.querySpec);
    } catch {
      return createFailure(definition, period, {
        reasonCode: 'UNSUPPORTED_QUERY_SPEC',
        message: 'Unsupported Amplitude querySpec',
      });
    }

    let segmentationResult: Awaited<
      ReturnType<AmplitudeClient['fetchEventSegmentation']>
    >;

    try {
      // Adapter는 기간을 KST 날짜 문자열로 바꾸고, 실제 HTTP 세부사항은 client에 위임합니다.
      segmentationResult = await this.amplitudeClient.fetchEventSegmentation({
        eventType: querySpec.eventType,
        startDate: formatKstDate(period.periodStart),
        endDate: formatAmplitudeEndDateFromExclusiveEnd(period.periodEnd),
      });
    } catch (error) {
      return createFailure(definition, period, {
        reasonCode: 'AMPLITUDE_API_ERROR',
        message: createSafeAmplitudeErrorMessage(error),
      });
    }

    const extraction = extractEventCount(segmentationResult.body);

    // Amplitude 응답이 성공이어도 숫자 total을 읽을 수 없으면 저장하면 안 됩니다.
    if (!extraction.isValid) {
      return createFailure(definition, period, {
        reasonCode: 'AMPLITUDE_RESPONSE_INVALID',
        message: 'Amplitude response did not contain a valid event count',
      });
    }

    return {
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
      value: extraction.value,
      sampleSize: extraction.value,
      querySpecVersion: definition.querySpecVersion,
      rawRef: segmentationResult.rawRef,
    };
  }
}

/** 여러 실패 경로를 같은 MetricCollectionFailure 모양으로 맞춰 반환합니다. */
function createFailure(
  definition: MetricDefinition,
  period: MetricCollectionPeriod,
  failure: Pick<MetricCollectionFailure, 'reasonCode' | 'message'>,
): MetricCollectionFailure {
  return {
    status: 'failed',
    metricDefinitionId: definition.id,
    metricKey: definition.key,
    source: 'AMPLITUDE',
    periodType: period.periodType,
    periodKey: period.periodKey,
    reasonCode: failure.reasonCode,
    message: failure.message,
  };
}

/** client error에서 credential 없이 호출자에게 보여줄 안전한 실패 메시지를 만듭니다. */
function createSafeAmplitudeErrorMessage(error: unknown): string {
  if (
    typeof error === 'object' &&
    error !== null &&
    'status' in error &&
    typeof error.status === 'number'
  ) {
    return `Amplitude API request failed with status ${error.status}`;
  }

  return 'Amplitude API request failed';
}

/**
 * Amplitude의 성공 응답에서 전체 기간 이벤트 수를 꺼냅니다.
 *
 * - seriesCollapsed가 비어 있으면 "성공했지만 이벤트 0건"으로 봅니다.
 * - value가 숫자가 아니면 잘못된 응답이므로 실패로 봅니다.
 */
function extractEventCount(body: {
  data?: { seriesCollapsed?: unknown };
}): { isValid: true; value: number } | { isValid: false } {
  const seriesCollapsed = body.data?.seriesCollapsed;

  if (!isUnknownArray(seriesCollapsed) || seriesCollapsed.length === 0) {
    return { isValid: true, value: 0 };
  }

  const firstSeries = seriesCollapsed[0];

  if (!isUnknownArray(firstSeries) || firstSeries.length === 0) {
    return { isValid: true, value: 0 };
  }

  const firstValue = firstSeries[0];

  if (
    isRecord(firstValue) &&
    typeof firstValue.value === 'number' &&
    Number.isFinite(firstValue.value)
  ) {
    return { isValid: true, value: firstValue.value };
  }

  return { isValid: false };
}

/** unknown 값이 배열인지 확인해 배열 index 접근을 안전하게 만듭니다. */
function isUnknownArray(value: unknown): value is unknown[] {
  return Array.isArray(value);
}

/** unknown 값이 key-value object인지 확인해 value 속성 접근을 안전하게 만듭니다. */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
