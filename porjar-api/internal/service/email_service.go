package service

import (
	"context"
	"fmt"
	"log/slog"
	"net/smtp"
)

// EmailService sends transactional emails via SMTP.
// When Enabled=false (default), it no-ops (logs only) so local/test environments
// don't need SMTP configured.
type EmailService struct {
	enabled   bool
	smtpHost  string
	smtpPort  int
	username  string
	password  string
	fromEmail string
	fromName  string
}

type EmailConfig struct {
	Enabled   bool
	SMTPHost  string
	SMTPPort  int
	Username  string
	Password  string
	FromEmail string
	FromName  string
}

func NewEmailService(cfg EmailConfig) *EmailService {
	return &EmailService{
		enabled:   cfg.Enabled,
		smtpHost:  cfg.SMTPHost,
		smtpPort:  cfg.SMTPPort,
		username:  cfg.Username,
		password:  cfg.Password,
		fromEmail: cfg.FromEmail,
		fromName:  cfg.FromName,
	}
}

// SendTeamApproved notifies the captain that their team has been approved.
func (s *EmailService) SendTeamApproved(ctx context.Context, email, captainName, teamName string) error {
	subject := "Tim Disetujui - ESI Denpasar"
	body := templateTeamApproved(captainName, teamName)
	return s.sendHTML(ctx, email, subject, body)
}

// SendTeamRejected notifies the captain that their team has been rejected.
func (s *EmailService) SendTeamRejected(ctx context.Context, email, captainName, teamName, reason string) error {
	subject := "Tim Ditolak - ESI Denpasar"
	body := templateTeamRejected(captainName, teamName, reason)
	return s.sendHTML(ctx, email, subject, body)
}

// SendMatchReminder sends a reminder about an upcoming match (within 1 hour).
func (s *EmailService) SendMatchReminder(ctx context.Context, email, playerName, matchTitle, scheduledAt string) error {
	subject := "Pengingat Pertandingan - ESI Denpasar"
	body := templateMatchReminder(playerName, matchTitle, scheduledAt)
	return s.sendHTML(ctx, email, subject, body)
}

// SendPasswordReset sends a password reset link to the user.
func (s *EmailService) SendPasswordReset(ctx context.Context, email, resetToken string) error {
	subject := "Reset Password - ESI Denpasar"
	body := fmt.Sprintf(`<p>Gunakan token berikut untuk mereset password Anda:</p><p><b>%s</b></p>`, resetToken)
	return s.sendHTML(ctx, email, subject, body)
}

// sendHTML sends an HTML email via SMTP PLAIN auth, or logs when disabled.
func (s *EmailService) sendHTML(ctx context.Context, to, subject, htmlBody string) error {
	if !s.enabled {
		slog.Info("email service disabled, skipping send",
			"to", to,
			"subject", subject,
			"from", s.fromEmail,
		)
		return nil
	}

	from := fmt.Sprintf("%s <%s>", s.fromName, s.fromEmail)
	msg := []byte(
		"From: " + from + "\r\n" +
			"To: " + to + "\r\n" +
			"Subject: " + subject + "\r\n" +
			"MIME-Version: 1.0\r\n" +
			"Content-Type: text/html; charset=UTF-8\r\n" +
			"\r\n" +
			htmlBody,
	)

	addr := fmt.Sprintf("%s:%d", s.smtpHost, s.smtpPort)
	var auth smtp.Auth
	if s.username != "" {
		auth = smtp.PlainAuth("", s.username, s.password, s.smtpHost)
	}

	if err := smtp.SendMail(addr, auth, s.fromEmail, []string{to}, msg); err != nil {
		slog.Error("failed to send email",
			"to", to,
			"subject", subject,
			"error", err,
		)
		return err
	}
	slog.Info("email sent", "to", to, "subject", subject)
	return nil
}

// ---------- HTML templates (inline) ----------

const emailBase = `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#1f2937">%s<hr style="margin:24px 0;border:none;border-top:1px solid #e5e7eb"><p style="font-size:12px;color:#6b7280">ESI Denpasar - PORJAR<br>Email otomatis, mohon tidak dibalas.</p></div>`

func templateTeamApproved(captainName, teamName string) string {
	inner := fmt.Sprintf(`
		<h2 style="color:#C41E2A">Tim Disetujui!</h2>
		<p>Halo, <b>%s</b>.</p>
		<p>Tim <b>%s</b> kamu telah disetujui panitia ESI Denpasar.</p>
		<p>Sekarang kamu bisa registrasi ke event aktif.</p>
		<p><a href="https://esidenpasar.com/events" style="display:inline-block;padding:10px 20px;background:#C41E2A;color:#fff;text-decoration:none;border-radius:6px">Lihat Event</a></p>
	`, captainName, teamName)
	return fmt.Sprintf(emailBase, inner)
}

func templateTeamRejected(captainName, teamName, reason string) string {
	if reason == "" {
		reason = "-"
	}
	inner := fmt.Sprintf(`
		<h2 style="color:#C41E2A">Tim Ditolak</h2>
		<p>Halo, <b>%s</b>.</p>
		<p>Mohon maaf, tim <b>%s</b> kamu tidak disetujui panitia ESI Denpasar.</p>
		<p><b>Alasan:</b> %s</p>
		<p>Silakan perbaiki data tim dan daftarkan ulang.</p>
	`, captainName, teamName, reason)
	return fmt.Sprintf(emailBase, inner)
}

func templateMatchReminder(playerName, matchTitle, scheduledAt string) string {
	inner := fmt.Sprintf(`
		<h2 style="color:#C41E2A">Pertandingan Dimulai 1 Jam Lagi</h2>
		<p>Halo, <b>%s</b>.</p>
		<p>Pertandingan <b>%s</b> dijadwalkan pada <b>%s</b>.</p>
		<p>Pastikan kamu dan tim siap tepat waktu.</p>
	`, playerName, matchTitle, scheduledAt)
	return fmt.Sprintf(emailBase, inner)
}
