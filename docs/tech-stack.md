# 기술 스택 결정 문서

본 문서는 [metrics-reporting-srs.md](metrics-reporting-srs.md)를 구현하기 위해 선택한 기술 스택, 결정 배경, 그리고 운영·개발 시 반드시 지켜야 할 유의사항을 정리한다.
본 프로젝트의 목표는 **지표/에러 데이터를 읽고, 제한된 도구를 사용해 원인 가설과 액션을 제시하는 AI 분석 시스템**을 구현하는 것이다.

---

## 1. 확정된 스택

| 레이어 | 선택 | 버전/에디션 |
|---|---|---|
| Runtime | Node.js | 최신 LTS |
| Language | TypeScript | 최신 LTS |
| Framework | NestJS | 최신 안정 버전 |
| Database | PostgreSQL | 로컬 개발 및 운영 기본 DB |
| ORM | Prisma 7 | `prisma-client` generator + PostgreSQL driver adapter |
| 내부 스케줄러 | `@nestjs/schedule` | — |
| AI 통합 레이어 | AI SDK Core | 최신 안정 버전 |
| AI 출력 스키마 | Zod | 최신 안정 버전 |
| 지표 원천 | Amplitude | 무료 플랜 |
| 에러 모니터링 | Sentry | 무료 플랜 |
| 전달 채널 | Discord Webhook | — |
| 호스팅 | Oracle Cloud Always Free | ARM Ampere A1 |
| OS | Ubuntu LTS | ARM64 |
| 컨테이너 | Docker + Docker Compose | — |
| 리버스 프록시 | nginx | — |
| HTTPS | Let's Encrypt (certbot) | — |
| 기준 타임존 | Asia/Seoul (UTC+9) | — |
| 주차 경계 | 월요일 00:00 ~ 일요일 23:59:59 KST | — |

## 2. 보류(Pending) 결정

구현 착수 전 또는 구현 중에 확정 필요한 항목.

| 항목 | 후보 | 현재 가이드 |
|---|---|---|
| AI 제공자 | Gemini API / Anthropic API / OpenAI API | **Gemini API 무료 티어**로 시작 → 한도 초과 시 유료 전환 |
| AI 분석 패턴 | 단순 요약 / 제한형 분석 패턴(Bounded tool calling) / 자율형 agent | **제한형 분석 패턴(Bounded tool calling)** 권장. 앱이 먼저 후보를 좁히고, AI는 허용된 소수의 읽기 전용 도구만 호출 |
| 로깅 | Nest built-in Logger / Pino / Winston | Pino 권장 (구조화 로그, request context, 운영 확장성) |
| 환경변수 검증 | Joi / Zod / class-validator | Phase 1-1은 `@nestjs/config`와 직접 결합되는 Joi 사용. DTO 검증은 class-validator + class-transformer 사용 |
| API 문서 | Swagger (`@nestjs/swagger`) | 수동 실행 API 용도로 필수 |
| 테스트 | Jest (NestJS 기본) | 유닛 + E2E 각 1~2개 |
| CI | GitHub Actions | lint + test만 돌림 (배포는 수동 또는 별도) |
| 배포 | `docker compose pull && up -d` (SSH 스크립트) | 초기엔 수동, 추후 CD 도입 |

---

## 3. 스택 결정 배경

### 3.1 NestJS

- **이력서 목적**: 백엔드 역량 + AI agent 역량 어필.
- **구조 어필 포인트**: DI, 모듈 분리, Guard·Interceptor·Pipe, `@nestjs/schedule`·`@nestjs/config`.
- **대안 비교**: Express/Fastify는 설계 감각 어필이 약함. NestJS가 엔터프라이즈 패턴 학습 신호.

### 3.2 Oracle Cloud Always Free

- **영구 무료 + 상시 기동**: `@nestjs/schedule`을 쓰려면 항상 떠 있는 프로세스가 필요. 이 조건 + $0를 동시에 만족하는 건 Oracle뿐.
- **어필 포인트**: VPS 운영 (Linux, Docker, nginx, HTTPS, systemd). 서버리스만 쓴 경험과 차별화.
- **대안 비교 요약**:

