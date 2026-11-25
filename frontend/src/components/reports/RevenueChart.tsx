import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format, parseISO } from 'date-fns';
import { it } from 'date-fns/locale';
import { DailyRevenuePoint } from '../../types';
import { PressableScale } from '../motion/PressableScale';
import { Appear } from '../motion/Appear';
import { C, FONT, R } from '../../theme/tokens';
import { ChartPlot, PLOT_H } from './ChartPlot';
import { euro, toChartPoints } from './chartUtils';

type Mode = 'bars' | 'line';

const ModeToggle = ({ mode, onChange }: { mode: Mode; onChange: (m: Mode) => void }) => (
  <View style={styles.toggle} testID="revenue-chart-mode">
    {([['bars', 'Barre', 'bar-chart-outline'], ['line', 'Linea', 'trending-up-outline']] as const).map(([key, label, icon]) => (
      <PressableScale key={key} onPress={() => onChange(key)} style={[styles.toggleBtn, mode === key && styles.toggleOn]} testID={`revenue-chart-mode-${key}`}>
        <Ionicons name={icon} size={16} color={mode === key ? '#fff' : C.text2} />
        <Text style={[styles.toggleText, mode === key && { color: '#fff' }]}>{label}</Text>
      </PressableScale>
    ))}
  </View>
);

const Insight = ({ icon, label, value, testID }: { icon: string; label: string; value: string; testID: string }) => (
  <View style={styles.insight}>
    <Ionicons name={icon as any} size={16} color={C.primaryDark} />
    <Text style={styles.insightLabel}>{label}</Text>
    <Text style={styles.insightValue} testID={testID} numberOfLines={1}>{value}</Text>
  </View>
);

export const RevenueChart = ({ data, loading }: { data: DailyRevenuePoint[]; loading: boolean }) => {
  const [mode, setMode] = useState<Mode>('bars');
  const [selected, setSelected] = useState<number | null>(null);
  const [width, setWidth] = useState(0);
  const { points, weekly } = useMemo(() => toChartPoints(data), [data]);

  const days = data.length;
  const total = data.reduce((a, d) => a + d.totalRevenue, 0);
  const best = data.reduce<DailyRevenuePoint | null>((b, d) => (d.totalRevenue > (b?.totalRevenue ?? 0) ? d : b), null);
  const empty = !loading && total === 0 && data.every((d) => d.totalOrders === 0);
  const sel = selected != null && selected < points.length ? selected : null;

  return (
    <Appear index={3} style={styles.card} testID="revenue-chart">
      <View style={styles.head}>
        <View style={styles.titles}>
          <Text style={styles.title}>Andamento incassi</Text>
          <Text style={styles.subtitle}>{weekly ? 'Settimana per settimana' : 'Giorno per giorno'} · tocca una {mode === 'bars' ? 'barra' : 'giornata'} per i dettagli</Text>
        </View>
        <ModeToggle mode={mode} onChange={(m) => { setMode(m); setSelected(null); }} />
      </View>

      <View style={styles.legend}>
        <View style={styles.legendItem}><View style={[styles.legendSwatch, { backgroundColor: C.primary }]} /><Text style={styles.legendText}>Incasso (€, asse sinistro)</Text></View>
        <View style={styles.legendItem}><View style={[styles.legendLine, { backgroundColor: C.secondary }]} /><Text style={styles.legendText}>Numero ordini (asse destro)</Text></View>
      </View>

      <View style={{ minHeight: PLOT_H + 46 }} onLayout={(e) => setWidth(Math.round(e.nativeEvent.layout.width))}>
        {empty ? (
          <View style={styles.empty} testID="revenue-chart-empty">
            <Ionicons name="bar-chart-outline" size={40} color={C.muted} />
            <Text style={styles.emptyText}>Nessun incasso nel periodo scelto</Text>
          </View>
        ) : width > 0 && points.length > 0 ? (
          <ChartPlot points={points} mode={mode} width={width} selected={sel} onSelect={setSelected} />
        ) : null}
      </View>

      {!empty && days > 0 && (
        <View style={styles.insights}>
          <Insight icon="calculator-outline" label="Media al giorno" value={euro(total / days)} testID="revenue-chart-avg" />
          {best && (
            <Insight icon="trophy-outline" label="Giorno migliore" value={`${format(parseISO(best.date), 'd MMM', { locale: it })} · ${euro(best.totalRevenue)}`} testID="revenue-chart-best" />
          )}
        </View>
      )}
    </Appear>
  );
};

const styles = StyleSheet.create({
  card: { backgroundColor: C.surface, borderRadius: R.lg, padding: 18, marginBottom: 16, borderWidth: 1, borderColor: C.border },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 },
  titles: { flexShrink: 1, minWidth: 200 },
  title: { fontFamily: FONT, fontSize: 18, fontWeight: '800', color: C.text },
  subtitle: { fontFamily: FONT, fontSize: 12, fontWeight: '600', color: C.muted, marginTop: 2 },
  toggle: { flexDirection: 'row', backgroundColor: C.sunken, borderRadius: R.pill, padding: 4 },
  toggleBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 40, paddingHorizontal: 14, borderRadius: R.pill },
  toggleOn: { backgroundColor: C.primary },
  toggleText: { fontFamily: FONT, fontSize: 13, fontWeight: '700', color: C.text2 },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, marginTop: 14, marginBottom: 8 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendSwatch: { width: 12, height: 12, borderRadius: 3 },
  legendLine: { width: 16, height: 3, borderRadius: 2 },
  legendText: { fontFamily: FONT, fontSize: 12, fontWeight: '600', color: C.text2 },
  empty: { height: PLOT_H, alignItems: 'center', justifyContent: 'center', gap: 10 },
  emptyText: { fontFamily: FONT, fontSize: 14, fontWeight: '600', color: C.text2 },
  insights: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 8 },
  insight: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.primarySoft, borderRadius: R.pill, paddingHorizontal: 14, minHeight: 40, flexShrink: 1 },
  insightLabel: { fontFamily: FONT, fontSize: 12, fontWeight: '600', color: C.text2 },
  insightValue: { fontFamily: FONT, fontSize: 13, fontWeight: '800', color: C.primaryDark },
});
