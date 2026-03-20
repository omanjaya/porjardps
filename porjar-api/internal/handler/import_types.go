package handler

import (
	"github.com/porjar-denpasar/porjar-api/internal/model"
	"github.com/redis/go-redis/v9"
)

// nomorPertandinganToSlug maps CSV nomor_pertandingan values to game slugs.
var nomorPertandinganToSlug = map[string]string{
	"ml pria":         "ml",
	"ml wanita":       "ml",
	"hok":             "hok",
	"free fire":       "ff",
	"pubg mobile":     "pubgm",
	"efootball solo":  "efootball",
	"efootball duo":   "efootball",
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
}

// NewImportHandler creates a new ImportHandler with all required repositories.
func NewImportHandler(
	schoolRepo model.SchoolRepository,
	teamRepo model.TeamRepository,
	teamMemberRepo model.TeamMemberRepository,
	gameRepo model.GameRepository,
	userRepo model.UserRepository,
	rdb *redis.Client,
) *ImportHandler {
	return &ImportHandler{
		schoolRepo:     schoolRepo,
		teamRepo:       teamRepo,
		teamMemberRepo: teamMemberRepo,
		gameRepo:       gameRepo,
		userRepo:       userRepo,
		rdb:            rdb,
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