| 대안 | 탈락 이유 |
|---|---|
| AWS EC2 | 12개월 한시 무료 → 이후 유료 |
| AWS Lambda + EventBridge | NestJS를 Lambda에 얹는 건 어댑터 필요, 안티패턴에 가까움 |
| GCP Cloud Run + Cloud Scheduler | `@nestjs/schedule` 사용 불가 (min=0이면 sleep) |
| Render Free | 15분 무활동 시 sleep → cron 불가, Postgres 90일 후 삭제 |
| Railway | 실질 유료 ($5 크레딧 조기 소진) |
| Vercel | NestJS 배포 안티패턴, 프론트엔드 플랫폼 |
| Hetzner CAX11 | 저렴하지만 유료 (월 €3.79) |

### 3.3 Amplitude 단독 (GA4 폐기)

- GA4 통합 코드는 Amplitude 전환 후 버려짐 → 낭비.
- Amplitude Dashboard/Export API가 GA4 Data API보다 제품 이벤트 다루기 단순.
- "신규 수집" 상태 처리는 SRS 6.4.1에 이미 포함.
- **비용**: Amplitude prod 배포 전까지는 dev 프로젝트와 테스트 Discord 채널로 파이프라인을 검증한다.

### 3.4 `@nestjs/schedule` (내장 스케줄러)

- 외부 cron(Cloud Scheduler, EventBridge) 대신 애플리케이션 내부에서 스케줄 관리.
- NestJS 생태계 어필.
- 트레이드오프: 프로세스 상시 기동 필요 → Oracle VPS 선택과 세트.

### 3.5 Discord Webhook

- 본 프로젝트 팀 커뮤니케이션 채널이 Discord.
- Webhook 방식은 봇 등록·OAuth 불필요, 단순 POST로 전송 가능.

### 3.6 PostgreSQL + Prisma 7

- DB는 PostgreSQL로 확정한다.
- ORM은 Prisma 7로 확정한다.
- Prisma 7에서는 datasource URL을 `schema.prisma`의 `datasource` 블록에 두지 않고 `prisma.config.ts`에서 관리한다.
- 신규 스키마는 `prisma-client` generator와 명시적 `output` 경로를 사용한다.
- PostgreSQL 연결은 `@prisma/adapter-pg`의 `PrismaPg` driver adapter를 사용한다.
- Phase 1-1 기준 생성 경로는 `src/generated/prisma`를 권장한다.

### 3.7 제한형 분석 패턴 (Bounded tool calling)

- 본 프로젝트는 **지표/에러 데이터를 읽고, 제한된 도구를 사용해 원인 가설과 액션을 제시하는 AI 분석 시스템**을 목표로 한다.
- 초기 목표는 **완전 자율형 agent**가 아니라, **조건부 read-only tool loop를 가진 bounded analyzer agent**다.
- 애플리케이션이 먼저 지표 수집, 변화율 계산, 이상치 판별, 에러 요약, 비교 기준 확인까지 수행한다.
- AI는 이 기본 분석 결과를 입력으로 받되, 필요 시 애플리케이션이 제공하는 읽기 전용 도구를 **0~3회 조건부 호출**하여 추가 근거를 조회할 수 있다.
- AI는 Amplitude, Sentry, DB를 임의로 탐색하지 않고, 애플리케이션이 제공하는 **허용된 읽기 전용 도구**만 사용한다.
- 초기 허용 도구 예시는 다음과 같다.
  - `get_metric_summary`
  - `get_top_changes`
  - `get_segment_breakdown`
  - `get_report_context`
  - 이후 Sentry 확장 시 `get_error_summary`
- 도구 호출 수는 상한을 두고, 스키마 위반·호출 실패·예산 초과 시에는 즉시 템플릿 기반 요약으로 fallback한다.
- 이 방식은 AI agent 역량을 보여주면서도 비용, 호출 수, 실행 시간, 실패 처리, 멱등성을 예측 가능하게 만든다.
- 자율형 agent 확장은 2차 고도화 후보로 남기되, MVP 범위에는 포함하지 않는다.

### 3.8 AI SDK Core

- 본 프로젝트의 AI 계층 구현에는 **AI SDK Core**를 사용한다.
- 이유는 다음과 같다.
  - NestJS가 시스템 수준 orchestration을 유지한 채 AI 분석 계층만 모듈식으로 붙이기 쉽다.
  - 구조화 출력, provider 교체, tool calling을 공통 인터페이스로 관리하기 쉽다.
  - OpenAI 전용 SDK에 종속되지 않고 Gemini / OpenAI / Anthropic 전환 여지를 남길 수 있다.
- 즉, **시스템 orchestration은 NestJS use case가 담당**하고, **AI는 분석 단계 내부에서 bounded tool loop를 제한적으로 orchestration**한다.
- AI SDK Core는 이 경계 안에서 **모델 호출 + structured output + bounded tool calling** 계층으로 사용한다.

