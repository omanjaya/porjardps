'use client'

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
  BarChart, Bar, LabelList,
} from 'recharts'

interface RegistrationByDate { date: string; teams: number; players: number }
interface TeamsByGame { game: string; count: number }
interface TopSchool { school: string; level: string; teams: number }
interface TournamentProgress { name: string; completed: number; total: number }
interface MatchHeatmapCell { day: number; hour: number; count: number }

// Light tooltip matching poster theme
interface TooltipPayloadEntry {
  color: string
  name: string
  value: number
}

interface ChartTooltipProps {
  active?: boolean
  payload?: TooltipPayloadEntry[]
  label?: string
}

function ChartTooltip({ active, payload, label }: ChartTooltipProps) {
  if (!active || !payload || !payload.length) return null
  return (
    <div className="rounded-lg border border-stone-200 bg-white px-3 py-2 shadow-lg">
      <p className="mb-1 text-xs font-medium text-stone-700">{label}</p>
      {payload.map((entry: TooltipPayloadEntry, i: number) => (
        <p key={i} className="text-xs" style={{ color: entry.color }}>
          {entry.name}: <span className="font-semibold">{entry.value}</span>
        </p>
      ))}
    </div>
  )
}

const AXIS_STYLE = { fill: '#78716c', fontSize: 11 }
const GRID_COLOR = 'rgba(168,162,158,0.2)'
const AXIS_LINE = { stroke: '#d6d3d1' }

