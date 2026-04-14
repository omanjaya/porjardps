export interface FaqItem {
  question: string
  answer: string
}

export interface AboutItem {
  icon: string
  title: string
  description: string
}

export interface ContactItem {
  name: string
  phone: string
  role?: string
}

export interface SiteSettings {
  id: number
  faqs: FaqItem[]
  about_items: AboutItem[]
  contacts: ContactItem[]
  updated_at?: string
}
