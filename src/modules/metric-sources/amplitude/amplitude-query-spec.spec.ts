import { parseAmplitudeEventCountQuerySpec } from './amplitude-query-spec';

describe('Amplitude querySpec 검증', () => {
  const validQuerySpec = {
    version: 1,
    source: 'AMPLITUDE',
    kind: 'EVENT_COUNT',
    eventType: 'timer_started',
    aggregation: 'EVENT_COUNT',
    filters: [],
    groupBy: [],
  };

  test('timer_started EVENT_COUNT querySpec을 허용한다', () => {
    expect(parseAmplitudeEventCountQuerySpec(validQuerySpec)).toEqual({
      eventType: 'timer_started',
    });
  });

  test('AMPLITUDE가 아닌 source는 거부한다', () => {
    expect(() =>
      parseAmplitudeEventCountQuerySpec({
        ...validQuerySpec,
        source: 'SENTRY',
      }),
    ).toThrow('Unsupported Amplitude querySpec');
  });

  test('EVENT_COUNT가 아닌 kind 또는 aggregation은 거부한다', () => {
    expect(() =>
      parseAmplitudeEventCountQuerySpec({
        ...validQuerySpec,
        kind: 'FUNNEL',
      }),
    ).toThrow('Unsupported Amplitude querySpec');

    expect(() =>
      parseAmplitudeEventCountQuerySpec({
        ...validQuerySpec,
        aggregation: 'UNIQUE_USERS',
      }),
    ).toThrow('Unsupported Amplitude querySpec');
  });

  test('filters 또는 groupBy가 비어 있지 않으면 거부한다', () => {
    expect(() =>
      parseAmplitudeEventCountQuerySpec({
        ...validQuerySpec,
        filters: [{ property: 'country', value: 'KR' }],
      }),
    ).toThrow('Unsupported Amplitude querySpec');

    expect(() =>
      parseAmplitudeEventCountQuerySpec({
        ...validQuerySpec,
        groupBy: ['country'],
      }),
    ).toThrow('Unsupported Amplitude querySpec');
  });

  test('timer_started가 아닌 eventType은 거부한다', () => {
    expect(() =>
      parseAmplitudeEventCountQuerySpec({
        ...validQuerySpec,
        eventType: 'timer_ended',
      }),
    ).toThrow('Unsupported Amplitude querySpec');
  });

  test('허용되지 않은 추가 필드가 있으면 거부한다', () => {
    expect(() =>
      parseAmplitudeEventCountQuerySpec({
        ...validQuerySpec,
        unexpectedField: 'should-not-pass',
      }),
    ).toThrow('Unsupported Amplitude querySpec');
  });
});
