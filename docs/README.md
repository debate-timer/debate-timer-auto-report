# 문서 인덱스

`debate-timer-auto-report`의 핵심 문서를 한곳에서 관리하기 위한 진입점이다.

현재 원칙은 다음과 같다.

- 문서는 모두 `docs/` 아래에서 관리한다.
- 현재 활성 Phase는 `Phase 1. Walking Skeleton`이다.
- 현재 세부 실행 단위는 `specs/feat/006-project-base-setup/`의 **Phase 1-1 프로젝트 기반 구성**이다.
- 전역 설계는 `docs/`, 기능별 실행 명세는 `specs/`에서 관리한다.

## 핵심 문서

- [metrics-reporting-srs.md](./metrics-reporting-srs.md): 기능 요구사항 명세서
- [implementation-plan.md](./implementation-plan.md): 상세 구현 계획과 Phase 정의
- [tech-stack.md](./tech-stack.md): 기술 스택 결정 및 운영 유의사항
- [ai-framework-selection.md](./ai-framework-selection.md): AI 프레임워크 비교와 선택 근거
- [analytics-dashboard.md](./analytics-dashboard.md): Amplitude 대시보드 해석 가이드
- [learning-and-portfolio.md](./learning-and-portfolio.md): 학습 및 이력서/포트폴리오 산출물 운영 기준
- [learning/](./learning/): 학습 아카이브

## 전역 관리 문서

- [master-checklist.md](./master-checklist.md): 전체 Phase 진행 현황과 선행관계 관리
- [current-phase-checklist.md](./current-phase-checklist.md): 현재 활성 Phase의 작업 기준 관리
- [decisions.md](./decisions.md): 전역 의사결정과 보류 항목 정리

## 현재 작업 기준

문서와 구현 착수 순서는 아래를 기준으로 본다.

1. [metrics-reporting-srs.md](./metrics-reporting-srs.md)
2. [tech-stack.md](./tech-stack.md)
3. [implementation-plan.md](./implementation-plan.md)
4. [current-phase-checklist.md](./current-phase-checklist.md)
5. `../specs/feat/006-project-base-setup/`

Phase 1-1의 구현 세부사항은 `specs/feat/006-project-base-setup/`를 우선 기준으로 보고, 전역 문서와 충돌이 발견되면 승인 후 전역 문서를 함께 정리한다.
