package model

import "time"

type News struct {
	ID          int64     `json:"id" db:"id"`
	Title       string    `json:"title" db:"title"`
	Slug        string    `json:"slug" db:"slug"`
	Excerpt     string    `json:"excerpt" db:"excerpt"`
	Content     string    `json:"content,omitempty" db:"content"`
	Category    string    `json:"category" db:"category"`
	ImageURL    *string   `json:"image_url,omitempty" db:"image_url"`
	PublishedAt time.Time `json:"published_at" db:"published_at"`
	CreatedAt   time.Time `json:"created_at" db:"created_at"`
	UpdatedAt   time.Time `json:"updated_at" db:"updated_at"`
}
