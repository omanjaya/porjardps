package handler

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"os"
	"path/filepath"
	"runtime"
	"sort"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/jung-kurt/gofpdf"
	"github.com/porjar-denpasar/porjar-api/internal/model"
	"github.com/porjar-denpasar/porjar-api/internal/pkg/response"
)

// getLogoPath returns the absolute path to a logo file in static/logos/
func getLogoPath(filename string) string {
	// Try relative to working directory first
	candidates := []string{
		filepath.Join("static", "logos", filename),
		filepath.Join("/app", "static", "logos", filename),
	}
	// Also try relative to this source file
	_, thisFile, _, ok := runtime.Caller(0)
	if ok {
		dir := filepath.Dir(thisFile)
		candidates = append(candidates, filepath.Join(dir, "..", "..", "..", "static", "logos", filename))
	}
	for _, p := range candidates {
		if _, err := os.Stat(p); err == nil {
			return p
		}
	}
	return ""
}

// credentialCard holds the data for a single credential card.
type credentialCard struct {
	FullName          string
	NISN              string
	Password          string
	SchoolName        string
	TeamName          string
	GameDisplay       string
	Tingkat           string
	Role              string // ketua / anggota
}

// generateSchoolCredentialPDF generates the credential PDF bytes for a given school.
// Returns (pdfBytes, schoolName, error).
func (h *ImportHandler) generateSchoolCredentialPDF(ctx context.Context, schoolUUID uuid.UUID) ([]byte, string, error) {
	// Get school info
	school, err := h.schoolRepo.FindByID(ctx, schoolUUID)
	if err != nil || school == nil {
		return nil, "", fmt.Errorf("sekolah tidak ditemukan")
	}

	// Get all NISN users
	filter := model.UserNISNFilter{}
	users, err := h.userRepo.ListByNISN(ctx, filter)
	if err != nil {
		return nil, "", fmt.Errorf("gagal mengambil data pengguna")
	}

	// Cache games
	allGames, _ := h.gameRepo.List(ctx)

	// Build cards grouped by game
	gameCards := map[string][]credentialCard{} // gameDisplay -> cards

	for _, u := range users {
		if u.NISN == nil {
			continue
		}

		nisn := *u.NISN
		nomorPertandingan := ""
		if u.NomorPertandingan != nil {
			nomorPertandingan = *u.NomorPertandingan
		}
		tingkat := ""
		if u.Tingkat != nil {
			tingkat = *u.Tingkat
		}

		// Find team for this user that belongs to the target school
		found := false
		for _, game := range allGames {
			team, err := h.teamRepo.FindByUserAndGame(ctx, u.ID, game.ID)
			if err != nil || team == nil {
				continue
			}

			// Check if team belongs to target school
			if team.SchoolID == nil || *team.SchoolID != schoolUUID {
				continue
			}

			memberRole := "Anggota"
			member, err := h.teamMemberRepo.FindByTeamAndUser(ctx, team.ID, u.ID)
			if err == nil && member != nil && member.Role == "captain" {
				memberRole = "Ketua"
			}

			// Get game display name
			gameDisplay := nomorPertandingan
			if gameDisplay == "" {
				gameDisplay = game.Name
			} else {
				nomorLower := strings.ToLower(nomorPertandingan)
				if display, ok := nomorPertandinganDisplay[nomorLower]; ok {
					gameDisplay = display
				}
			}

			// Password: show NISN only if user still needs to change password
			password := nisn
			if !u.NeedsPasswordChange {
				password = "Sudah diubah"
			}

			card := credentialCard{
				FullName:    u.FullName,
				NISN:        nisn,
				Password:    password,
				SchoolName:  school.Name,
				TeamName:    team.Name,
				GameDisplay: gameDisplay,
				Tingkat:     tingkat,
				Role:        memberRole,
			}

			gameCards[gameDisplay] = append(gameCards[gameDisplay], card)
			found = true
			break
		}
		_ = found
	}

	if len(gameCards) == 0 {
		return nil, "", fmt.Errorf("tidak ada peserta ditemukan untuk sekolah ini")
	}

	// Sort game names
	gameNames := make([]string, 0, len(gameCards))
	for name := range gameCards {
		gameNames = append(gameNames, name)
	}
	sort.Strings(gameNames)

	// Generate PDF
	pdf := gofpdf.New("P", "mm", "A4", "")
	pdf.SetAutoPageBreak(true, 15)

	// Register logo images
	logoKota := getLogoPath("kota-denpasar.png")
	logoESI := getLogoPath("esi-denpasar.png")
	hasLogos := false
	if logoKota != "" && logoESI != "" {
		pdf.RegisterImageOptions(logoKota, gofpdf.ImageOptions{ImageType: "PNG"})
		pdf.RegisterImageOptions(logoESI, gofpdf.ImageOptions{ImageType: "PNG"})
		hasLogos = true
	}

	drawPageHeader := func(gameName, schoolName string) {
		pageW := 190.0
		if hasLogos {
			logoSize := 12.0
			pdf.ImageOptions(logoKota, 10, pdf.GetY(), logoSize, logoSize, false, gofpdf.ImageOptions{ImageType: "PNG"}, 0, "")
			pdf.ImageOptions(logoESI, 10+pageW-logoSize, pdf.GetY(), logoSize, logoSize, false, gofpdf.ImageOptions{ImageType: "PNG"}, 0, "")
			pdf.SetFont("Helvetica", "B", 14)
			pdf.SetTextColor(180, 30, 30)
			pdf.SetX(10 + logoSize + 2)
			pdf.CellFormat(pageW-2*(logoSize+2), 6, "PORJAR ESPORT 2026", "", 1, "C", false, 0, "")
			pdf.SetFont("Helvetica", "B", 11)
			pdf.SetX(10 + logoSize + 2)
			pdf.CellFormat(pageW-2*(logoSize+2), 5, gameName, "", 1, "C", false, 0, "")
			pdf.SetFont("Helvetica", "", 9)
			pdf.SetTextColor(100, 100, 100)
			pdf.SetX(10 + logoSize + 2)
			pdf.CellFormat(pageW-2*(logoSize+2), 5, schoolName, "", 1, "C", false, 0, "")
		} else {
			pdf.SetFont("Helvetica", "B", 16)
			pdf.SetTextColor(180, 30, 30)
			pdf.CellFormat(pageW, 10, fmt.Sprintf("PORJAR ESPORT 2026 - %s", gameName), "", 1, "C", false, 0, "")
			pdf.SetFont("Helvetica", "", 10)
			pdf.SetTextColor(100, 100, 100)
			pdf.CellFormat(pageW, 6, schoolName, "", 1, "C", false, 0, "")
		}
		pdf.Ln(3)
	}

	pageW := 190.0
	cardW := pageW/2.0 - 3.0
	cardH := 52.0
	marginL := 10.0
	gapX := 6.0
	gapY := 5.0
	teamHeaderH := 8.0

	for _, gameName := range gameNames {
		cards := gameCards[gameName]

		sort.Slice(cards, func(i, j int) bool {
			if cards[i].TeamName != cards[j].TeamName {
				return cards[i].TeamName < cards[j].TeamName
			}
			return cards[i].FullName < cards[j].FullName
		})

		type teamGroup struct {
			Name  string
			Cards []credentialCard
		}
		var teams []teamGroup
		var currentTeam string
		for _, card := range cards {
			if card.TeamName != currentTeam {
				teams = append(teams, teamGroup{Name: card.TeamName, Cards: []credentialCard{card}})
				currentTeam = card.TeamName
			} else {
				teams[len(teams)-1].Cards = append(teams[len(teams)-1].Cards, card)
			}
		}

		pdf.AddPage()
		drawPageHeader(gameName, school.Name)
		pdf.Ln(1)

		startY := pdf.GetY()
		col := 0
		row := 0

		for _, team := range teams {
			if col != 0 {
				col = 0
				row++
			}

			headerY := startY + float64(row)*(cardH+gapY)
			if headerY+teamHeaderH+cardH > 280 {
				pdf.AddPage()
				drawPageHeader(gameName, school.Name)
				pdf.Ln(1)
				startY = pdf.GetY()
				row = 0
				col = 0
			}

			teamY := startY + float64(row)*(cardH+gapY)
			pdf.SetFillColor(40, 60, 120)
			pdf.RoundedRect(marginL, teamY, pageW, 6, 1.5, "1234", "F")
			pdf.SetFont("Helvetica", "B", 9)
			pdf.SetTextColor(255, 255, 255)
			pdf.SetXY(marginL+4, teamY+0.5)
			pdf.CellFormat(pageW-8, 5, team.Name, "", 0, "L", false, 0, "")
			startY += teamHeaderH

			for _, card := range team.Cards {
				x := marginL + float64(col)*(cardW+gapX)
				y := startY + float64(row)*(cardH+gapY)

				if y+cardH > 280 {
					pdf.AddPage()
					pdf.SetFont("Helvetica", "B", 16)
					pdf.SetTextColor(180, 30, 30)
					pdf.CellFormat(pageW, 10, fmt.Sprintf("PORJAR ESPORT 2026 - %s", gameName), "", 1, "C", false, 0, "")
					pdf.SetFont("Helvetica", "", 10)
					pdf.SetTextColor(100, 100, 100)
					pdf.CellFormat(pageW, 6, school.Name, "", 1, "C", false, 0, "")
					pdf.Ln(4)
					startY = pdf.GetY()
					row = 0
					col = 0
					x = marginL
					y = startY
				}

				drawCredentialCard(pdf, x, y, cardW, cardH, card)

				col++
				if col >= 2 {
					col = 0
					row++
				}
			}
		}
	}

	pdfBytes, err := pdfToBytes(pdf)
	if err != nil {
		return nil, "", fmt.Errorf("gagal generate PDF: %w", err)
	}

	return pdfBytes, school.Name, nil
}

