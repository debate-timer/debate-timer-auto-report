# AI 프레임워크 선택 근거 문서

본 문서는 이 프로젝트에서 사용할 AI 프레임워크/SDK를 비교하고, 왜 **AI SDK Core**를 선택했는지 쉽게 이해할 수 있도록 정리한 의사결정 문서다.

기준일: **2026-04-19**

---

## 1. 한 줄 결론

이 프로젝트는 `완전 자율형 multi-agent 시스템`이 아니라, **시스템 수준 흐름은 NestJS가 통제하고, 분석 단계 내부에서는 AI가 제한된 도구를 조건부로 호출하는 bounded analyzer agent**에 가깝다.

그래서 현재 범위에서는 다음 조합이 가장 적합하다.

- **AI SDK Core**
- **Zod**
- **권장 초기 provider: Gemini**
- **권장 초기 모델: Gemini Flash 계열**

즉, `AI 프레임워크가 시스템 전체를 주도하는 구조`가 아니라, `애플리케이션이 시스템을 운영하고 AI는 분석 단계 안에서 제한적으로 reasoning/orchestration을 수행하는 구조`라는 판단이다.

---

## 2. 이 프로젝트가 실제로 필요로 하는 것

이 프로젝트에 필요한 AI 기능은 아래 5가지다.

1. 구조화된 출력
2. 제한된 tool calling
3. provider 교체 가능성
4. NestJS 서비스 계층과의 자연스러운 통합
5. prompt versioning / eval / fallback을 포함한 운영 가능성

반대로 지금 당장 꼭 필요하지 않은 것은 아래와 같다.

1. multi-agent handoff
2. 장기 실행 그래프
3. human-in-the-loop workflow engine
4. 메모리 플랫폼
5. sandboxed computer use

즉, 지금은 “가장 강력한 agent 프레임워크”보다 “시스템 orchestration과 AI 분석 orchestration의 경계를 적절히 나누는 선택”이 중요하다.

---

## 3. 비교 대상

이번 의사결정에서는 아래 6개를 비교했다.

1. **AI SDK Core**
2. **Google GenAI SDK**
3. **OpenAI Agents SDK**
4. **LangGraph**
5. **Mastra**
6. **각사 공식 SDK 직접 사용** (`openai` 등)

---

## 4. 빠른 비교표

| 후보 | 성격 | 강점 | 약점 | 이 프로젝트와의 궁합 | 최종 판단 |
|---|---|---|---|---|---|
| **AI SDK Core** | 경량 통합 레이어 | 구조화 출력, tool calling, provider 표준화, NestJS 결합 쉬움 | 자체 agent runtime은 얇음 | **매우 높음** | **선택** |
| Google GenAI SDK | Gemini 공식 SDK | Gemini 기능 직접 사용, Google 공식 지원, 단순한 구성 | Gemini 종속, provider abstraction 약함, JS/TS에서 수동 루프 비중 큼 | 높음 | 보류 |
| OpenAI Agents SDK | OpenAI 중심 agent SDK | tools, handoffs, tracing, guardrails, agent 조합 강함 | OpenAI 중심, provider 중립성 약함, 현재 범위엔 무거움 | 중간 | 보류 |
| LangGraph | 저수준 agent orchestration | durable execution, stateful workflow, human-in-the-loop 강함 | 저수준이라 구현 복잡도 높음 | 중간 이하 | 보류 |
| Mastra | TS 기반 AI agent 프레임워크 | workflows, evals, observability, memory 내장 | 프레임워크 무게 큼, 현재 범위엔 과할 수 있음 | 중간 | 보류 |
| 직접 SDK 사용 | provider 전용 SDK | 단순, 빠름, provider 기능 바로 사용 가능 | provider lock-in, abstraction 직접 구현 필요 | 중간 | 보류 |

---

## 5. 후보별 판단

### 5.1 AI SDK Core

### 장점

- 모델 제공자를 표준화된 인터페이스로 다룰 수 있다.
- 구조화 출력과 tool calling이 단일 패턴으로 정리된다.
- NestJS 서비스 계층에서 필요한 만큼만 사용할 수 있다.
- Gemini로 시작하고 나중에 OpenAI/Anthropic으로 바꿀 때 구조 변경이 적다.
- `bounded tool loop` 같은 패턴을 직접 제어하기 쉽다.

### 단점

- LangGraph나 OpenAI Agents SDK처럼 “프레임워크가 agent orchestration을 많이 대신해주는” 성격은 약하다.
- handoff, memory, stateful graph 같은 기능은 직접 설계해야 한다.

### 이 프로젝트에서의 평가

이 프로젝트는 현재 `시스템 orchestration은 NestJS use case`, `분석 단계 내부 orchestration은 AI` 구조가 핵심이다.  
즉, AI 프레임워크가 전체 애플리케이션을 주도할 필요는 없지만, 분석 단계 안에서는 실제 tool loop를 통해 agentic하게 동작해야 한다.

