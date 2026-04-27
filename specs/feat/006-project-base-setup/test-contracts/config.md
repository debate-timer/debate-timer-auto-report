# Test Contract: config 모듈

**파일**: `src/modules/config/config.schema.spec.ts`  
**테스트 대상**: `src/modules/config/config.schema.ts` (Joi 환경변수 검증 스키마)

---

## 테스트 우선순위: HIGH (기동 안전성 핵심)

---

## describe: 'ConfigSchema'

### 테스트 그룹 1: 필수 환경변수 존재 검증

```
describe('필수 환경변수 존재 검증')

  test('모든 필수 환경변수가 있을 때 검증에 성공한다')
    - 입력: { NODE_ENV='development', PORT=3000, DATABASE_URL, AMPLITUDE_API_KEY, AMPLITUDE_SECRET_KEY,
              DISCORD_WEBHOOK_URL_TEST, SCHEDULE_WEEKLY_REPORT,
              SCHEDULE_MONTHLY_REPORT, LOG_LEVEL='info' }
    - 예상: error === undefined

  test('DATABASE_URL이 없으면 검증에 실패한다')
    - 입력: DATABASE_URL 제외한 나머지 필수 환경변수
    - 예상: error.message에 'DATABASE_URL' 포함

  test('AMPLITUDE_API_KEY가 없으면 검증에 실패한다')
    - 입력: AMPLITUDE_API_KEY 제외
    - 예상: error.message에 'AMPLITUDE_API_KEY' 포함

  test('AMPLITUDE_SECRET_KEY가 없으면 검증에 실패한다')
    - 입력: AMPLITUDE_SECRET_KEY 제외
    - 예상: error.message에 'AMPLITUDE_SECRET_KEY' 포함

  test('DISCORD_WEBHOOK_URL_TEST가 없으면 검증에 실패한다')
    - 입력: DISCORD_WEBHOOK_URL_TEST 제외
    - 예상: error.message에 'DISCORD_WEBHOOK_URL_TEST' 포함

  test('SCHEDULE_WEEKLY_REPORT가 없으면 검증에 실패한다')
    - 입력: SCHEDULE_WEEKLY_REPORT 제외
    - 예상: error.message에 'SCHEDULE_WEEKLY_REPORT' 포함

  test('SCHEDULE_MONTHLY_REPORT가 없으면 검증에 실패한다')
    - 입력: SCHEDULE_MONTHLY_REPORT 제외
    - 예상: error.message에 'SCHEDULE_MONTHLY_REPORT' 포함
```

### 테스트 그룹 2: LOG_LEVEL 기본값 및 허용값

```
describe('LOG_LEVEL 환경변수 검증')

  test('LOG_LEVEL을 지정하지 않으면 기본값 info가 적용된다')
    - 입력: LOG_LEVEL 미포함 (나머지 필수값은 존재)
    - 예상: value.LOG_LEVEL === 'info'

  test('허용된 LOG_LEVEL 값(fatal|error|warn|info|debug|trace)은 검증에 성공한다')
    - 입력: LOG_LEVEL을 'fatal', 'error', 'warn', 'info', 'debug', 'trace' 각각으로 반복 테스트
    - 예상: 모든 케이스에서 error === undefined

  test('허용되지 않은 LOG_LEVEL 값이면 검증에 실패한다')
    - 입력: LOG_LEVEL='verbose'
    - 예상: error.message에 'LOG_LEVEL' 포함
```

### 테스트 그룹 3: 애플리케이션 기본 환경변수 검증

```
describe('애플리케이션 기본 환경변수 검증')

  test('NODE_ENV를 지정하지 않으면 기본값 development가 적용된다')
    - 입력: NODE_ENV 미포함 (나머지 필수값은 존재)
    - 예상: value.NODE_ENV === 'development'

  test('허용된 NODE_ENV 값(development|test|production)은 검증에 성공한다')
    - 입력: NODE_ENV를 'development', 'test', 'production' 각각으로 반복 테스트
    - 예상: 모든 케이스에서 error === undefined

  test('PORT를 지정하지 않으면 기본값 3000이 적용된다')
    - 입력: PORT 미포함 (나머지 필수값은 존재)
    - 예상: value.PORT === 3000

  test('PORT가 숫자 포트 형식이 아니면 검증에 실패한다')
    - 입력: PORT='not-a-number'
    - 예상: error.message에 'PORT' 포함
```

### 테스트 그룹 4: DATABASE_URL 형식 검증

```
describe('DATABASE_URL 형식 검증')

  test('postgresql:// 또는 postgres:// 형식이 아니면 검증에 실패한다')
    - 입력: DATABASE_URL='not-a-url'
    - 예상: error.message에 'DATABASE_URL' 포함

  test('PostgreSQL이 아닌 URI scheme이면 검증에 실패한다')
    - 입력: DATABASE_URL='mysql://user:pass@localhost:3306/db'
    - 예상: error.message에 'DATABASE_URL' 포함
```

---

## 경계 조건

- 환경변수 값이 빈 문자열('')이면 누락으로 처리
- DATABASE_URL은 `postgresql://...` 또는 `postgres://...` scheme만 허용
- ConfigModule validationOptions는 `{ abortEarly: false, allowUnknown: true }`를 사용
- DISCORD_WEBHOOK_URL_REPORT, ALERT, OPS는 Phase 1에서 선택 사항

---

## Mock 전략

- 순수 함수 테스트 (Joi 스키마 직접 호출)
- 외부 의존성 없음, Mock 불필요
