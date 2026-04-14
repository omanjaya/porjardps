'use client'

import { BookOpen } from '@phosphor-icons/react'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'

interface Props {
  rulesLoading: boolean
  rulesContent: string | null
}

export function RulesTabContent({ rulesLoading, rulesContent }: Props) {
  if (rulesLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (rulesContent) {
    return (
      <div className="rounded-xl border border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-4 sm:p-6 shadow-sm">
        <div
          className="prose prose-sm prose-stone dark:prose-invert max-w-none
            prose-headings:text-esi-text prose-headings:font-bold
            prose-p:text-stone-600 dark:prose-p:text-zinc-400 prose-p:leading-relaxed
            prose-a:text-esi-red prose-a:no-underline hover:prose-a:underline
            prose-ul:list-disc prose-ol:list-decimal
            prose-li:text-stone-600 dark:prose-li:text-zinc-400 prose-li:marker:text-stone-400 dark:prose-li:marker:text-zinc-500
            prose-strong:text-stone-800 dark:prose-strong:text-zinc-200
            prose-table:border-collapse prose-th:border prose-th:border-stone-200 dark:prose-th:border-zinc-700 prose-th:bg-stone-50 dark:prose-th:bg-zinc-800/50 prose-th:px-3 prose-th:py-2
            prose-td:border prose-td:border-stone-200 dark:prose-td:border-zinc-700 prose-td:px-3 prose-td:py-2"
          dangerouslySetInnerHTML={{ __html: rulesContent }}
        />
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 py-20 shadow-sm">
      <BookOpen size={48} className="text-stone-300 dark:text-zinc-600" />
      <div className="text-center">
        <p className="text-stone-600 dark:text-zinc-400 font-medium">Aturan belum tersedia</p>
        <p className="text-sm text-stone-400 dark:text-zinc-500 mt-1">
          Aturan permainan akan ditampilkan setelah panitia menambahkan aturan.
        </p>
      </div>
    </div>
  )
}
