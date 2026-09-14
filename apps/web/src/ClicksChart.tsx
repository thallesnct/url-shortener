import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { ClicksByDay } from './AnalyticsPage.tsx';

type ClicksChartProps = {
  data: ClicksByDay[];
};

export function ClicksChart({ data }: ClicksChartProps) {
  return (
    <section className="panel chart-panel" aria-labelledby="clicks-heading">
      <h2 id="clicks-heading">Clicks over the last 30 days</h2>
      <div className="chart-frame">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 12, right: 12, left: 0, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="day" tickFormatter={(day: string) => day.slice(5)} />
            <YAxis allowDecimals={false} width={36} />
            <Tooltip labelFormatter={(day) => String(day)} />
            <Bar dataKey="clicks" fill="#2563eb" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