// ExportCredentialsPDF generates a PDF with credential cards grouped by game for a specific school.
// GET /admin/import/credentials/pdf?school_id=xxx
func (h *ImportHandler) ExportCredentialsPDF(c *fiber.Ctx) error {
	schoolID := c.Query("school_id")
	if schoolID == "" {
		return response.BadRequest(c, "school_id wajib diisi")
	}

	schoolUUID, err := uuid.Parse(schoolID)
	if err != nil {
		return response.BadRequest(c, "school_id tidak valid")
	}

	pdfBytes, schoolName, err := h.generateSchoolCredentialPDF(c.Context(), schoolUUID)
	if err != nil {
		return response.BadRequest(c, err.Error())
	}

	safeName := strings.ReplaceAll(schoolName, " ", "_")
	filename := fmt.Sprintf("kredensial_%s.pdf", safeName)

	c.Set("Content-Type", "application/pdf")
	c.Set("Content-Disposition", fmt.Sprintf("attachment; filename=\"%s\"", filename))
	return c.Send(pdfBytes)
}

// GenerateCredentialLink generates a temporary public download link for a school's credentials PDF.
// POST /admin/import/credentials/link
// Body: { "school_id": "uuid" }
func (h *ImportHandler) GenerateCredentialLink(c *fiber.Ctx) error {
	var body struct {
		SchoolID string `json:"school_id"`
	}
	if err := c.BodyParser(&body); err != nil {
		return response.BadRequest(c, "Body tidak valid")
	}
	if body.SchoolID == "" {
		return response.BadRequest(c, "school_id wajib diisi")
	}

	schoolUUID, err := uuid.Parse(body.SchoolID)
	if err != nil {
		return response.BadRequest(c, "school_id tidak valid")
	}

	// Verify school exists
	school, err := h.schoolRepo.FindByID(c.Context(), schoolUUID)
	if err != nil || school == nil {
		return response.NotFound(c, "Sekolah tidak ditemukan")
	}

	// Generate 32-byte random token
	tokenBytes := make([]byte, 32)
	if _, err := rand.Read(tokenBytes); err != nil {
		return response.BadRequest(c, "Gagal generate token")
	}
	token := hex.EncodeToString(tokenBytes)

	// Generate 6-digit PIN
	pinBytes := make([]byte, 3)
	if _, err := rand.Read(pinBytes); err != nil {
		return response.BadRequest(c, "Gagal generate PIN")
	}
	pin := fmt.Sprintf("%06d", int(pinBytes[0])<<16|int(pinBytes[1])<<8|int(pinBytes[2]))
	pin = pin[len(pin)-6:] // ensure 6 digits

	// Store in Redis: credential_link:TOKEN -> school_id|pin, TTL 7 days
	redisKey := "credential_link:" + token
	redisValue := body.SchoolID + "|" + pin
	ttl := 7 * 24 * time.Hour
	if err := h.rdb.Set(c.Context(), redisKey, redisValue, ttl).Err(); err != nil {
		return response.BadRequest(c, "Gagal menyimpan token")
	}

	return response.OK(c, fiber.Map{
		"token":      token,
		"pin":        pin,
		"url":        "/api/v1/public/credentials/" + token,
		"expires_in": int(ttl.Seconds()),
	})
}

