# 문서 인덱스

`debate-timer-auto-report`의 핵심 문서를 한곳에서 관리하기 위한 진입점이다.

현재 원칙은 다음과 같다.

- 문서는 모두 `docs/` 아래에서 관리한다.
- 현재 활성 Phase는 `Phase 0. 설계 고정`이다.
- 이번 단계에서는 문서만 정리하며, Walking Skeleton 구현과 Nest CLI 실행은 하지 않는다.

## 핵심 문서

- [metrics-reporting-srs.md](./metrics-reporting-srs.md): 기능 요구사항 명세서
- [implementation-plan.md](./implementation-plan.md): 상세 구현 계획과 Phase 정의
- [tech-stack.md](./tech-stack.md): 기술 스택 결정 및 운영 유의사항
- [ai-framework-selection.md](./ai-framework-selection.md): AI 프레임워크 비교와 선택 근거
- [analytics-dashboard.md](./analytics-dashboard.md): Amplitude 대시보드 해석 가이드

## 전역 관리 문서

- [master-checklist.md](./master-checklist.md): 전체 Phase 진행 현황과 선행관계 관리
- [current-phase-checklist.md](./current-phase-checklist.md): 현재 활성 Phase의 작업 기준 관리
- [decisions.md](./decisions.md): 전역 의사결정과 보류 항목 정리

## 현재 작업 기준

문서 착수 순서는 아래를 기준으로 본다.

1. [metrics-reporting-srs.md](./metrics-reporting-srs.md)
2. [tech-stack.md](./tech-stack.md)
3. [implementation-plan.md](./implementation-plan.md)
4. [current-phase-checklist.md](./current-phase-checklist.md)

현재는 문서 구조를 안정화하는 단계이며, 코드 작업은 명시적 지시 이후에만 진행한다.
