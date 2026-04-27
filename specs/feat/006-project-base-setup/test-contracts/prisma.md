# Test Contract: prisma 모듈

**파일**: `src/modules/prisma/prisma.service.spec.ts`  
**테스트 대상**: `src/modules/prisma/prisma.service.ts`

---

## 테스트 우선순위: MEDIUM (DB 연결 훅 검증)

---

## describe: 'PrismaService'

### 테스트 그룹 1: Prisma 7 adapter 생성

```
describe('Prisma 7 adapter 생성')

  test('ConfigService에서 DATABASE_URL을 읽어 PrismaPg adapter를 생성한다')
    - 설정: ConfigService.getOrThrow('DATABASE_URL')이 'postgresql://user:pass@localhost:5432/db' 반환
    - 설정: PrismaPg 생성자를 jest.fn()으로 mock
    - 동작: new PrismaService(configService)
    - 예상: ConfigService.getOrThrow가 'DATABASE_URL'로 호출됨
    - 예상: PrismaPg가 { connectionString } 인자로 호출됨
```

### 테스트 그룹 2: 생명주기 훅

```
describe('생명주기 훅')

  test('onModuleInit 시 $connect가 호출된다')
    - 설정: PrismaClient.$connect를 jest.fn()으로 mock
    - 동작: service.onModuleInit() 호출
    - 예상: $connect가 1회 호출됨

  test('onModuleDestroy 시 $disconnect가 호출된다')
    - 설정: PrismaClient.$disconnect를 jest.fn()으로 mock
    - 동작: service.onModuleDestroy() 호출
    - 예상: $disconnect가 1회 호출됨
```

### 테스트 그룹 3: DB 연결 실패 (FR-007)

```
describe('DB 연결 실패 처리')

  test('$connect 실패 시 예외가 전파된다')
    - 설정: $connect를 Promise.reject(new Error('connection refused'))로 mock
    - 동작: service.onModuleInit() 호출
    - 예상: 예외가 throw됨 (NestJS가 기동 중단)
```

---

## Mock 전략

- generated Prisma Client(`src/generated/prisma/client`)를 모듈 단위 mock
- `@prisma/adapter-pg`의 `PrismaPg`를 mock하여 실제 PostgreSQL 연결을 만들지 않음
- `@nestjs/config`의 `ConfigService`는 `getOrThrow`만 가진 stub 객체로 대체
- `PrismaClient` 생성자와 `$connect`, `$disconnect` 메서드를 jest.fn()으로 대체
- 실제 DB 연결 없음 (단위 테스트)

---

## 통합 검증 (수동)

단위 테스트로 커버하기 어려운 시나리오:
- Prisma 7 schema/config 검증 → `npx prisma validate`
- DB 연결 성공 후 4개 테이블 존재 확인 → `npx prisma migrate dev` 실행 후 DB 직접 확인
- seed 실행 후 `timer_started` 레코드 존재 확인 → `npx prisma db seed` 후 조회
