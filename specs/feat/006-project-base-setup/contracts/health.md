# API Contract: Health Check

**Module**: `src/modules/health/`  
**Branch**: `feat/#6-project-base-setup`

---

## GET /health

### Purpose

서비스 생존 확인 (alive check). 로드 밸런서, 모니터링 시스템에서 사용.

### Request

```http
GET /health HTTP/1.1
Host: localhost:3000
```

- 인증 불필요
- 요청 본문 없음
- 쿼리 파라미터 없음

### Response (Success)

```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "status": "ok"
}
```

### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `status` | `"ok"` | 서비스가 정상 동작 중임을 나타냄 |

### Performance

- 응답 시간: 100ms 이내 (로컬 개발 환경 기준, SC-002)
- 외부 의존성 없음 (DB 확인 없이 alive 응답만)

### Notes

- Phase 1에서는 DB 연결 상태를 포함하지 않음
- 이후 `@nestjs/terminus` 도입 시 확장 고려
