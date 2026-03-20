# Error Catalog — PORJAR Denpasar Esport

## Structure

Every error response follows this format:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable message in Bahasa Indonesia",
    "details": {}
  }
}
```

`details` is optional — used for validation errors to list field-level issues:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Data yang dikirim tidak valid",
    "details": {
      "email": "Email sudah terdaftar",
      "password": "Password minimal 8 karakter"
    }
  }
}
```

---

## Go Implementation

```go
// pkg/apperror/errors.go

type AppError struct {
    Code       string            `json:"code"`
    Message    string            `json:"message"`
    HTTPStatus int               `json:"-"`
    Details    map[string]string `json:"details,omitempty"`
}

func (e *AppError) Error() string {
    return e.Message
}

// Predefined errors
var (
    ErrNotFound     = &AppError{Code: "NOT_FOUND", HTTPStatus: 404}
    ErrUnauthorized = &AppError{Code: "UNAUTHORIZED", HTTPStatus: 401}
    ErrForbidden    = &AppError{Code: "FORBIDDEN", HTTPStatus: 403}
    ErrConflict     = &AppError{Code: "CONFLICT", HTTPStatus: 409}
    ErrValidation   = &AppError{Code: "VALIDATION_ERROR", HTTPStatus: 400}
    ErrBusinessRule = &AppError{Code: "BUSINESS_RULE_VIOLATION", HTTPStatus: 422}
    ErrInternal     = &AppError{Code: "INTERNAL_ERROR", HTTPStatus: 500}
)

// Helper to create specific errors
func NotFound(resource string) *AppError {
    return &AppError{
        Code:       strings.ToUpper(resource) + "_NOT_FOUND",
        Message:    resource + " tidak ditemukan",
        HTTPStatus: 404,
    }
}
```

---

## Auth Errors (401, 403)

| Code | HTTP | Message | Trigger |
|---|---|---|---|
| `UNAUTHORIZED` | 401 | Anda belum login | No/missing token |
| `TOKEN_EXPIRED` | 401 | Sesi telah berakhir, silakan login kembali | Access token expired |
| `TOKEN_INVALID` | 401 | Token tidak valid | Tampered/malformed token |
| `REFRESH_TOKEN_INVALID` | 401 | Refresh token tidak valid atau sudah digunakan | Invalid refresh token |
| `REFRESH_TOKEN_EXPIRED` | 401 | Sesi habis, silakan login kembali | Refresh token expired |
| `INVALID_CREDENTIALS` | 401 | Email atau password salah | Wrong email/password |
| `ACCOUNT_LOCKED` | 401 | Akun dikunci sementara karena terlalu banyak percobaan login | 5+ failed attempts |
| `ACCOUNT_INACTIVE` | 401 | Akun tidak aktif, hubungi administrator | Deactivated account |
| `FORBIDDEN` | 403 | Anda tidak memiliki akses ke halaman ini | Insufficient role |
| `FORBIDDEN_RESOURCE` | 403 | Anda tidak memiliki akses ke data ini | Accessing another user's data |

---

## Validation Errors (400)

| Code | HTTP | Message | Trigger |
|---|---|---|---|
| `VALIDATION_ERROR` | 400 | Data yang dikirim tidak valid | One or more fields fail validation |
| `INVALID_DATE_FORMAT` | 400 | Format tanggal tidak valid (gunakan YYYY-MM-DD) | Wrong date format |
| `INVALID_DATE_RANGE` | 400 | Tanggal akhir harus setelah tanggal mulai | end_date < start_date |
| `INVALID_FILE_TYPE` | 400 | Tipe file tidak diizinkan | Wrong file mime type |
| `FILE_TOO_LARGE` | 400 | Ukuran file melebihi batas 5MB | File > 5MB |
| `INVALID_PHONE` | 400 | Format nomor telepon tidak valid | Phone format wrong |
| `INVALID_EMAIL` | 400 | Format email tidak valid | Email format wrong |
| `REQUIRED_FIELD` | 400 | Field wajib diisi | Missing required field |
| `INVALID_BEST_OF` | 400 | Best-of harus bilangan ganjil (1, 3, atau 5) | Invalid best_of value |

