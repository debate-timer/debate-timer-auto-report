const KST_OFFSET_MILLISECONDS = 9 * 60 * 60 * 1000;
const ONE_MILLISECOND = 1;

/**
 * UTC Date를 KST 기준 YYYYMMDD 문자열로 바꿉니다.
 *
 * 예: 2026-04-19T15:00:00.000Z는 KST로 2026-04-20 00:00이므로
 * Amplitude에 넘길 날짜 문자열은 "20260420"입니다.
 */
export function formatKstDate(date: Date): string {
  const kstDate = new Date(date.getTime() + KST_OFFSET_MILLISECONDS);
  const year = kstDate.getUTCFullYear();
  const month = String(kstDate.getUTCMonth() + 1).padStart(2, '0');
  const day = String(kstDate.getUTCDate()).padStart(2, '0');

  return `${year}${month}${day}`;
}

/**
 * DB의 periodEnd는 "포함하지 않는 끝 시각"이라서, Amplitude의 inclusive end 날짜로
 * 보낼 때는 1ms를 빼 마지막 포함 날짜를 계산합니다.
 */
export function formatAmplitudeEndDateFromExclusiveEnd(
  periodEnd: Date,
): string {
  return formatKstDate(new Date(periodEnd.getTime() - ONE_MILLISECOND));
}
