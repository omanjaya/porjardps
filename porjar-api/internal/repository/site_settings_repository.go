package repository

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/porjar-denpasar/porjar-api/internal/model"
)

type SiteSettingsRepo struct {
	db *pgxpool.Pool
}

func NewSiteSettingsRepo(db *pgxpool.Pool) *SiteSettingsRepo {
	return &SiteSettingsRepo{db: db}
}

func (r *SiteSettingsRepo) Get(ctx context.Context) (*model.SiteSettings, error) {
	const q = `SELECT id, faqs, about_items, contacts, updated_at FROM site_settings WHERE id = 1`
	var s model.SiteSettings
	var faqsRaw, aboutRaw, contactsRaw []byte
	err := r.db.QueryRow(ctx, q).Scan(&s.ID, &faqsRaw, &aboutRaw, &contactsRaw, &s.UpdatedAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			// Initialize empty row
			_, ierr := r.db.Exec(ctx, `INSERT INTO site_settings (id, faqs, about_items, contacts) VALUES (1, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb) ON CONFLICT (id) DO NOTHING`)
			if ierr != nil {
				return nil, fmt.Errorf("init site_settings: %w", ierr)
			}
			return &model.SiteSettings{ID: 1, FAQs: []model.FAQItem{}, AboutItems: []model.AboutItem{}, Contacts: []model.ContactItem{}}, nil
		}
		return nil, fmt.Errorf("get site_settings: %w", err)
	}
	if err := json.Unmarshal(faqsRaw, &s.FAQs); err != nil {
		return nil, fmt.Errorf("unmarshal faqs: %w", err)
	}
	if err := json.Unmarshal(aboutRaw, &s.AboutItems); err != nil {
		return nil, fmt.Errorf("unmarshal about_items: %w", err)
	}
	if err := json.Unmarshal(contactsRaw, &s.Contacts); err != nil {
		return nil, fmt.Errorf("unmarshal contacts: %w", err)
	}
	if s.FAQs == nil {
		s.FAQs = []model.FAQItem{}
	}
	if s.AboutItems == nil {
		s.AboutItems = []model.AboutItem{}
	}
	if s.Contacts == nil {
		s.Contacts = []model.ContactItem{}
	}
	return &s, nil
}

func (r *SiteSettingsRepo) Update(ctx context.Context, s *model.SiteSettings) (*model.SiteSettings, error) {
	if s.FAQs == nil {
		s.FAQs = []model.FAQItem{}
	}
	if s.AboutItems == nil {
		s.AboutItems = []model.AboutItem{}
	}
	if s.Contacts == nil {
		s.Contacts = []model.ContactItem{}
	}
	faqs, err := json.Marshal(s.FAQs)
	if err != nil {
		return nil, fmt.Errorf("marshal faqs: %w", err)
	}
	about, err := json.Marshal(s.AboutItems)
	if err != nil {
		return nil, fmt.Errorf("marshal about_items: %w", err)
	}
	contacts, err := json.Marshal(s.Contacts)
	if err != nil {
		return nil, fmt.Errorf("marshal contacts: %w", err)
	}
	const q = `
		INSERT INTO site_settings (id, faqs, about_items, contacts, updated_at)
		VALUES (1, $1::jsonb, $2::jsonb, $3::jsonb, NOW())
		ON CONFLICT (id) DO UPDATE SET
			faqs = EXCLUDED.faqs,
			about_items = EXCLUDED.about_items,
			contacts = EXCLUDED.contacts,
			updated_at = NOW()
	`
	if _, err := r.db.Exec(ctx, q, faqs, about, contacts); err != nil {
		return nil, fmt.Errorf("upsert site_settings: %w", err)
	}
	return r.Get(ctx)
}