---

## Not Found Errors (404)

| Code | HTTP | Message | Trigger |
|---|---|---|---|
| `USER_NOT_FOUND` | 404 | Pengguna tidak ditemukan | User ID does not exist |
| `TEAM_NOT_FOUND` | 404 | Tim tidak ditemukan | Team ID does not exist |
| `GAME_NOT_FOUND` | 404 | Game tidak ditemukan | Game slug/ID does not exist |
| `SCHOOL_NOT_FOUND` | 404 | Sekolah tidak ditemukan | School ID does not exist |
| `TOURNAMENT_NOT_FOUND` | 404 | Turnamen tidak ditemukan | Tournament ID does not exist |
| `MATCH_NOT_FOUND` | 404 | Pertandingan tidak ditemukan | Match ID does not exist |
| `MATCH_GAME_NOT_FOUND` | 404 | Game dalam seri tidak ditemukan | Match game number does not exist |
| `LOBBY_NOT_FOUND` | 404 | Lobby tidak ditemukan | Lobby ID does not exist |
| `SCHEDULE_NOT_FOUND` | 404 | Jadwal tidak ditemukan | Schedule ID does not exist |
| `MEMBER_NOT_FOUND` | 404 | Anggota tim tidak ditemukan | Team member not found |

---

## Conflict Errors (409)

| Code | HTTP | Message | Trigger |
|---|---|---|---|
| `EMAIL_ALREADY_EXISTS` | 409 | Email sudah terdaftar | Duplicate email on register |
| `TEAM_NAME_EXISTS` | 409 | Nama tim sudah digunakan untuk game ini | Duplicate team name per game |
| `MEMBER_ALREADY_IN_TEAM` | 409 | Pemain sudah tergabung dalam tim ini | Duplicate team member |
| `PLAYER_ALREADY_IN_GAME_TEAM` | 409 | Pemain sudah terdaftar di tim lain untuk game ini | User in another team for same game |
| `TEAM_ALREADY_REGISTERED` | 409 | Tim sudah terdaftar di turnamen ini | Duplicate tournament registration |
| `BRACKET_ALREADY_GENERATED` | 409 | Bracket sudah dibuat untuk turnamen ini | Duplicate bracket generation |
| `LOBBY_RESULT_EXISTS` | 409 | Hasil lobby untuk tim ini sudah diinput | Duplicate lobby result per team |
| `PLACEMENT_TAKEN` | 409 | Placement sudah digunakan oleh tim lain di lobby ini | Duplicate placement in lobby |

---

## Business Rule Errors (422)