따라서 **현재 요구사항 대비 가장 가볍고 적합한 선택**이다.

---

### 5.2 Google GenAI SDK

### 장점

- Google이 Gemini API용으로 공식 제공하는 production-ready SDK다.
- Gemini 모델 기능을 가장 직접적으로 사용할 수 있다.
- function calling, MCP 연동 등 Google 문서와 예제가 풍부하다.
- Gemini만 쓸 것이 확실하다면 구현 경로가 짧고 단순하다.

### 단점

- 사실상 Gemini 중심 선택이다.
- provider 교체를 고려할 경우 abstraction을 앱 쪽에서 별도로 감싸야 한다.
- JS/TS에서는 function calling 실행 루프를 직접 관리하는 비중이 비교적 크다.

### 이 프로젝트에서의 평가

Google GenAI SDK는 **충분히 좋은 후보**다.  
특히 “Gemini만 쓸 것”이 확실하다면 AI SDK Core보다 더 직접적일 수 있다.

하지만 이 프로젝트는 이후 OpenAI/Anthropic 전환 가능성을 열어두고 있고,  
bounded tool loop / structured output / logging 패턴을 provider-agnostic하게 정리하는 편이 더 유리하다.

따라서 **좋은 2순위 후보**로 두고, 현재는 보류한다.

---

### 5.3 OpenAI Agents SDK

### 장점

- OpenAI 공식 agent SDK라서 OpenAI 모델과 궁합이 좋다.
- tools, handoffs, structured output, guardrails, tracing이 잘 정리되어 있다.
- agent를 여러 개 나누거나 manager/handoff 패턴을 쓰기 쉽다.
- 향후 더 agentic한 방향으로 확장할 때 설계 자산으로 활용하기 좋다.

### 단점

- 사실상 OpenAI 중심 선택이다.
- Gemini 무료 티어 우선 전략과는 잘 맞지 않는다.
- 현재 프로젝트는 multi-agent나 handoff가 핵심이 아닌데, 프레임워크가 요구사항보다 앞설 수 있다.

### 이 프로젝트에서의 평가

좋은 선택이지만 **현재 범위에는 살짝 무겁다**.  
지금 도입하면 “문제 해결”보다 “프레임워크 사용”이 앞에 드러날 위험이 있다.

따라서 **2차 이후 OpenAI 중심으로 갈 경우 재검토**가 적절하다.

---

### 5.4 LangGraph

### 장점

- 장기 실행, 상태 유지, durable execution, human-in-the-loop가 강하다.
- deterministic workflow와 agentic workflow를 섞어 쓰기 좋다.
- 복잡한 상태 머신형 agent를 만들 때 매우 강력하다.

### 단점

- 저수준이라 설계와 구현 부담이 크다.
- 지금 프로젝트처럼 “주간 리포트 생성” 수준의 bounded flow에는 과할 수 있다.
- 현재 규모에서는 시스템 수준 graph orchestration보다 단순 service orchestration이 더 적합하다.

### 이 프로젝트에서의 평가

기술적으로는 강력하지만, 지금 당장 도입하면 **복잡도 대비 이득이 적다**.  
이 프로젝트가 향후 장기 실행형 분석 agent, 승인 흐름, pause/resume이 필요해질 때 어울린다.

따라서 현재는 보류한다.

---

### 5.5 Mastra

### 장점

- TypeScript 친화적이다.
- workflows, evals, observability, memory 등 운영 기능이 풍부하다.
- AI agent 플랫폼처럼 빠르게 꾸리기 좋다.

### 단점

- 프레임워크 자체의 무게가 있다.
- 현재 요구사항보다 더 넓은 범위를 한 번에 들여오게 된다.
- 지금은 NestJS를 중심으로 시스템을 짜는 편이 더 단순하다.

### 이 프로젝트에서의 평가

Mastra는 매력적이지만, 지금 프로젝트는 **NestJS 중심 백엔드 + AI 계층 추가**가 더 적합하다.  
즉, 플랫폼형 프레임워크를 가져오기엔 현재 범위가 아직 작다.

따라서 현재는 보류한다.

---

### 5.6 각사 공식 SDK 직접 사용

### 장점

- 의존성이 적다.
- 특정 provider 기능을 가장 직접적으로 활용할 수 있다.
- 아주 단순한 단일 모델 호출에는 빠르고 깔끔하다.

### 단점

- provider 교체 시 코드 수정 범위가 커진다.
- tool calling, structured output, 공통 로깅 패턴을 직접 추상화해야 한다.
- 장기적으로는 provider lock-in이 강해진다.

### 이 프로젝트에서의 평가

초기 프로토타입에는 괜찮지만, 이 프로젝트는 나중에 provider 비교나 전환 여지를 남기고 싶다.  
또한 bounded tool loop와 structured output을 운영 가능한 형태로 관리해야 하므로, 공식 SDK 직접 사용보다 **공통 abstraction이 더 유리**하다.