// PublicCredentialDownload serves the credential PDF for a valid token + PIN.
// GET /public/credentials/:token?pin=123456 (NO AUTH REQUIRED — PIN is the auth)
func (h *ImportHandler) PublicCredentialDownload(c *fiber.Ctx) error {
	token := c.Params("token")
	if token == "" {
		return response.BadRequest(c, "Token tidak valid")
	}

	pin := c.Query("pin")
	if pin == "" {
		// Return a simple HTML page with PIN input form
		return c.Type("html").SendString(pinEntryHTML(token))
	}

	// Look up token in Redis
	redisKey := "credential_link:" + token
	redisValue, err := h.rdb.Get(c.Context(), redisKey).Result()
	if err != nil {
		return c.Type("html").SendString(errorHTML("Link sudah kadaluarsa atau tidak valid."))
	}

	// Parse school_id|pin from Redis value
	parts := strings.SplitN(redisValue, "|", 2)
	if len(parts) != 2 {
		return response.BadRequest(c, "Data token tidak valid")
	}
	storedSchoolID := parts[0]
	storedPIN := parts[1]

	// Verify PIN
	if pin != storedPIN {
		return c.Type("html").SendString(errorHTML("PIN salah. Silakan coba lagi."))
	}

	schoolUUID, err := uuid.Parse(storedSchoolID)
	if err != nil {
		return response.BadRequest(c, "Data token tidak valid")
	}

	// Generate the PDF
	pdfBytes, schoolName, err := h.generateSchoolCredentialPDF(c.Context(), schoolUUID)
	if err != nil {
		return response.BadRequest(c, err.Error())
	}

	safeName := strings.ReplaceAll(schoolName, " ", "_")
	filename := fmt.Sprintf("Kredensial_%s.pdf", safeName)

	c.Set("Content-Type", "application/pdf")
	c.Set("Content-Disposition", fmt.Sprintf("attachment; filename=\"%s\"", filename))
	return c.Send(pdfBytes)
}

