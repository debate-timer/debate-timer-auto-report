import {
  formatAmplitudeEndDateFromExclusiveEnd,
  formatKstDate,
} from './kst-date';

describe('KST 날짜 포맷', () => {
  test('UTC Date를 KST YYYYMMDD 문자열로 변환한다', () => {
    const date = new Date('2026-04-19T15:00:00.000Z');

    expect(formatKstDate(date)).toBe('20260420');
  });

  test('exclusive periodEnd에서 Amplitude end 날짜를 계산한다', () => {
    const periodEnd = new Date('2026-04-26T15:00:00.000Z');

    expect(formatAmplitudeEndDateFromExclusiveEnd(periodEnd)).toBe('20260426');
  });

  test('서버 로컬 타임존에 의존하지 않는다', () => {
    const periodStart = new Date('2026-01-04T15:00:00.000Z');
    const periodEnd = new Date('2026-01-11T15:00:00.000Z');

    expect(formatKstDate(periodStart)).toBe('20260105');
    expect(formatAmplitudeEndDateFromExclusiveEnd(periodEnd)).toBe('20260111');
  });

  test('유효하지 않은 Date는 즉시 거부한다', () => {
    const invalidDate = new Date('not-a-date');

    expect(() => formatKstDate(invalidDate)).toThrow(
      'formatKstDate date must be a valid Date',
    );
    expect(() => formatAmplitudeEndDateFromExclusiveEnd(invalidDate)).toThrow(
      'formatAmplitudeEndDateFromExclusiveEnd periodEnd must be a valid Date',
    );
  });
});
