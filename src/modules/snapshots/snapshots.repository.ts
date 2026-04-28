import { Injectable } from '@nestjs/common';
import type { MetricSnapshot } from '../../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { MetricCollectionSuccess } from '../metric-sources/core/metric-collection.types';

/** 성공한 지표 수집 결과를 MetricSnapshot 테이블에 저장하는 repository입니다. */
@Injectable()
export class SnapshotsRepository {
  constructor(private readonly prismaService: PrismaService) {}

  /** 성공 수집 결과를 compound unique key 기준으로 upsert합니다. */
  async upsertCollectionSuccess(
    result: MetricCollectionSuccess,
  ): Promise<MetricSnapshot> {
    // rawRef는 DB에 저장되는 JSON이므로, Prisma 호출 직전에 민감한 key가 없는지
    // 한 번 더 확인합니다. 외부 API 계층의 실수를 저장 계층에서 막기 위한 방어선입니다.
    assertRawRefDoesNotContainSensitiveKeys(result.rawRef);

    return this.prismaService.metricSnapshot.upsert({
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
  }
}

/** rawRef 전체를 검사해 credential 계열 key가 있으면 저장을 중단합니다. */
function assertRawRefDoesNotContainSensitiveKeys(value: unknown): void {
  const sensitiveKeys = new Set(['apikey', 'secretkey', 'authorization']);

  if (!containsSensitiveKey(value, sensitiveKeys)) {
    return;
  }

  throw new Error('rawRef contains sensitive data');
}

/**
 * object/array를 재귀적으로 순회하면서 민감한 key 이름이 있는지 찾습니다.
 * 값이 아니라 key를 보는 이유는 credential이 보통 Authorization, apiKey 같은 이름으로 들어오기 때문입니다.
 */
function containsSensitiveKey(
  value: unknown,
  sensitiveKeys: Set<string>,
): boolean {
  if (Array.isArray(value)) {
    return value.some((item) => containsSensitiveKey(item, sensitiveKeys));
  }

  if (typeof value !== 'object' || value === null) {
    return false;
  }

  return Object.entries(value).some(([key, nestedValue]) => {
    if (sensitiveKeys.has(key.toLowerCase())) {
      return true;
    }

    return containsSensitiveKey(nestedValue, sensitiveKeys);
  });
}