| Code | HTTP | Message | Trigger |
|---|---|---|---|
| `TEAM_NOT_APPROVED` | 422 | Tim belum disetujui oleh panitia | Register unapproved team to tournament |
| `TEAM_INSUFFICIENT_MEMBERS` | 422 | Tim belum memenuhi jumlah anggota minimum | Register team with too few members |
| `TEAM_FULL` | 422 | Tim sudah mencapai batas maksimal anggota | Add member to full team |
| `TEAM_SUBSTITUTE_FULL` | 422 | Slot cadangan sudah penuh | Add substitute beyond limit |
| `REGISTRATION_CLOSED` | 422 | Pendaftaran turnamen sudah ditutup | Register after deadline |
| `REGISTRATION_NOT_OPEN` | 422 | Pendaftaran turnamen belum dibuka | Register before start date |
| `TOURNAMENT_FULL` | 422 | Turnamen sudah mencapai batas peserta | Max teams reached |
| `TOURNAMENT_NOT_ONGOING` | 422 | Turnamen tidak dalam status berlangsung | Action on non-ongoing tournament |
| `INSUFFICIENT_TEAMS` | 422 | Minimal 2 tim untuk membuat bracket | Generate bracket with < 2 teams |
| `MATCH_NOT_LIVE` | 422 | Pertandingan tidak dalam status live | Complete non-live match |
| `INVALID_WINNER` | 422 | Pemenang harus salah satu dari tim yang bertanding | Winner not team_a or team_b |
| `SCORE_MISMATCH` | 422 | Skor pemenang harus lebih tinggi | Winner has lower score |
| `SERIES_ALREADY_DECIDED` | 422 | Seri pertandingan sudah diputuskan | Add game after series winner determined |
| `GAME_NUMBER_INVALID` | 422 | Nomor game tidak valid atau sudah ada | Invalid/duplicate game number |
| `CANNOT_EDIT_COMPLETED_MATCH` | 422 | Pertandingan yang sudah selesai tidak dapat diubah | Edit completed match |
| `INVALID_FORMAT_FOR_GAME` | 422 | Format turnamen tidak sesuai dengan tipe game | BR format for bracket game or vice versa |
| `INVALID_STATUS_TRANSITION` | 422 | Perubahan status tidak valid | Invalid tournament/match status change |
| `CANNOT_DELETE_TEAM_IN_TOURNAMENT` | 422 | Tim yang terdaftar di turnamen aktif tidak dapat dihapus | Delete team in active tournament |
| `CANNOT_DELETE_SCHOOL_WITH_TEAMS` | 422 | Sekolah yang memiliki tim tidak dapat dihapus | Delete school with teams |
| `CANNOT_CHANGE_OWN_ROLE` | 422 | Tidak dapat mengubah role sendiri | Admin changes own role |
| `CANNOT_DEMOTE_LAST_SUPERADMIN` | 422 | Tidak dapat menurunkan superadmin terakhir | Demote only superadmin |
| `CAPTAIN_CANNOT_LEAVE` | 422 | Kapten tidak dapat meninggalkan tim, transfer kepemimpinan terlebih dahulu | Captain tries to leave |

---

## Server Errors (500)

| Code | HTTP | Message | Trigger |
|---|---|---|---|
| `INTERNAL_ERROR` | 500 | Terjadi kesalahan pada server, coba lagi nanti | Unhandled exception |
| `DATABASE_ERROR` | 500 | Gagal memproses data, coba lagi nanti | DB connection/query failure |
| `UPLOAD_FAILED` | 500 | Gagal mengunggah file, coba lagi nanti | File storage error |
| `WEBSOCKET_ERROR` | 500 | Gagal terhubung ke live score | WebSocket hub failure |

---

## Frontend Error Handling

```typescript
// lib/api.ts
// Centralized error handler — no scattered try/catch per component

async function apiRequest<T>(url: string, options?: RequestInit): Promise<T> {
    const res = await fetch(url, options)
    const body = await res.json()

    if (!body.success) {
        throw new ApiError(body.error.code, body.error.message, body.error.details)
    }

    return body.data
}

class ApiError extends Error {
    code: string
    details?: Record<string, string>

    constructor(code: string, message: string, details?: Record<string, string>) {
        super(message)
        this.code = code
        this.details = details
    }
}
```

```typescript
// How errors are handled in components via React Query
const { mutate } = useMutation({
    mutationFn: registerTeamToTournament,
    onError: (error: ApiError) => {
        if (error.code === 'VALIDATION_ERROR') {
            Object.entries(error.details ?? {}).forEach(([field, msg]) => {
                form.setError(field, { message: msg })
            })
        } else if (error.code === 'TEAM_INSUFFICIENT_MEMBERS') {
            toast.error('Tim belum memenuhi jumlah anggota minimum. Tambahkan anggota terlebih dahulu.')
        } else if (error.code === 'REGISTRATION_CLOSED') {
            toast.error('Pendaftaran turnamen sudah ditutup.')
        } else {
            toast.error(error.message)
        }
    }
})
```
