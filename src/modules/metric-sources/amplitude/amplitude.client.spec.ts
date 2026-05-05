import { ConfigService } from '@nestjs/config';
import { createHash } from 'node:crypto';
import {
  AmplitudeApiError,
  AmplitudeClient,
  AmplitudeFetch,
} from './amplitude.client';

describe('AmplitudeClient', () => {
  const configService = {
    getOrThrow: jest.fn((key: string) => {
      if (key === 'AMPLITUDE_API_KEY') {
        return 'api-key';
      }

      if (key === 'AMPLITUDE_SECRET_KEY') {
        return 'secret-key';
      }

      throw new Error(`Unexpected config key: ${key}`);
    }),
  } as unknown as ConfigService;

  const requestParams = {
    eventType: 'timer_started' as const,
    startDate: '20260420',
    endDate: '20260426',
  };

  afterEach(() => {
    jest.useRealTimers();
  });

  function createJsonResponse(
    body: unknown,
    options: { ok?: boolean; status?: number; headers?: Headers } = {},
  ): Response {
    const bodyText = JSON.stringify(body);

    return {
      ok: options.ok ?? true,
      status: options.status ?? 200,
      headers: options.headers ?? new Headers(),
      json: jest.fn().mockResolvedValue(body),
      text: jest.fn().mockResolvedValue(bodyText),
    } as unknown as Response;
  }

  function createTextResponse(
    bodyText: string,
    options: { ok?: boolean; status?: number; headers?: Headers } = {},
  ): Response {
    return {
      ok: options.ok ?? true,
      status: options.status ?? 200,
      headers: options.headers ?? new Headers(),
      text: jest.fn().mockResolvedValue(bodyText),
    } as unknown as Response;
  }

  test('Event Segmentation URL을 구성한다', async () => {
    const amplitudeFetch = jest
      .fn()
      .mockResolvedValue(
        createJsonResponse({ data: { seriesCollapsed: [[{ value: 12 }]] } }),
      ) as jest.MockedFunction<AmplitudeFetch>;
    const client = new AmplitudeClient(configService, amplitudeFetch);

    await client.fetchEventSegmentation(requestParams);

    const [requestUrl] = amplitudeFetch.mock.calls[0];

    if (typeof requestUrl !== 'string') {
      throw new Error('Expected AmplitudeClient to call fetch with URL string');
    }

    const url = new URL(requestUrl);

    expect(url.pathname).toBe('/api/2/events/segmentation');
    expect(url.searchParams.get('e')).toBe(
      JSON.stringify({ event_type: 'timer_started' }),
    );
    expect(url.searchParams.get('start')).toBe('20260420');
    expect(url.searchParams.get('end')).toBe('20260426');
    expect(url.searchParams.get('m')).toBe('totals');
    expect(url.searchParams.get('i')).toBe('7');
  });

  test('Basic Authorization header를 설정하지만 결과에는 저장하지 않는다', async () => {
    const amplitudeFetch = jest
      .fn()
      .mockResolvedValue(
        createJsonResponse({ data: { seriesCollapsed: [[{ value: 12 }]] } }),
      ) as jest.MockedFunction<AmplitudeFetch>;
    const client = new AmplitudeClient(configService, amplitudeFetch);

    const result = await client.fetchEventSegmentation(requestParams);

    const [, init] = amplitudeFetch.mock.calls[0];
    const headers = new Headers(init?.headers);
    const rawRefText = JSON.stringify(result.rawRef);

    expect(headers.get('Authorization')).toMatch(/^Basic /);
    expect(rawRefText).not.toContain('api-key');
    expect(rawRefText).not.toContain('secret-key');
    expect(rawRefText).not.toContain('Authorization');
  });

  test('성공 응답에 checksum과 endpoint rawRef를 포함한다', async () => {
    const amplitudeFetch = jest
      .fn()
      .mockResolvedValue(
        createJsonResponse({ data: { seriesCollapsed: [[{ value: 12 }]] } }),
      ) as jest.MockedFunction<AmplitudeFetch>;
    const client = new AmplitudeClient(configService, amplitudeFetch);

    const result = await client.fetchEventSegmentation(requestParams);

    expect(result.rawRef).toMatchObject({
      version: 1,
      source: 'AMPLITUDE',
      endpoint: '/api/2/events/segmentation',
    });
    expect(result.rawRef.responseChecksum).toMatch(/^sha256:/);
  });

  test('checksum은 재직렬화 JSON이 아니라 원본 응답 문자열 기준으로 계산한다', async () => {
    const rawResponseText =
      '{ "data" : { "seriesCollapsed" : [[{ "value" : 12 }]] } }';
    const amplitudeFetch = jest
      .fn()
      .mockResolvedValue(
        createTextResponse(rawResponseText),
      ) as jest.MockedFunction<AmplitudeFetch>;
    const client = new AmplitudeClient(configService, amplitudeFetch);

    const result = await client.fetchEventSegmentation(requestParams);

    const expectedChecksum = `sha256:${createHash('sha256')
      .update(rawResponseText)
      .digest('hex')}`;
    expect(result.rawRef.responseChecksum).toBe(expectedChecksum);
  });

  test('성공 HTTP 응답의 JSON 파싱 실패는 AmplitudeApiError로 변환한다', async () => {
    const amplitudeFetch = jest
      .fn()
      .mockResolvedValue(
        createTextResponse('{ invalid json', { status: 200 }),
      ) as jest.MockedFunction<AmplitudeFetch>;
    const client = new AmplitudeClient(configService, amplitudeFetch);

    await expect(client.fetchEventSegmentation(requestParams)).rejects.toThrow(
      AmplitudeApiError,
    );
    await expect(client.fetchEventSegmentation(requestParams)).rejects.toThrow(
      'Amplitude API returned invalid JSON',
    );
  });

  test('Amplitude 호출이 타임아웃되면 안전한 API 에러로 변환한다', async () => {
    jest.useFakeTimers();

    const abortError = Object.assign(new Error('The operation was aborted'), {
      name: 'AbortError',
    });
    const amplitudeFetch = jest.fn((input, init) => {
      const signal = init?.signal;

      return new Promise<Response>((_resolve, reject) => {
        if (!(signal instanceof AbortSignal)) {
          reject(new Error('Expected AbortSignal'));
          return;
        }

        signal.addEventListener('abort', () => reject(abortError), {
          once: true,
        });
      });
    }) as jest.MockedFunction<AmplitudeFetch>;
    const client = new AmplitudeClient(configService, amplitudeFetch);

    const request = client.fetchEventSegmentation(requestParams);
    jest.advanceTimersByTime(15_000);

    await expect(request).rejects.toThrow('Amplitude API request timed out');
    jest.useRealTimers();
  });

  test('Amplitude HTTP 실패를 안전한 에러로 반환한다', async () => {
    const amplitudeFetch = jest.fn().mockResolvedValue(
      createJsonResponse(
        {
          error:
            'bad api-key secret-key Authorization https://discord.com/api/webhooks/1/token',
        },
        { ok: false, status: 401 },
      ),
    ) as jest.MockedFunction<AmplitudeFetch>;
    const client = new AmplitudeClient(configService, amplitudeFetch);

    let caughtError: unknown;
    try {
      await client.fetchEventSegmentation(requestParams);
    } catch (error) {
      caughtError = error;
    }

    expect(caughtError).toMatchObject({ status: 401 });
    const errorText = `${(caughtError as Error).message} ${JSON.stringify(
      caughtError,
    )}`;
    expect(errorText).not.toContain('api-key');
    expect(errorText).not.toContain('secret-key');
    expect(errorText).not.toContain('Authorization');
    expect(errorText).not.toContain('https://discord.com/api/webhooks');
  });

  test('fetch 예외를 안전한 에러로 반환한다', async () => {
    const amplitudeFetch = jest
      .fn()
      .mockRejectedValue(
        new Error('network down'),
      ) as jest.MockedFunction<AmplitudeFetch>;
    const client = new AmplitudeClient(configService, amplitudeFetch);

    await expect(client.fetchEventSegmentation(requestParams)).rejects.toThrow(
      'network down',
    );
    await expect(
      client.fetchEventSegmentation(requestParams),
    ).rejects.not.toThrow('api-key');
  });

  test('실패 처리 중 민감정보를 로그로 남기지 않는다', async () => {
    const consoleErrorSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
    const consoleWarnSpy = jest
      .spyOn(console, 'warn')
      .mockImplementation(() => undefined);
    const amplitudeFetch = jest.fn().mockResolvedValue(
      createJsonResponse(
        {
          error:
            'api-key secret-key Authorization https://discord.com/api/webhooks/1/token',
        },
        { ok: false, status: 500 },
      ),
    ) as jest.MockedFunction<AmplitudeFetch>;
    const client = new AmplitudeClient(configService, amplitudeFetch);

    await expect(
      client.fetchEventSegmentation(requestParams),
    ).rejects.toThrow();

    const loggedText = [
      ...consoleErrorSpy.mock.calls,
      ...consoleWarnSpy.mock.calls,
    ]
      .flat()
      .join(' ');
    expect(loggedText).not.toContain('api-key');
    expect(loggedText).not.toContain('secret-key');
    expect(loggedText).not.toContain('Authorization');
    expect(loggedText).not.toContain('https://discord.com/api/webhooks');

    consoleErrorSpy.mockRestore();
    consoleWarnSpy.mockRestore();
  });
});