// ═══ 1. Registration Chart ═══
export function RegistrationChart({ data }: { data: RegistrationByDate[] }) {
  return (
    <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
      <h3 className="mb-4 text-sm font-bold text-stone-700">Registrasi (30 Hari Terakhir)</h3>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} />
            <XAxis dataKey="date" tick={AXIS_STYLE} axisLine={AXIS_LINE} tickLine={false}
              tickFormatter={(v: string) => { const d = new Date(v); return `${d.getDate()}/${d.getMonth() + 1}` }} />
            <YAxis tick={AXIS_STYLE} axisLine={AXIS_LINE} tickLine={false} allowDecimals={false} />
            <RechartsTooltip content={<ChartTooltip />} />
            <Line type="monotone" dataKey="teams" name="Tim" stroke="var(--primary)" strokeWidth={2} dot={false} activeDot={{ r: 4, fill: 'var(--primary)' }} />
            <Line type="monotone" dataKey="players" name="Pemain" stroke="#2563eb" strokeWidth={2} dot={false} activeDot={{ r: 4, fill: '#2563eb' }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

// ═══ 2. Game Distribution ═══
const GAME_COLORS: Record<string, string> = { ml: '#2563eb', hok: '#d97706', ff: '#ea580c', pubgm: '#ca8a04', efootball: '#16a34a' }
function getGameLabel(slug: string) {
  const labels: Record<string, string> = { ml: 'Mobile Legends', hok: 'Honor of Kings', ff: 'Free Fire', pubgm: 'PUBG Mobile', efootball: 'eFootball' }
  return labels[slug] || slug.toUpperCase()
}

export function GameDistributionChart({ data }: { data: TeamsByGame[] }) {
  const total = data.reduce((sum, d) => sum + d.count, 0)
  return (
    <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
      <h3 className="mb-4 text-sm font-bold text-stone-700">Distribusi Tim per Game</h3>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="count" nameKey="game" cx="50%" cy="45%" innerRadius={60} outerRadius={90} paddingAngle={3} strokeWidth={0}>
              {data.map((entry) => <Cell key={entry.game} fill={GAME_COLORS[entry.game] || '#a8a29e'} />)}
            </Pie>
            <RechartsTooltip content={<ChartTooltip />} />
            <Legend verticalAlign="bottom" iconType="circle" iconSize={8}
              formatter={(value: string) => <span className="text-xs text-stone-500">{getGameLabel(value)}</span>} />
            <text x="50%" y="42%" textAnchor="middle" dominantBaseline="middle" className="fill-stone-900 text-2xl font-bold">{total}</text>
            <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle" className="fill-stone-400 text-xs">Total Tim</text>
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

// ═══ 3. Tournament Progress ═══
export function TournamentProgressChart({ data }: { data: TournamentProgress[] }) {
  const chartData = data.map((d) => ({
    name: d.name.length > 25 ? d.name.slice(0, 22) + '...' : d.name,
    completed: d.total > 0 ? Math.round((d.completed / d.total) * 100) : 0,
    remaining: d.total > 0 ? Math.round(((d.total - d.completed) / d.total) * 100) : 0,
    label: `${d.completed}/${d.total}`,
  }))
  return (
    <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
      <h3 className="mb-4 text-sm font-bold text-stone-700">Progress Turnamen</h3>
      <div className="overflow-x-auto">
        <div style={{ minWidth: 420, height: Math.max(200, chartData.length * 48) }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} layout="vertical" margin={{ left: 10, right: 50 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} horizontal={false} />
              <XAxis type="number" domain={[0, 100]} tick={AXIS_STYLE} axisLine={AXIS_LINE} tickLine={false} tickFormatter={(v: number) => `${v}%`} />
              <YAxis type="category" dataKey="name" width={140} tick={AXIS_STYLE} axisLine={false} tickLine={false} />
              <RechartsTooltip content={<ChartTooltip />} />
              <Bar dataKey="completed" name="Selesai" stackId="a" fill="#16a34a" radius={[0, 0, 0, 0]}>
                <LabelList dataKey="label" position="right" style={{ fill: '#78716c', fontSize: 11 }} />
              </Bar>
              <Bar dataKey="remaining" name="Sisa" stackId="a" fill="#e7e5e4" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}

// ═══ 4. Match Heatmap ═══
const DAY_LABELS = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min']

export function MatchHeatmap({ data }: { data: MatchHeatmapCell[] }) {
  const lookup: Record<string, number> = {}
  let maxCount = 1
  for (const cell of data) {
    lookup[`${cell.day}-${cell.hour}`] = cell.count
    if (cell.count > maxCount) maxCount = cell.count
  }

  function getColor(count: number) {
    if (count === 0) return 'bg-stone-100'
    const ratio = count / maxCount
    if (ratio < 0.25) return 'bg-red-100'
    if (ratio < 0.5) return 'bg-red-200'
    if (ratio < 0.75) return 'bg-red-300'
    return 'bg-red-400'
  }

  return (
    <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
      <h3 className="mb-4 text-sm font-bold text-stone-700">Heatmap Aktivitas Pertandingan</h3>
      <div className="overflow-x-auto">
        <div className="min-w-[600px]">
          <div className="flex">
            <div className="w-10 shrink-0" />
            {Array.from({ length: 24 }).map((_, h) => (
              <div key={h} className="flex-1 text-center text-[10px] text-stone-400">
                {h % 3 === 0 ? String(h).padStart(2, '0') : ''}
              </div>
            ))}
          </div>
          {DAY_LABELS.map((label, day) => (
            <div key={day} className="flex items-center gap-0.5 mb-0.5">
              <div className="w-10 shrink-0 text-right pr-2 text-[10px] text-stone-400">{label}</div>
              {Array.from({ length: 24 }).map((_, hour) => {
                const count = lookup[`${day}-${hour}`] || 0
                return (
                  <div key={hour} className={`flex-1 aspect-square rounded-sm ${getColor(count)} transition-colors`}
                    title={`${label} ${String(hour).padStart(2, '0')}:00 — ${count} pertandingan`} />
                )
              })}
            </div>
          ))}
          <div className="mt-3 flex items-center justify-end gap-1 text-[10px] text-stone-400">
            <span>Sedikit</span>
            <div className="h-3 w-3 rounded-sm bg-stone-100 border border-stone-200" />
            <div className="h-3 w-3 rounded-sm bg-red-100" />
            <div className="h-3 w-3 rounded-sm bg-red-200" />
            <div className="h-3 w-3 rounded-sm bg-red-300" />
            <div className="h-3 w-3 rounded-sm bg-red-400" />
            <span>Banyak</span>
          </div>
        </div>
      </div>
    </div>
  )
}

// ═══ 5. School Participation ═══
const LEVEL_COLORS: Record<string, string> = { SMP: '#2563eb', SMA: '#16a34a', SMK: '#d97706' }

export function SchoolParticipationChart({ data }: { data: TopSchool[] }) {
  const chartData = data.map((d) => ({
    name: d.school.length > 28 ? d.school.slice(0, 25) + '...' : d.school,
    teams: d.teams,
    level: d.level,
    fill: LEVEL_COLORS[d.level] || '#a8a29e',
  }))
  return (
    <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
      <h3 className="mb-4 text-sm font-bold text-stone-700">Top 10 Sekolah (Jumlah Tim)</h3>
      <div className="overflow-x-auto">
        <div style={{ minWidth: 420, height: Math.max(200, chartData.length * 40) }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} layout="vertical" margin={{ left: 10, right: 30 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} horizontal={false} />
              <XAxis type="number" tick={AXIS_STYLE} axisLine={AXIS_LINE} tickLine={false} allowDecimals={false} />
              <YAxis type="category" dataKey="name" width={160} tick={AXIS_STYLE} axisLine={false} tickLine={false} />
              <RechartsTooltip content={<ChartTooltip />} />
              <Bar dataKey="teams" name="Tim" radius={[0, 4, 4, 0]}>
                {chartData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                <LabelList dataKey="teams" position="right" style={{ fill: '#78716c', fontSize: 11 }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="mt-3 flex items-center gap-4 justify-center">
        {Object.entries(LEVEL_COLORS).map(([level, color]) => (
          <div key={level} className="flex items-center gap-1.5">
            <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
            <span className="text-xs text-stone-500">{level}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
