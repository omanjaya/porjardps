'use client'

import { AdminLayout } from '@/components/layouts/AdminLayout'
import { PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { FloppyDisk } from '@phosphor-icons/react'
import { useSiteSettings } from './hooks/useSiteSettings'
import { FaqEditor } from './components/FaqEditor'
import { AboutEditor } from './components/AboutEditor'
import { ContactEditor } from './components/ContactEditor'
import type { FaqItem, AboutItem, ContactItem } from '@/types/site-settings'

export default function AdminSiteSettingsPage() {
  const { settings, setSettings, loading, saving, save } = useSiteSettings()

  function setFaqs(faqs: FaqItem[]) {
    setSettings({ ...settings, faqs })
  }
  function setAbout(about_items: AboutItem[]) {
    setSettings({ ...settings, about_items })
  }
  function setContacts(contacts: ContactItem[]) {
    setSettings({ ...settings, contacts })
  }

  async function handleSave() {
    await save(settings)
  }

  if (loading) {
    return (
      <AdminLayout>
        <Skeleton className="h-10 w-64 bg-stone-200" />
        <Skeleton className="mt-4 h-96 w-full bg-stone-200" />
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      <PageHeader
        title="Pengaturan Situs"
        description="Kelola FAQ, Tentang Kami, dan kontak yang tampil di halaman publik"
        actions={
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-esi-red hover:bg-esi-red-dark text-white"
          >
            <FloppyDisk size={16} weight="bold" className="mr-1" />
            {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
          </Button>
        }
      />

      <Card className="p-4 mt-4">
        <Tabs defaultValue="faqs">
          <TabsList>
            <TabsTrigger value="faqs">FAQ ({settings.faqs.length})</TabsTrigger>
            <TabsTrigger value="about">Tentang ({settings.about_items.length})</TabsTrigger>
            <TabsTrigger value="contacts">Kontak ({settings.contacts.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="faqs" className="mt-4">
            <FaqEditor items={settings.faqs} onChange={setFaqs} />
          </TabsContent>
          <TabsContent value="about" className="mt-4">
            <AboutEditor items={settings.about_items} onChange={setAbout} />
          </TabsContent>
          <TabsContent value="contacts" className="mt-4">
            <ContactEditor items={settings.contacts} onChange={setContacts} />
          </TabsContent>
        </Tabs>
      </Card>
    </AdminLayout>
  )
}