### 3.9 AI 품질 운영 방식

- AI 기능은 단순 프롬프트 호출이 아니라 **운영 가능한 분석 계층**으로 관리한다.
- 이를 위해 다음을 설계 범위에 포함한다.
  - **Prompt versioning**: 어떤 프롬프트 버전이 언제부터 적용되었는지 추적
  - **Eval loop**: 골든셋, 규칙 기반 검사, LLM-as-judge를 통한 품질 회귀 감지
  - **숫자 일치 검증**: AI 출력에 등장한 핵심 수치가 원본 계산 결과와 일치하는지 확인
- 이 세 가지가 있어야 본 프로젝트를 단순 LLM 요약이 아니라 AX/AI agent 지향 시스템으로 설명할 수 있다.

### 3.10 AI 프레임워크 비교 및 선택

2026-04-19 기준으로, 본 프로젝트에서 검토한 주요 AI 프레임워크/SDK는 다음과 같다.

| 후보 | 강점 | 약점 | 본 프로젝트 적합성 | 판단 |
|---|---|---|---|---|
| **AI SDK Core** | provider 교체 용이, structured output/tool calling 표준화, NestJS와 결합 용이 | 자체 agent runtime은 얇음 | **높음** | **선택** |
| Google GenAI SDK | Gemini 기능 직접 사용, Google 공식 SDK, 단순한 구성 | Gemini 종속, provider abstraction 약함, 수동 루프 구현 비중 큼 | 높음 | 보류 |
| OpenAI Agents SDK | OpenAI 모델 최적화, tools/handoffs/tracing/guardrails 강함 | OpenAI 중심, provider 중립성 낮음, 현재 범위엔 다소 무거움 | 중간 | 보류 |
| LangGraph | durable execution, human-in-the-loop, stateful workflow 강함 | 저수준이라 구현 복잡도 높음 | 중간 이하 | 보류 |
| Mastra | TS 친화적, workflows/evals/observability/memory 내장 | 프레임워크 무게가 크고 현재 범위엔 과할 수 있음 | 중간 | 보류 |
| 각사 공식 SDK 직접 사용 | 단순, 의존성 적음, provider 기능 바로 사용 가능 | provider lock-in, tool/output abstraction 직접 구현 필요 | 중간 | 보류 |

선택 이유는 간단하다.

- 현재 프로젝트는 **시스템 orchestration**과 **AI 분석 단계 내부 orchestration**을 분리해서 보는 편이 맞다.
- 시스템 수준 흐름은 NestJS use case가 담당한다.
- AI는 분석 단계 안에서만 제한적으로 도구를 호출하며 micro-orchestration을 수행한다.
- 필요한 AI 기능은 `structured output + bounded tool calling + provider 교체 여지`다.
- Google GenAI SDK도 좋은 후보지만, 현재는 Gemini 고정이 아니라 향후 provider 교체 가능성을 열어두는 편이 더 적절하다.
- 아직 multi-agent handoff, durable graph, memory platform, sandbox execution이 핵심 요구사항은 아니다.
- 따라서 현재 범위에서는 **AI SDK Core가 가장 가볍고 적합한 선택**이다.

더 자세한 비교와 선택 근거는 [ai-framework-selection.md](ai-framework-selection.md)를 참조한다.

### 3.11 로깅: Nest built-in Logger vs Pino

현재 단계에서 로깅 후보는 크게 세 가지다.

- **Nest built-in Logger**: 의존성 추가 없이 바로 사용 가능한 기본 선택지
- **Pino**: 구조화 JSON 로그와 운영 확장에 강한 외부 로거
- **Winston**: 다중 transport와 파일/원격 전송 생태계가 강한 외부 로거

이 프로젝트의 1차 후보 비교는 사실상 **Nest built-in Logger vs Pino**다. Winston은 장점이 분명하지만, 현재 범위에서는 다중 transport 요구가 아직 약해서 우선순위를 낮춘다.

#### Nest built-in Logger와 Pino의 차이

