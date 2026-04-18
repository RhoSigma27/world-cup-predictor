'use client'

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer
} from 'recharts'

const COLORS = [
  '#e8c96b', '#4ade80', '#60a5fa', '#f87171',
  '#a78bfa', '#fb923c', '#34d399', '#f472b6',
]

export default function PointsChart({ data, players }) {
  if (!data || data.length === 0) {
    return (
      <div className="mt-8 bg-gray-900 border border-gray-800 rounded-2xl p-8 text-center">
        <div className="text-3xl mb-3">📈</div>
        <p className="text-gray-400 text-sm">Points progression will appear here once matches kick off</p>
      </div>
    )
  }

  return (
    <div className="mt-8 bg-gray-900 border border-gray-800 rounded-2xl p-6">
      <h2 className="text-xl font-bold mb-6">📈 Points Progression</h2>
      <ResponsiveContainer width="100%" height={350}>
        <LineChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)"/>
          <XAxis
            dataKey="match"
            stroke="#6b7280"
            tick={{ fill: '#6b7280', fontSize: 11 }}
            label={{ value: 'Match #', position: 'insideBottom', offset: -2, fill: '#6b7280', fontSize: 11 }}
          />
          <YAxis
            stroke="#6b7280"
            tick={{ fill: '#6b7280', fontSize: 11 }}
            label={{ value: 'Points', angle: -90, position: 'insideLeft', fill: '#6b7280', fontSize: 11 }}
          />
          <Tooltip
            contentStyle={{
              background: '#1f2937',
              border: '1px solid rgba(201,168,76,0.3)',
              borderRadius: '8px',
              color: '#f0f4ff',
            }}
            labelFormatter={(label) => `Match ${label}`}
          />
          <Legend
            wrapperStyle={{ color: '#9ca3af', fontSize: 12, paddingTop: 16 }}
          />
          {players.map((player, i) => (
            <Line
              key={player}
              type="monotone"
              dataKey={player}
              stroke={COLORS[i % COLORS.length]}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
              connectNulls
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}