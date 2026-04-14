export interface News {
  id: number
  title: string
  slug: string
  excerpt: string
  content: string
  category: string
  image_url?: string | null
  published_at: string
  created_at: string
  updated_at: string
}

export interface NewsFormData {
  title: string
  slug: string
  excerpt: string
  content: string
  category: string
  image_url: string
  published_at: string
}

export const NEWS_CATEGORIES = ['Berita', 'Pengumuman', 'Event', 'Hasil'] as const