| 항목 | Nest built-in Logger | Pino |
|---|---|---|
| 도입 난이도 | 가장 단순함. 별도 패키지 없이 바로 사용 가능 | 별도 패키지와 Nest 연동 설정 필요 |
| 기본 역할 | Nest 시스템 로그와 애플리케이션 로그의 기본 구현 | 운영형 JSON 로그를 위한 전문 로거 |
| 구조화 로그 | 가능. `ConsoleLogger`의 JSON 설정으로 대응 가능 | 강점. JSON 중심 설계와 메타데이터 확장이 자연스러움 |
| 요청 단위 추적 | 기본 제공이 약함. request id, req/res 자동 로깅은 직접 붙여야 함 | `nestjs-pino` 사용 시 req/res 자동 로그, request context 바인딩이 쉬움 |
| 운영 확장성 | 기본 수준. 초기 MVP에는 충분 | 이후 로그 수집, 필드 확장, redaction, transport 구성에 유리 |
| 현재 프로젝트 적합성 | **Phase 1만 보면 충분히 가능** | **초기부터 운영형 구조를 맞추기엔 더 적합** |

핵심 차이는 다음 한 줄로 정리할 수 있다.

- **Nest built-in Logger는 빠른 시작에 유리하고**
- **Pino는 운영 가능한 구조화 로그를 처음부터 맞추기에 유리하다**

#### 왜 내장 로거가 아니라 Pino를 권장하는가

내장 로거가 부족해서가 아니라, 이 프로젝트의 후속 요구사항까지 같이 보면 Pino가 더 자연스럽다.

선정 이유는 다음과 같다.

- **구조화 JSON 로그 우선**
  - 본 프로젝트는 수동 실행, cron 실행, 외부 API 호출, DB 저장, Discord 전송 흐름을 추적해야 한다.
  - 문자열 중심 로그보다, 실행 ID·지표 키·원천·기간·상태코드 같은 필드를 가진 JSON 로그가 운영에 더 유리하다.

- **HTTP 진입점과 실행 흐름 추적**
  - 초기 범위에는 `/health`, 수동 실행 API, 이후 운영용 endpoint가 포함된다.
  - Pino는 `nestjs-pino`를 통해 요청/응답 자동 로그와 request context 연계가 쉬워, 나중에 실행 경로를 추적하기 좋다.

- **관측성 확장 여지**
  - 현재는 단순 콘솔 출력으로 시작하더라도, 이후 로그 수집기나 중앙 관측 체계로 넘기기 쉬운 쪽이 Pino다.
  - 특히 운영 단계에서 "어떤 실행이 왜 실패했는가"를 필드 기반으로 추적하기 편하다.

- **NestJS와의 결합도 문제 없음**
  - Pino를 써도 Nest의 `Logger` 사용 패턴을 크게 해치지 않는다.
  - 즉, Nest 친화성을 잃지 않으면서 운영 로그 품질을 올릴 수 있다.

#### 그렇다고 내장 로거를 배제하는 것은 아님

- **Walking Skeleton만 빨리 검증**하는 것이 최우선이라면, Nest built-in Logger로 시작해도 된다.
- 다만 현재 문서 기준으로는, 초기에 약간의 설정 비용을 들이더라도 **후속 운영 확장까지 고려한 Pino** 쪽이 더 일관된 선택이다.
- 따라서 현재 권장안은 다음과 같다.
  - **기본 권장**: Pino
  - **최소 부트스트랩 대안**: Nest built-in Logger
  - **현재 우선순위 낮음**: Winston

---

## 4. 제약 및 전제

### 4.1 예산

| 항목 | 정책 |
|---|---|
| Amplitude / Sentry | **무료 플랜 한도 준수 필수**. 초과 시 플랜 업그레이드는 별도 승인 사안 |
| AI API | 가성비 유료 지출 허용 (월 예산 상한 설정 예정, 오픈 이슈) |
| 서버 (Oracle) | Always Free 한도 내 $0 유지 |

### 4.2 AI 구독 상품 사용 제한

- **ChatGPT Plus, Claude Pro, Gemini Pro는 프로그래밍 자동화에 사용할 수 없음** (웹·데스크톱 구독형).
- 자동 호출 경로에는 **별도 API 키**가 필요하며, 팀 보유 구독과는 독립적으로 조달해야 한다.

### 4.3 데이터 원천 과도기

- 현재 전환 전략: GA4 연동 코드는 작성하지 않고, Amplitude prod 배포 전까지 dev 프로젝트로 파이프라인을 검증한다.
- 본 프로젝트는 **Amplitude 단독 구조로 설계**, GA4 통합은 미구현.
- prod 배포 이전 기간: **dev Amplitude/Sentry 프로젝트 + 테스트 Discord 채널**로 파이프라인 검증.
- prod 배포 시점: **환경변수만 스왑** (`.env.dev` → `.env.prod`).

### 4.4 환경 분리

