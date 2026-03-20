'use client'

import { LineChart, Line, ResponsiveContainer } from 'recharts'
import { ArrowUp, ArrowDown } from '@phosphor-icons/react'

interface StatTrendProps {
  label: string
  value: number | string
  trend: string
  sparklineData: number[]
}

export function StatTrend({ label, value, trend, sparklineData }: StatTrendProps) {
  const isPositive = trend.startsWith('+')
  const trendColor = isPositive ? 'text-green-600' : 'text-red-600'
  const lineColor = isPositive ? '#16a34a' : '#dc2626'

  const chartData = sparklineData.map((v, i) => ({ i, v }))

  return (
    <div className="flex items-center justify-between rounded-xl border border-stone-200 bg-white px-5 py-4 shadow-sm">
      <div className="min-w-0">
        <p className="text-2xl font-bold tabular-nums text-stone-900">{value}</p>
        <p className="mt-0.5 text-sm text-stone-500">{label}</p>
        <div className={`mt-1 flex items-center gap-1 text-xs font-medium ${trendColor}`}>
          {isPositive ? <ArrowUp size={12} weight="bold" /> : <ArrowDown size={12} weight="bold" />}
          <span>{trend}</span>
        </div>
      </div>
      <div className="h-10 w-20 shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <Line type="monotone" dataKey="v" stroke={lineColor} strokeWidth={1.5} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
