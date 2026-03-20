package service

import (
	"context"
	"log/slog"
)

// EmailService is a placeholder for email sending functionality.
// For MVP, all methods log the email content instead of sending real emails.
//
// To integrate a real email provider (e.g., SendGrid, AWS SES, Mailgun):
// 1. Add the provider SDK to go.mod
// 2. Initialize the provider client in NewEmailService
// 3. Replace slog.Info calls with actual send operations
// 4. Set cfg.Enabled = true in production config
type EmailService struct {
	enabled   bool
	smtpHost  string
	smtpPort  int
	fromEmail string
	fromName  string
}

type EmailConfig struct {
	Enabled   bool
	SMTPHost  string
	SMTPPort  int
	FromEmail string
	FromName  string
}

func NewEmailService(cfg EmailConfig) *EmailService {
	return &EmailService{
		enabled:   cfg.Enabled,
		smtpHost:  cfg.SMTPHost,
		smtpPort:  cfg.SMTPPort,
		fromEmail: cfg.FromEmail,
		fromName:  cfg.FromName,
	}
}

// SendTeamApproved notifies a user that their team has been approved.
func (s *EmailService) SendTeamApproved(ctx context.Context, email, teamName string) error {
	subject := "Tim Anda Telah Disetujui - PORJAR"
	body := "Selamat! Tim " + teamName + " telah disetujui dan dapat mengikuti turnamen."

	return s.send(ctx, email, subject, body)
}

// SendTeamRejected notifies a user that their team has been rejected.
func (s *EmailService) SendTeamRejected(ctx context.Context, email, teamName, reason string) error {
	subject := "Tim Anda Ditolak - PORJAR"
	body := "Tim " + teamName + " ditolak. Alasan: " + reason

	return s.send(ctx, email, subject, body)
}

// SendMatchReminder sends a reminder about an upcoming match.
func (s *EmailService) SendMatchReminder(ctx context.Context, email, matchTitle, scheduledAt string) error {
	subject := "Pengingat Pertandingan - PORJAR"
	body := "Pertandingan " + matchTitle + " dijadwalkan pada " + scheduledAt + ". Pastikan tim Anda siap!"

	return s.send(ctx, email, subject, body)
}

// SendPasswordReset sends a password reset link to the user.
func (s *EmailService) SendPasswordReset(ctx context.Context, email, resetToken string) error {
	subject := "Reset Password - PORJAR"
	body := "Gunakan token berikut untuk mereset password Anda: " + resetToken

	return s.send(ctx, email, subject, body)
}

// send is the internal method that either sends a real email or logs it.
// For MVP, this only logs. Replace with actual SMTP/API call when ready.
func (s *EmailService) send(ctx context.Context, to, subject, body string) error {
	if !s.enabled {
		slog.Info("email service disabled, logging email",
			"to", to,
			"subject", subject,
			"body", body,
			"from", s.fromEmail,
		)
		return nil
	}

	// TODO: Implement actual email sending here.
	// Example with SendGrid:
	//   client := sendgrid.NewSendClient(apiKey)
	//   message := mail.NewSingleEmail(from, subject, to, body, htmlBody)
	//   _, err := client.Send(message)
	//
	// Example with AWS SES:
	//   sesClient.SendEmail(ctx, &ses.SendEmailInput{...})
	//
	// Example with SMTP:
	//   smtp.SendMail(s.smtpHost+":"+strconv.Itoa(s.smtpPort), auth, s.fromEmail, []string{to}, msg)

	slog.Info("would send email (provider not configured)",
		"to", to,
		"subject", subject,
		"from", s.fromEmail,
	)
	return nil
}