따라서 현재는 보류한다.

---

## 6. 왜 AI SDK Core를 선택했는가

결정 이유는 아래 5줄로 정리된다.

1. **시스템 orchestration은 NestJS가 담당하는 것이 맞다.**
2. **분석 단계 내부에서는 AI가 bounded tool loop를 통해 제한적으로 orchestration해야 한다.**
3. **필요한 AI 기능은 bounded tool calling과 structured output이다.**
4. **Gemini로 시작하되 provider 교체 가능성을 열어둬야 한다.**
5. **지금은 full agent platform보다 가벼운 abstraction이 더 적합하다.**

즉,

- `Google GenAI SDK`는 Gemini 고정에는 좋지만 provider 중립성이 약하고
- `OpenAI Agents SDK`는 너무 OpenAI 중심이고
- `LangGraph`는 너무 저수준이며
- `Mastra`는 지금 범위엔 다소 크고
- `직접 SDK`는 너무 provider 종속적이다.

그 사이에서 **AI SDK Core가 가장 균형이 좋다**.

---

## 7. 포트폴리오 / AX 관점에서의 해석

이 선택이 “너무 약해 보이지 않을까?”라는 걱정이 있을 수 있다.

하지만 실제 어필 포인트는 프레임워크 이름보다 아래에 있다.

- deterministic analysis pipeline
- bounded read-only tool loop
- structured output
- prompt versioning
- eval loop
- fallback
- idempotency / observability / masking

즉, 이 프로젝트는 `프레임워크 데모`보다 `운영 가능한 AI 분석 시스템`으로 보이는 편이 더 강하다.

따라서 이력서/포트폴리오에서는 아래처럼 설명하는 것이 좋다.

- “Amplitude/Sentry 기반 데이터 파이프라인 위에 bounded analyzer agent를 설계·구현”
- “AI가 제한된 read-only tools를 조건부 호출하고, structured output·eval·fallback으로 운영 품질을 관리”
- “시스템 orchestration은 NestJS가 담당하고, 분석 단계 내부에서는 provider-agnostic AI 계층이 제한적으로 tool orchestration을 수행”

---

## 8. 향후 재검토 기준

다음 조건 중 2개 이상이 만족되면 OpenAI Agents SDK 또는 LangGraph 재검토가 타당하다.

1. multi-agent handoff가 필요해짐
2. 장기 실행 / pause-resume / human approval workflow가 필요해짐
3. agent memory가 핵심 요구사항이 됨
4. OpenAI 모델을 중심으로 고정함
5. tool chain이 복잡해져서 현재 NestJS service orchestration과 AI analysis orchestration의 경계가 과도하게 비대해짐

즉, 현재 선택은 “영구 고정”이 아니라 **현재 범위에 가장 적절한 선택**이다.

---

## 9. 최종 의사결정

현재 기준 최종 선택은 다음과 같다.

- **AI 프레임워크/통합 레이어**: AI SDK Core
- **출력 스키마**: Zod
- **초기 provider 권장안**: Google Gemini API
- **AI 패턴**: bounded analyzer agent
- **운영 원칙**: prompt versioning + eval loop + fallback

이 결정은 “가장 화려한 agent 프레임워크”를 고른 것이 아니라,  
**현재 프로젝트 요구사항에 가장 맞는 복잡도와 확장성을 가진 선택**이라는 점이 핵심이다.

구현 시 주의사항:

- AI SDK는 버전별 structured output API가 바뀔 수 있으므로, Phase 8 구현 직전에 공식 문서 기준으로 `generateText` + `output` 또는 해당 시점의 권장 API를 다시 확인한다.
- 출력 스키마는 단순 JSON 유효성 검사가 아니라 Zod 기반 구조 검증을 통과해야 한다.
- tool calling은 읽기 전용 도구만 허용하고, 호출 상한·실패 fallback·도구 호출 로그 저장을 함께 구현한다.

---

## 10. 참고한 공식 문서

- AI SDK Core 소개: https://ai-sdk.dev/docs/ai-sdk-core/overview
- AI SDK Core tool calling: https://ai-sdk.dev/docs/ai-sdk-core/tools-and-tool-calling
- Google GenAI SDK: https://ai.google.dev/gemini-api/docs/downloads
- Gemini function calling: https://ai.google.dev/gemini-api/docs/function-calling
- OpenAI Agents SDK 가이드: https://platform.openai.com/docs/guides/agents-sdk/
- OpenAI Agents SDK JS 문서: https://openai.github.io/openai-agents-js/guides/agents/
- LangGraph overview: https://docs.langchain.com/oss/javascript/langgraph/overview
- Mastra workflows: https://mastra.ai/workflows
- Mastra agents: https://mastra.ai/agents
