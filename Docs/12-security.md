# Security — PORJAR Denpasar Esport

## Principles

- Defense in depth: multiple layers, not just one check
- Least privilege: each role only accesses what it needs
- Fail securely: deny by default, grant explicitly
- Never trust client input

---

## Authentication

### JWT Configuration

```go
// Access token
Algorithm : HS256
Expiry    : 15 minutes
Claims    : user_id, role, email, iat, exp

// Refresh token
Type      : opaque random string (32 bytes, hex-encoded)
Storage   : Redis with TTL 7 days
Rotation  : each refresh generates a new refresh token (old one invalidated)
```

### Token Storage (Frontend)

```
Access Token  -> memory only (Zustand store, not localStorage)
Refresh Token -> httpOnly cookie (SameSite=Strict, Secure=true)
```

Rationale:
- `httpOnly` cookie: inaccessible to JavaScript, prevents XSS token theft
- `SameSite=Strict`: prevents CSRF
- Access token in memory: short-lived, lost on page refresh (triggers silent refresh)

### Silent Token Refresh

```typescript
// Access token expired -> use refresh token silently
// User never sees a re-login unless refresh token also expired

apiClient.interceptors.response.use(
    response => response,
    async error => {
        if (error.response?.status === 401 && error.config && !error.config._retry) {
            error.config._retry = true
            await refreshAccessToken()  // uses httpOnly cookie automatically
            return apiClient(error.config)
        }
        return Promise.reject(error)
    }
)
```

### Brute Force Protection

```go
// Redis-based rate limiting per email
// Key: "login_attempts:{email}"
// Max: 5 attempts per 15 minutes
// After lock: return 401 ACCOUNT_LOCKED with retry_after seconds
```

---

## Authorization (Role-Based Access Control)

### Middleware

```go
// Every protected route specifies allowed roles

router.GET("/teams", AuthMiddleware(), handler.ListTeams)                          // public data, but auth optional
router.POST("/teams", AuthMiddleware(), RoleMiddleware("player"), handler.CreateTeam)
router.PUT("/admin/teams/:id/approve", AuthMiddleware(), RoleMiddleware("admin", "superadmin"), handler.ApproveTeam)
router.PUT("/admin/users/:id/role", AuthMiddleware(), RoleMiddleware("superadmin"), handler.ChangeUserRole)
```

### Resource Ownership Checks

Beyond role checks, verify the requesting user can access the specific resource:

```go
// A player can only manage their own team (where they are captain)
func (h *TeamHandler) UpdateTeam(c *fiber.Ctx) error {
    teamID := c.Params("id")
    requester := auth.FromContext(c)

    if requester.Role == "player" {
        team, err := h.teamService.GetByID(c.Context(), teamID)
        if err != nil {
            return response.NotFound(c, "team not found")
        }
        if team.CaptainUserID != requester.UserID {
            return response.Forbidden(c, "FORBIDDEN_RESOURCE")
        }
    }

    // proceed
}
```

### Role Permission Matrix

| Endpoint | player | admin | superadmin |
|---|---|---|---|
| POST /auth/register | public | public | public |
| POST /teams | yes (own) | no | no |
| PUT /teams/:id | captain only | yes | yes |
| POST /teams/:id/members | captain only | yes | yes |
| GET /teams | public | public | public |
| POST /tournaments/:id/register | captain only | no | no |
| POST /admin/tournaments | no | yes | yes |
| POST /admin/tournaments/:id/generate-bracket | no | yes | yes |
| PUT /admin/matches/:id/score | no | yes | yes |
| POST /admin/matches/:id/complete | no | yes | yes |
| PUT /admin/teams/:id/approve | no | yes | yes |
| POST /admin/lobbies/:id/results | no | yes | yes |
| PUT /admin/users/:id/role | no | no | yes |
| GET /admin/users | no | no | yes |

---

## Input Validation & Injection Prevention

### SQL Injection

```go
// Always use parameterized queries — never string concatenation

// Safe
row := db.QueryRow(ctx, "SELECT * FROM teams WHERE id = $1", id)

// Never do this
query := "SELECT * FROM teams WHERE id = '" + id + "'"  // vulnerable
```

pgx (PostgreSQL driver for Go) uses parameterized queries by default.

### XSS Prevention

```go
// Sanitize HTML content before storing
// Only applies to rich text fields (tournament rules)

import "github.com/microcosm-cc/bluemonday"

policy := bluemonday.UGCPolicy()
sanitized := policy.Sanitize(input.Rules)
```

On the frontend, Next.js escapes output by default. Only use `dangerouslySetInnerHTML` for trusted sanitized content (tournament rules).

### Path Traversal (File Upload)