```
config/
  env.dev.yaml  (또는 .env.dev)   → 테스트 채널 + dev Amplitude/Sentry
  env.prod.yaml (또는 .env.prod)  → 운영 채널 + prod Amplitude/Sentry
```

환경변수는 **Oracle 서버 내 `/etc/metrics-report/.env.prod`** 등 컨테이너 외부 위치에 두고 볼륨 마운트로 주입. 리포지토리에 커밋 금지.

---

## 5. 유의사항

### 5.1 Oracle Cloud 운영 함정

1. **이중 방화벽 반드시 양쪽 설정**
   - OCI 콘솔 → VCN → Security List → Ingress Rules에 포트 추가 (예: 80/443).
   - SSH 접속 후 `sudo iptables -I INPUT -p tcp --dport 443 -j ACCEPT && sudo netfilter-persistent save`.
   - 포트가 안 열리면 90% 이 문제.

2. **ARM Docker 이미지 호환성**
   - ARM Ampere A1 = `linux/arm64`. 대부분의 공식 이미지는 멀티아키 제공하나 간혹 없음.
   - `docker buildx build --platform linux/arm64`로 직접 빌드해야 하는 경우 있음.

3. **인스턴스 생성 실패 ("Out of capacity")**
   - ARM은 Tokyo/Osaka 리전에서 자주 발생.
   - **Seoul 리전 + 새벽 시간대 재시도** 권장. 며칠 기다려야 하는 경우도 있음.

4. **Idle Reclaim 방지**
   - Always Free 인스턴스는 95p CPU + 네트워크 + 메모리가 모두 20% 미만인 상태가 7일 이상 유지되면 회수 대상이 될 수 있음.
   - NestJS + Postgres + 주간 cron 조합이면 기준에 거의 안 걸리지만, 예방책 하나는 필수.
   - **선택 1**: UptimeRobot 무료 헬스체크(5분 주기)로 `/health` 엔드포인트 ping.
   - **선택 2**: 계정을 **Pay As You Go**로 전환 (기본 요금 $0, 한도 내 사용 시 $0 유지, Idle Reclaim 면제).

5. **Boot Volume 크기**
   - 기본 50GB로 생성 말고 **100~150GB**로 초기 설정 (Always Free 총 200GB 내).
   - Postgres + Docker 이미지 + 로그가 금방 쌓임.

6. **MFA 즉시 설정**
   - 계정 탈취 → 남의 돈으로 비트코인 채굴 → Oracle이 계정 폐쇄하는 사례 있음.
   - 가입 직후 바로 MFA 활성화.

### 5.2 데이터 보안 (SRS 6.5.6, 7.8)

- **민감정보 마스킹은 Discord·AI 전송 이전에 반드시 적용**.
- 마스킹 대상: 이메일, 전화번호, 카드번호, 주민등록번호, IP, Authorization 헤더, 쿠키, 요청 본문 내 토큰.
- 마스킹 규칙 세트는 설정으로 관리 (하드코딩 금지).

### 5.3 Discord 메시지 한도 (SRS 6.6.3)

- 본문 2000자
- Embed description 4096자
- Embed 합계 6000자
- 초과 시 사전 절삭 또는 스레드/첨부 분리.

### 5.4 Sentry 무료 플랜 한계 (SRS 6.5.7)

- 이벤트 보관 기간 **약 30일**.
- 장기 비교가 필요한 에러 지표는 시스템이 주기적으로 자체 스냅샷 저장 필요.

### 5.5 멱등성 (SRS 6.11)

- 리포트·경고에 `(유형 + 대상 기간 + 버전)` 조합의 멱등성 키 생성.
- 스케줄 중복 실행·재시도·수동 재실행 모두 이 키로 중복 방지.
- 수동 재실행 시 기본 동작은 **skip**, `?force=true` 같은 플래그에만 재전송 허용.

### 5.6 시간 경계 일관성 (SRS 7.7)

- 모든 날짜·시간 계산은 **Asia/Seoul** 기준.
- NestJS 컨테이너 환경변수 `TZ=Asia/Seoul` 설정.
- 또는 `date-fns-tz` / `luxon` 같은 라이브러리로 명시적 변환.
- 서버 시스템 타임존에 의존하지 말 것.

### 5.7 Amplitude 무료 플랜 한계

- API 호출 쿼터와 데이터 샘플링 특성을 숙지.
- 한 리포트 사이클에서 소비하는 호출 수를 예측 가능하도록 관리 (배치 조회, 캐시).

