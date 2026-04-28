import { createHash } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MetricSnapshotRawRef } from '../core/metric-collection.types';

/** Amplitude 호출에 사용할 fetch 구현체를 NestJS DI로 교체하기 위한 토큰입니다. */
export const AMPLITUDE_FETCH = Symbol('AMPLITUDE_FETCH');

/** Node.js fetch와 같은 호출 시그니처를 가진 HTTP 함수 타입입니다. */
export type AmplitudeFetch = typeof fetch;

/** Amplitude Event Segmentation API에 전달할 요청 파라미터입니다. */
export type FetchEventSegmentationParams = {
  /** 조회할 Amplitude 이벤트 타입입니다. */
  eventType: 'timer_started';
  /** Amplitude API start 쿼리에 들어가는 KST YYYYMMDD 날짜입니다. */
  startDate: string;
  /** Amplitude API end 쿼리에 들어가는 KST YYYYMMDD 날짜입니다. */
  endDate: string;
};

/** Phase 1-2에서 필요한 Amplitude Event Segmentation 응답 일부입니다. */
export type AmplitudeSegmentationResponse = {
  /** Amplitude 응답의 실제 차트 데이터 컨테이너입니다. */
  data?: {
    /** 기간별 원본 series입니다. Phase 1-2 계산에는 사용하지 않습니다. */
    series?: number[][];
    /** series 라벨 목록입니다. Phase 1-2 계산에는 사용하지 않습니다. */
    seriesLabels?: string[];
    /** 전체 기간 합계가 들어오는 collapsed series입니다. */
    seriesCollapsed?: Array<Array<{ value?: number }>>;
    /** 차트 x축 날짜 값입니다. Phase 1-2 계산에는 사용하지 않습니다. */
    xValues?: string[];
  };
};

/** Amplitude 응답 본문과 안전한 추적 참조를 함께 담은 client 반환 타입입니다. */
export type AmplitudeSegmentationResult = {
  /** Amplitude가 반환한 JSON 응답 본문입니다. */
  body: AmplitudeSegmentationResponse;
  /** credential 없이 저장 가능한 원천 응답 참조입니다. */
  rawRef: MetricSnapshotRawRef;
};

/** Amplitude HTTP 호출 실패를 credential 없이 표현하는 안전한 에러입니다. */
export class AmplitudeApiError extends Error {
  /** Amplitude가 반환한 HTTP status입니다. 네트워크 예외면 없을 수 있습니다. */
  readonly status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = 'AmplitudeApiError';
    this.status = status;
  }

  /** JSON.stringify(error)에서도 status만 남고 credential은 남지 않게 합니다. */
  toJSON() {
    return {
      name: this.name,
      message: this.message,
      status: this.status,
    };
  }
}

@Injectable()
export class AmplitudeClient {
  constructor(
    private readonly configService: ConfigService,
    @Inject(AMPLITUDE_FETCH) private readonly amplitudeFetch: AmplitudeFetch,
  ) {}

  async fetchEventSegmentation(
    params: FetchEventSegmentationParams,
  ): Promise<AmplitudeSegmentationResult> {
    // ConfigService에서 credential을 읽되, 이 값은 Authorization header를 만들 때만 쓰고
    // rawRef, error JSON, snapshot에는 절대 넣지 않습니다.
    const apiKey = this.configService.getOrThrow<string>('AMPLITUDE_API_KEY');
    const secretKey = this.configService.getOrThrow<string>(
      'AMPLITUDE_SECRET_KEY',
    );
    const url = new URL('https://amplitude.com/api/2/events/segmentation');

    // Amplitude Dashboard REST API의 Event Segmentation endpoint는 query string으로
    // 이벤트 타입, 기간, 집계 방식, interval을 받습니다.
    url.searchParams.set('e', JSON.stringify({ event_type: params.eventType }));
    url.searchParams.set('start', params.startDate);
    url.searchParams.set('end', params.endDate);
    url.searchParams.set('m', 'totals');
    url.searchParams.set('i', '7');

    let response: Response;

    try {
      response = await this.amplitudeFetch(url.toString(), {
        method: 'GET',
        headers: {
          Authorization: `Basic ${Buffer.from(
            `${apiKey}:${secretKey}`,
          ).toString('base64')}`,
        },
      });
    } catch (error) {
      // 네트워크 예외 메시지에 credential이나 webhook URL이 섞일 수 있으므로
      // 안전한 문자열로 정리한 뒤 우리 도메인 error로 감쌉니다.
      throw new AmplitudeApiError(
        `Amplitude API request failed: ${sanitizeMessage(
          getErrorMessage(error),
          [apiKey, secretKey],
        )}`,
      );
    }

    if (!response.ok) {
      // non-2xx body는 외부 원문이라 민감정보가 있을 수 있습니다.
      // 그래서 status만 남기고 body는 error message에 넣지 않습니다.
      throw new AmplitudeApiError(
        `Amplitude API request failed with status ${response.status}`,
        response.status,
      );
    }

    const body = (await response.json()) as AmplitudeSegmentationResponse;
    const responseBodyText = JSON.stringify(body);

    return {
      body,
      rawRef: {
        version: 1,
        source: 'AMPLITUDE',
        endpoint: '/api/2/events/segmentation',
        requestId: response.headers.get('x-amplitude-request-id') ?? undefined,
        responseChecksum: `sha256:${createHash('sha256')
          .update(responseBodyText)
          .digest('hex')}`,
      },
    };
  }
}

/** unknown error에서 사용자에게 보여줄 최소 메시지만 꺼냅니다. */
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return 'unknown error';
}

/**
 * 에러 메시지에서 credential, Authorization 단어, Discord webhook URL을 가립니다.
 * 이 함수는 "저장하거나 로그로 남겨도 되는 안전한 메시지"를 만들기 위한 마지막 방어선입니다.
 */
function sanitizeMessage(message: string, secrets: string[]): string {
  const webhookPattern = /https:\/\/discord\.com\/api\/webhooks\/\S+/g;
  const authorizationPattern = /authorization/gi;
  let sanitized = message
    .replace(webhookPattern, '[redacted-webhook-url]')
    .replace(authorizationPattern, '[redacted-authorization]');

  for (const secret of secrets) {
    sanitized = sanitized.split(secret).join('[redacted-secret]');
  }

  return sanitized;
}
