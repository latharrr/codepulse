'use client';

import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';

interface ScoreRadarChartProps {
  components: {
    dsa?: number;
    contest?: number;
    consistency?: number;
    breadth?: number;
    build?: number;
    recency?: number;
  } | null;
}

function asPercent(value: number | undefined) {
  return Math.round(Math.max(0, Math.min(1, value ?? 0)) * 100);
}

export function ScoreRadarChart({ components }: ScoreRadarChartProps) {
  if (!components) {
    return (
      <div className="flex h-full w-full items-center justify-center text-sm text-slate-400">
        No score data available yet.
      </div>
    );
  }

  const data = [
    { subject: 'DSA', score: asPercent(components.dsa), fullMark: 100 },
    { subject: 'Contest', score: asPercent(components.contest), fullMark: 100 },
    {
      subject: 'Consistency',
      score: asPercent(components.consistency),
      fullMark: 100,
    },
    { subject: 'Breadth', score: asPercent(components.breadth), fullMark: 100 },
    { subject: 'Build', score: asPercent(components.build), fullMark: 100 },
    { subject: 'Recency', score: asPercent(components.recency), fullMark: 100 },
  ];

  return (
    <ResponsiveContainer width="100%" height="100%">
      <RadarChart cx="50%" cy="50%" outerRadius="70%" data={data}>
        <PolarGrid stroke="rgba(255,255,255,0.2)" />
        <PolarAngleAxis
          dataKey="subject"
          tick={{ fill: 'rgba(255,255,255,0.7)', fontSize: 12 }}
        />
        <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
        <Radar
          name="Score"
          dataKey="score"
          stroke="#60A5FA"
          fill="#60A5FA"
          fillOpacity={0.45}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: 'rgba(0,0,0,0.85)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '8px',
            color: 'white',
          }}
          itemStyle={{ color: '#60A5FA' }}
        />
      </RadarChart>
    </ResponsiveContainer>
  );
}