// pinEntryHTML returns a simple, styled HTML page for PIN input
func pinEntryHTML(token string) string {
	return `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Download Kredensial - PORJAR ESPORT 2026</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f5f0eb;display:flex;align-items:center;justify-content:center;min-height:100vh;padding:20px}
.card{background:#fff;border-radius:16px;box-shadow:0 4px 24px rgba(0,0,0,.08);max-width:400px;width:100%;overflow:hidden}
.header{background:#b41e1e;padding:24px;text-align:center;color:#fff}
.header h1{font-size:18px;font-weight:700}
.header p{font-size:13px;opacity:.85;margin-top:4px}
.body{padding:32px 24px}
.body label{display:block;font-size:13px;color:#666;margin-bottom:8px;font-weight:500}
.body input{width:100%;padding:14px 16px;border:2px solid #e5e1dc;border-radius:10px;font-size:20px;text-align:center;letter-spacing:8px;font-weight:700;outline:none;transition:border-color .2s}
.body input:focus{border-color:#b41e1e}
.body button{width:100%;margin-top:16px;padding:14px;background:#b41e1e;color:#fff;border:none;border-radius:10px;font-size:15px;font-weight:600;cursor:pointer;transition:background .2s}
.body button:hover{background:#8b1616}
.note{text-align:center;margin-top:16px;font-size:11px;color:#999}
</style>
</head>
<body>
<div class="card">
<div class="header">
<h1>PORJAR ESPORT 2026</h1>
<p>Download Kartu Kredensial Peserta</p>
</div>
<div class="body">
<form method="GET" action="/api/v1/public/credentials/` + token + `">
<label>Masukkan PIN yang dikirim via WhatsApp</label>
<input type="text" name="pin" maxlength="6" pattern="[0-9]{6}" placeholder="______" required autofocus>
<button type="submit">Download PDF</button>
</form>
<p class="note">PIN berlaku 7 hari sejak dikirim</p>
</div>
</div>
</body>
</html>`
}

