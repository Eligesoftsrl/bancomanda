import { addDays, format, parseISO } from 'date-fns';
import { it } from 'date-fns/locale';
import { DailyRevenuePoint } from '../../types';

export type ChartPoint = DailyRevenuePoint & { label: string; tooltip: string };

// Oltre 4 mesi una barra al giorno diventa illeggibile: si passa a una per settimana
export const WEEKLY_THRESHOLD = 120;

export const toChartPoints = (data: DailyRevenuePoint[]): { points: ChartPoint[]; weekly: boolean } => {
  if (data.length <= WEEKLY_THRESHOLD) {
    return {
      weekly: false,
      points: data.map((d) => {
        const day = parseISO(d.date);
        return { ...d, label: format(day, 'd MMM', { locale: it }), tooltip: format(day, 'EEEE d MMMM', { locale: it }) };
      }),
    };
  }
  const points: ChartPoint[] = [];
  for (let i = 0; i < data.length; i += 7) {
    const chunk = data.slice(i, i + 7);
    const first = parseISO(chunk[0].date);
    const last = addDays(first, chunk.length - 1);
    points.push({
      date: chunk[0].date,
      totalOrders: chunk.reduce((a, d) => a + d.totalOrders, 0),
      totalRevenue: Math.round(chunk.reduce((a, d) => a + d.totalRevenue, 0) * 100) / 100,
      label: format(first, 'd MMM', { locale: it }),
      tooltip: `${format(first, 'd MMM', { locale: it })} – ${format(last, 'd MMM yyyy', { locale: it })}`,
    });
  }
  return { points, weekly: true };
};

// Massimo "rotondo" per l'asse (es. 187 → 200, 1340 → 1500)
export const niceMax = (v: number, integer = false) => {
  if (integer) return Math.max(4, Math.ceil(v / 4) * 4);
  if (v <= 0) return 100;
  const pow = Math.pow(10, Math.floor(Math.log10(v)));
  const step = [1, 2, 4, 6, 8, 10].find((s) => s * pow >= v) || 10;
  return step * pow;
};

export const euroShort = (v: number) => (v >= 1000 ? `${(v / 1000).toFixed(v >= 10000 ? 0 : 1)}k` : `${Math.round(v)}`);
export const euro = (v: number) => `${v.toFixed(2)} €`;
