# Test Contract: health 모듈

**파일**: `src/modules/health/health.controller.spec.ts`  
**테스트 대상**: `src/modules/health/health.controller.ts`

---

## 테스트 우선순위: HIGH (SC-002 직접 검증)

---

## describe: 'HealthController'

### 테스트 그룹 1: GET /health 응답

```
describe('GET /health')

  test('서비스가 정상 동작 중일 때 { status: "ok" }를 반환한다')
    - 입력: HTTP GET 요청 (또는 컨트롤러 메서드 직접 호출)
    - 예상 반환값: { status: 'ok' }

  test('반복 요청에도 일관된 응답을 반환한다')
    - 입력: check() 메서드 3회 호출
    - 예상: 매 호출마다 { status: 'ok' }
```

---

## E2E 테스트: `test/app.e2e-spec.ts`

```
describe('Health (e2e)')

  test('GET /health는 200과 { status: "ok" }를 반환한다')
    - 입력: supertest로 GET /health
    - 예상: status 200, body.status === 'ok'
```

---

## Mock 전략

- 단위 테스트: `@nestjs/testing`의 `TestingModule` 사용, 외부 의존성 없음
- E2E 테스트: 실제 NestJS 앱 기동 (DB 미포함 — HealthModule은 PrismaModule 의존 없음)