// errorHTML returns a styled error page
func errorHTML(message string) string {
	return `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Error - PORJAR ESPORT 2026</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f5f0eb;display:flex;align-items:center;justify-content:center;min-height:100vh;padding:20px}
.card{background:#fff;border-radius:16px;box-shadow:0 4px 24px rgba(0,0,0,.08);max-width:400px;width:100%;padding:40px 24px;text-align:center}
.icon{font-size:48px;margin-bottom:16px}
.card h2{color:#b41e1e;font-size:16px;margin-bottom:8px}
.card p{color:#666;font-size:13px}
.back{display:inline-block;margin-top:20px;color:#b41e1e;font-size:13px;text-decoration:none;font-weight:600}
</style>
</head>
<body>
<div class="card">
<div class="icon">&#9888;</div>
<h2>Gagal</h2>
<p>` + message + `</p>
<a href="javascript:history.back()" class="back">Kembali</a>
</div>
</body>
</html>`
}

func pdfToBytes(pdf *gofpdf.Fpdf) ([]byte, error) {
	var buf strings.Builder
	err := pdf.Output(&buf)
	if err != nil {
		return nil, err
	}
	return []byte(buf.String()), nil
}

func drawCredentialCard(pdf *gofpdf.Fpdf, x, y, w, h float64, card credentialCard) {
	// Card border with rounded corners
	pdf.SetDrawColor(180, 30, 30)
	pdf.SetLineWidth(0.5)
	pdf.RoundedRect(x, y, w, h, 3, "1234", "D")

	// Red header bar
	pdf.SetFillColor(180, 30, 30)
	pdf.Rect(x+0.25, y+0.25, w-0.5, 9, "F")

	// Header text
	pdf.SetFont("Helvetica", "B", 8)
	pdf.SetTextColor(255, 255, 255)
	pdf.SetXY(x+3, y+1.5)
	pdf.CellFormat(w-6, 6, "PORJAR ESPORT 2026", "", 0, "L", false, 0, "")

	// Game badge
	pdf.SetFont("Helvetica", "B", 7)
	pdf.SetXY(x+3, y+1.5)
	pdf.CellFormat(w-6, 6, card.GameDisplay, "", 0, "R", false, 0, "")

	// Content area
	contentY := y + 11
	pdf.SetTextColor(40, 40, 40)

	// Name
	pdf.SetFont("Helvetica", "B", 10)
	pdf.SetXY(x+4, contentY)
	name := card.FullName
	if len(name) > 30 {
		name = name[:27] + "..."
	}
	pdf.CellFormat(w-8, 5, name, "", 0, "L", false, 0, "")
	contentY += 6

	// Team + Role subtitle
	pdf.SetFont("Helvetica", "", 7)
	pdf.SetTextColor(100, 100, 100)
	pdf.SetXY(x+4, contentY)
	teamInfo := card.TeamName
	if teamInfo == "" {
		teamInfo = card.SchoolName
	}
	if card.Role != "" {
		teamInfo += " (" + card.Role + ")"
	}
	pdf.CellFormat(w-8, 4, teamInfo, "", 0, "L", false, 0, "")
	contentY += 6

	// Divider line
	pdf.SetDrawColor(220, 220, 220)
	pdf.SetLineWidth(0.2)
	pdf.Line(x+4, contentY, x+w-4, contentY)
	contentY += 3

	// Login credentials
	pdf.SetFont("Helvetica", "", 7)
	pdf.SetTextColor(100, 100, 100)
	pdf.SetXY(x+4, contentY)
	pdf.CellFormat(20, 4, "NISN", "", 0, "L", false, 0, "")
	pdf.SetFont("Helvetica", "B", 8)
	pdf.SetTextColor(40, 40, 40)
	pdf.CellFormat(w-28, 4, card.NISN, "", 0, "L", false, 0, "")
	contentY += 5

	pdf.SetFont("Helvetica", "", 7)
	pdf.SetTextColor(100, 100, 100)
	pdf.SetXY(x+4, contentY)
	pdf.CellFormat(20, 4, "Password", "", 0, "L", false, 0, "")
	pdf.SetFont("Helvetica", "B", 8)
	pdf.SetTextColor(40, 40, 40)
	pdf.CellFormat(w-28, 4, card.Password, "", 0, "L", false, 0, "")
	contentY += 6

	// Footer note
	pdf.SetFont("Helvetica", "I", 5.5)
	pdf.SetTextColor(150, 150, 150)
	pdf.SetXY(x+4, contentY)
	pdf.CellFormat(w-8, 3, "Ubah password setelah login pertama", "", 0, "L", false, 0, "")
}
