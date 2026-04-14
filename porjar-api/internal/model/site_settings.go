package model

import "time"

type FAQItem struct {
	Question string `json:"question"`
	Answer   string `json:"answer"`
}

type AboutItem struct {
	Icon        string `json:"icon"`
	Title       string `json:"title"`
	Description string `json:"description"`
}

type ContactItem struct {
	Name  string `json:"name"`
	Phone string `json:"phone"`
	Role  string `json:"role,omitempty"`
}

type SiteSettings struct {
	ID         int           `json:"id" db:"id"`
	FAQs       []FAQItem     `json:"faqs" db:"faqs"`
	AboutItems []AboutItem   `json:"about_items" db:"about_items"`
	Contacts   []ContactItem `json:"contacts" db:"contacts"`
	UpdatedAt  time.Time     `json:"updated_at" db:"updated_at"`
}
