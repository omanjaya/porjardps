package handler

import (
	"github.com/porjar-denpasar/porjar-api/internal/model"
	"github.com/porjar-denpasar/porjar-api/internal/pkg/credcrypto"
	"github.com/redis/go-redis/v9"
)

// nomorPertandinganToSlug maps CSV nomor_pertandingan values to game slugs.
var nomorPertandinganToSlug = map[string]string{
	"ml pria":         "ml-pria",
	"ml wanita":       "ml-wanita",
	"hok":             "hok",
	"free fire":       "ff",
	"pubg mobile":     "pubgm",
	"efootball solo":  "efootball-solo",
	"efootball duo":   "efootball-duo",
}

// nomorPertandinganDisplay maps lowercase key back to a display label for credentials export.
var nomorPertandinganDisplay = map[string]string{
	"ml pria":         "ML Pria",
	"ml wanita":       "ML Wanita",
	"hok":             "HOK",
	"free fire":       "Free Fire",
	"pubg mobile":     "PUBG Mobile",
	"efootball solo":  "eFootball Solo",
	"efootball duo":   "eFootball Duo",
}

// ImportHandler handles bulk CSV import and export of participants, schools, and teams.
type ImportHandler struct {
	schoolRepo     model.SchoolRepository
	teamRepo       model.TeamRepository
	teamMemberRepo model.TeamMemberRepository
	gameRepo       model.GameRepository
	userRepo       model.UserRepository
	rdb            *redis.Client
	encKey         []byte // 32-byte AES-256 key derived from JWT secret
}

// NewImportHandler creates a new ImportHandler with all required repositories.
func NewImportHandler(
	schoolRepo model.SchoolRepository,
	teamRepo model.TeamRepository,
	teamMemberRepo model.TeamMemberRepository,
	gameRepo model.GameRepository,
	userRepo model.UserRepository,
	rdb *redis.Client,
	jwtSecret string,
) *ImportHandler {
	key := credcrypto.DeriveEncKey(jwtSecret)
	return &ImportHandler{
		schoolRepo:     schoolRepo,
		teamRepo:       teamRepo,
		teamMemberRepo: teamMemberRepo,
		gameRepo:       gameRepo,
		userRepo:       userRepo,
		rdb:            rdb,
		encKey:         key,
	}
}

type importResult struct {
	Imported int      `json:"imported"`
	Skipped  int      `json:"skipped"`
	Errors   []string `json:"errors"`
}

type participantImportResult struct {
	ImportedUsers int               `json:"imported_users"`
	ImportedTeams int               `json:"imported_teams"`
	Skipped       int               `json:"skipped"`
	Errors        []string          `json:"errors"`
	Credentials   []credentialEntry `json:"credentials"`
}

type credentialEntry struct {
	Nama     string `json:"nama"`
	NISN     string `json:"nisn"`
	Password string `json:"password"`
	Tim      string `json:"tim"`
	Game     string `json:"game"`
}