### 5.8 AI 품질 회귀 방지

- 프롬프트는 버전 관리되어야 하며, 실행 로그에 어떤 버전이 사용되었는지 남겨야 한다.
- AI 출력은 최소 1개의 규칙 기반 평가와 1개의 LLM 기반 평가로 회귀를 감시해야 한다.
- 저표본 환경에서는 AI가 원인 단정을 하지 못하도록 프롬프트와 후처리 규칙을 함께 둬야 한다.

---

## 6. 개발 진행 가이드

### 6.1 Walking Skeleton (Week 1)

목표: **로컬 개발 환경에서 수동 또는 스케줄 실행 → 지표 1개 조회 → 저장 → Discord 테스트 채널 전송**까지 동작.

- [ ] NestJS 프로젝트 초기화, 모듈 구조 설계
- [ ] Prisma/PostgreSQL 연결 및 최소 스키마 생성
- [ ] `@nestjs/schedule`로 Cron 1개 등록
- [ ] Amplitude Dashboard API 클라이언트 (dev 프로젝트 대상)
- [ ] Postgres 스냅샷 저장 (Prisma 마이그레이션)
- [ ] Discord Webhook 전송 (테스트 채널)
- [ ] 로컬 기준 end-to-end 검증

### 6.2 Core 로직 + MVP 안전장치 (Week 2)

- [ ] 전주 비교 + 변화율 계산 ("신규 수집" 처리)
- [ ] 규칙 기반 이상치 판별 (최소 표본 + 변화율·절대값 병행)
- [ ] **멱등성 키** 기반 중복 방지
- [ ] Discord 전송 재시도 및 실패 이력 저장
- [ ] 기본 운영 로그 / 마지막 성공 시각 저장
- [ ] 개발용 배포 인프라는 **Phase 2 완료 이후** 별도 적용 검토

### 6.3 리포트 품질 + AI (Week 3)

- [ ] 주간/월간 리포트 composer 고도화
- [ ] AI 요약 (Gemini API 무료 티어, AI SDK Core, 제한형 분석 패턴)
- [ ] **bounded tool loop** (read-only tools, 호출 상한 3회)
- [ ] **prompt versioning**
- [ ] **기본 eval loop** (골든셋 + 숫자 일치 검사 + LLM judge 1종)
- [ ] 템플릿 fallback

### 6.4 Sentry 확장 (Week 4)

- [ ] Sentry 에러 조회
- [ ] **민감정보 마스킹 파이프라인**
- [ ] 에러 스냅샷 저장 및 에러 리포트 결합

### 6.5 prod 전환 시점

- 환경변수 스왑 (`.env.prod` 주입)
- Discord Webhook URL을 운영 채널로 교체
- Amplitude/Sentry 프로젝트 키 prod로 교체
- 코드 변경 없이 전환되는지 검증

---

## 7. 오픈 이슈

상세 설계·구현 중 확정해야 할 항목. [metrics-reporting-srs.md](metrics-reporting-srs.md) 13장과 연계.

1. **AI 제공자 최종 확정** (무료 티어 시작 후 언제 유료 전환?)
2. **AI 월 예산 상한** 금액
3. **MVP 지표 목록** (Amplitude에서 어떤 이벤트 기준?)
4. **민감정보 마스킹 규칙 초기 세트**
5. **제한형 분석 패턴 상세 설계**: 허용 tool 목록, 호출 상한, 스키마, fallback 조건을 어디까지 둘 것인가?
6. **도메인 + HTTPS 인증서**: 무료 도메인(Duck DNS 등) vs 실제 구매
7. **백업 전략**: Postgres 덤프를 어디에 보관? (로컬 S3 호환 / Backblaze B2 무료 10GB 등)
8. **CI/CD 범위**: GitHub Actions에서 어디까지 자동화?
9. **AI eval 운영 기준**: 골든셋 규모, judge 프롬프트, 합격 컷라인을 어디까지 둘 것인가?
10. **prompt versioning 운영 규칙**: 롤백 방식, A/B 여부, 비활성 버전 보관 정책

---

## 8. 관련 문서

- [metrics-reporting-srs.md](metrics-reporting-srs.md) — 기능 요구사항 명세서
- [ai-framework-selection.md](ai-framework-selection.md) — AI 프레임워크 비교 및 선택 근거
- (추가 예정) `README.md` — 프로젝트 개요, 실행 가이드, 아키텍처 다이어그램
- (추가 예정) `docs/decisions/` — 주요 의사결정 기록 (ADR)
