# ADR 001: Amplitude-first Architecture

## 상태

Accepted (2026-04-23)

## 배경

이 시스템은 GA4, Amplitude, Sentry 세 가지 외부 데이터 원천을 다룬다.

- **GA4**: 오래된 원천이며 팀이 Amplitude로 전환 중이다.
- **Amplitude**: 최근 도입되었으며 prod 배포가 2주 내 예정이다.
- **Sentry**: 최근 연결되었으나 1차 Walking Skeleton에 포함하기엔 별도 연동 비용이 크다.

Walking Skeleton 전략의 핵심 원칙은 "가장 얇은 end-to-end 경로를 먼저 완성"이다. 세 원천을 동시에 연동하면 초기 검증이 복잡해지고, GA4 연동 코드는 Amplitude 전환 완료 후 버려질 코드이므로 작성 비용이 낭비다.

## 결정

**1차 구현에서는 Amplitude만 지표 원천으로 사용한다.**

구체적으로 다음 결정을 확정한다.

| 항목 | 결정 |
|---|---|
| 지표 원천 | Amplitude 단독 |
| GA4 연동 | 작성하지 않음 |
| Sentry 연동 | 2차 구현으로 연기 (Phase 9) |
| AI 요약 계층 | placeholder 구조만 확보, 실제 호출은 Phase 8에서 활성화 |
| AI 제공자 | Gemini API 무료 티어로 시작 (2차에서 활성화) |
| 호스팅 | Oracle Cloud Always Free (ARM Ampere A1) |
| 스케줄러 | `@nestjs/schedule` 내장 스케줄러 |

## 결과

### 이점

- Walking Skeleton 구현이 단순해져 초기 end-to-end 검증(Amplitude → DB → Discord)이 빠르다.
- Amplitude API, DB 스키마, Discord payload, 실행 이력 구조를 초기에 함께 검증할 수 있다.
- GA4 연동 코드 작성·유지보수 비용을 없앤다.
- 이후 기능이 모두 같은 실행 경로 위에 쌓이므로 회귀를 잡기 쉽다.

### 트레이드오프

- 1차 리포트에 에러 정보(Sentry)가 포함되지 않는다.
- GA4 장기 이력 데이터를 초기에 활용하지 못한다. Amplitude 도입 이전 기간은 "신규 수집"으로 처리된다.

### 확장 경로

- `MetricSourceAdapter` 인터페이스를 처음부터 정의해, 추후 다른 지표 원천을 추가할 때 기존 Amplitude 로직을 수정하지 않아도 된다.
- Sentry는 `ErrorSourceAdapter`로 별도 분리해 2차에서 추가한다.
- AI 계층은 placeholder 구조를 갖춰두어, Phase 8에서 provider abstraction만 구현하면 된다.

## 참조

- [implementation-plan.md](../implementation-plan.md) — 4.2 Source Adapter 분리, 4.6 Walking Skeleton 우선
- [tech-stack.md](../tech-stack.md) — 3.3 Amplitude 단독 (GA4 폐기)
- [metrics-reporting-srs.md](../metrics-reporting-srs.md) — 11.1 (수정됨), 13번 이슈 #1, #11, #14, #16