```go
// Generate UUID filename — never use user-provided filename
func SaveUpload(file multipart.File, header *multipart.FileHeader) (string, error) {
    // Validate mime type from file content, not extension
    buf := make([]byte, 512)
    file.Read(buf)
    mimeType := http.DetectContentType(buf)

    allowed := map[string]string{
        "image/jpeg": ".jpg",
        "image/png":  ".png",
        "image/webp": ".webp",
    }

    ext, ok := allowed[mimeType]
    if !ok {
        return "", apperror.New("INVALID_FILE_TYPE", ...)
    }

    filename := uuid.New().String() + ext
    path := filepath.Join(uploadDir, filename)
    ...
}
```

### Request Size Limits

```go
// Prevent large payload attacks
app := fiber.New(fiber.Config{
    BodyLimit:    10 * 1024 * 1024, // 10MB max body
    ReadTimeout:  15 * time.Second,
    WriteTimeout: 15 * time.Second,
})
```

---

## Rate Limiting

```go
// Global: 100 requests/minute per IP
// Login endpoint: 5 requests/minute per IP
// File upload: 10 requests/minute per user
// WebSocket connect: 10 connections/minute per IP

// Implemented via Redis sliding window
```

---

## CORS

```go
// Allow only known origins — never wildcard in production
app.Use(cors.New(cors.Config{
    AllowOrigins:     "https://esport.porjar-denpasar.id",
    AllowMethods:     "GET,POST,PUT,PATCH,DELETE",
    AllowHeaders:     "Origin,Content-Type,Authorization",
    AllowCredentials: true,       // required for httpOnly cookie
    MaxAge:           12 * 3600,  // 12 hours
}))
```

---

## HTTPS

- All traffic enforced HTTPS (Nginx + Certbot)
- HTTP requests auto-redirected to HTTPS
- HSTS header set: `Strict-Transport-Security: max-age=31536000`

---

## Security Headers

```go
// Middleware to set security headers on all responses
func SecurityHeaders() fiber.Handler {
    return func(c *fiber.Ctx) error {
        c.Set("X-Content-Type-Options", "nosniff")
        c.Set("X-Frame-Options", "DENY")
        c.Set("X-XSS-Protection", "1; mode=block")
        c.Set("Referrer-Policy", "strict-origin-when-cross-origin")
        c.Set("Content-Security-Policy", "default-src 'self'; img-src 'self' data: https:; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; connect-src 'self' wss:")
        return c.Next()
    }
}
```

> CSP `connect-src` includes `wss:` to allow WebSocket connections.

---

## WebSocket Security

```go
// WebSocket connections:
// - No auth required for read-only live score subscriptions (public data)
// - Rate limit on connection attempts (10/minute per IP)
// - Message size limit: 4KB per message
// - Idle timeout: disconnect after 5 minutes of no ping/pong
// - Origin validation: only accept connections from allowed origins
```

---

## Sensitive Data Handling

```go
// Never log passwords, tokens, or personal identifiers
// Never return password_hash in any API response

// Ensure password is never serialized to JSON
type User struct {
    ID           uuid.UUID `json:"id"`
    Email        string    `json:"email"`
    Role         string    `json:"role"`
    PasswordHash string    `json:"-"`  // never included in JSON output
}

// Room credentials (BR lobby) only visible to registered teams
// Not included in public lobby response
```

---

## Audit Log

Record all sensitive mutations for traceability:

Actions to audit:
- User login / logout / failed login
- Team approve / reject
- Tournament create / status change
- Bracket generate
- Match score update / complete
- BR lobby result input
- User role change
- Schedule create / update / delete

```go
// internal/service/audit.go
func (s *AuditService) Log(ctx context.Context, entry AuditEntry) {
    s.repo.Create(ctx, &model.ActivityLog{
        UserID:     entry.UserID,
        Action:     entry.Action,
        EntityType: entry.EntityType,
        EntityID:   entry.EntityID,
        Details:    entry.Details,
        IPAddress:  entry.IPAddress,
    })
}
```

---

## Dependency Security

```bash
# Go — check for known vulnerabilities
govulncheck ./...

# Frontend
npm audit
```

Run both in CI pipeline on every push.

---

## Pre-Deploy Security Checklist

- [ ] All environment variables set (no defaults left)
- [ ] JWT secret is randomly generated (min 32 bytes)
- [ ] Database not exposed to public internet
- [ ] Redis not exposed to public internet
- [ ] Redis requires password in production
- [ ] CORS origins are specific (no wildcard)
- [ ] File upload directory not web-accessible directly
- [ ] HTTPS enforced
- [ ] Rate limiting active
- [ ] Security headers verified
- [ ] WebSocket origin validation enabled
- [ ] `govulncheck` passes
- [ ] `npm audit` passes
- [ ] No test credentials in production seed
