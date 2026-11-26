import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Appear } from '../motion/Appear';
import { FlipText } from '../motion/FlipText';
import { C, FONT, R } from '../../theme/tokens';
import { HourlyCompareChart, HourPoint } from './HourlyCompareChart';
import { euro } from './chartUtils';

type Props = {
  date: string;
  totalOrders: number;
  totalRevenue: number;
  missed: number;
  hours: HourPoint[];
  wide: boolean;
};

const Row = ({ icon, tone, value, label, index, testID }: { icon: string; tone: { bg: string; fg: string }; value: string | number; label: string; index: number; testID: string }) => (
  <Appear index={index + 1} style={styles.row}>
    <View style={[styles.rowIcon, { backgroundColor: tone.bg }]}><Ionicons name={icon as any} size={22} color={tone.fg} /></View>
    <View style={styles.rowText}>
      <FlipText value={String(value)} style={styles.rowValue} testID={testID} />
      <Text style={styles.rowLabel}>{label}</Text>
    </View>
  </Appear>
);

// Confronto con il giorno prima, calcolato sugli incassi ora per ora
const deltaText = (today: number, prev: number) => {
  if (prev <= 0 && today <= 0) return { text: 'Nessun incasso né oggi né ieri', tone: C.text2, icon: 'remove-outline' };
  if (prev <= 0) return { text: 'Ieri nessun incasso: oggi sei già in positivo', tone: C.success, icon: 'trending-up' };
  const pct = Math.round(((today - prev) / prev) * 100);
  if (pct === 0) return { text: 'Stesso incasso di ieri', tone: C.text2, icon: 'remove-outline' };
  return pct > 0
    ? { text: `+${pct}% di incasso rispetto a ieri`, tone: C.success, icon: 'trending-up' }
    : { text: `${pct}% di incasso rispetto a ieri`, tone: C.errorFg, icon: 'trending-down' };
};

export const DailyOverview = ({ date, totalOrders, totalRevenue, missed, hours, wide }: Props) => {
  const [chartW, setChartW] = useState(0);
  const todayRev = hours.reduce((a, h) => a + h.revenue, 0);
  const prevRev = hours.reduce((a, h) => a + h.prevRevenue, 0);
  const delta = deltaText(todayRev, prevRev);

  return (
    <View style={[styles.wrap, wide && styles.wrapWide]} testID="daily-overview">
      <Appear index={0} style={[styles.card, styles.summary, wide && styles.summaryWide]} testID="daily-summary-card">
        <Text style={styles.title}>Resoconto del giorno</Text>
        <View style={[styles.deltaPill, { backgroundColor: delta.tone === C.success ? C.successSoft : delta.tone === C.errorFg ? C.errorSoft : C.sunken }]}>
          <Ionicons name={delta.icon as any} size={15} color={delta.tone} />
          <Text style={[styles.deltaText, { color: delta.tone }]} testID="daily-delta">{delta.text}</Text>
        </View>
        <View style={styles.rows}>
          <Row index={0} icon="receipt-outline" tone={{ bg: C.primarySoft, fg: C.primary }} value={totalOrders} label="Ordini totali" testID="report-stat-orders-value" />
          <Row index={1} icon="cash-outline" tone={{ bg: C.successSoft, fg: C.success }} value={`${totalRevenue.toFixed(2)} €`} label="Incasso giorno" testID="report-stat-revenue-value" />
          <Row index={2} icon="alert-circle-outline" tone={{ bg: C.errorSoft, fg: C.error }} value={missed} label="Mancate vendite" testID="report-stat-missed-value" />
        </View>
      </Appear>

      <Appear index={1} style={[styles.card, styles.chartCard]} testID="hourly-chart-card">
        <View style={styles.chartHead}>
          <View style={{ flexShrink: 1 }}>
            <Text style={styles.title}>Incasso per ora</Text>
            <Text style={styles.sub}>Oggi a confronto con ieri · tocca un'ora per i dettagli</Text>
          </View>
          <View style={styles.legend}>
            <View style={styles.legendItem}><View style={[styles.legendLine, { backgroundColor: C.primary }]} /><Text style={styles.legendText}>Oggi <Text style={styles.legendValue} testID="hourly-total-today">{euro(todayRev)}</Text></Text></View>
            <View style={styles.legendItem}><View style={[styles.legendLine, { backgroundColor: C.secondary }]} /><Text style={styles.legendText}>Ieri <Text style={styles.legendValue} testID="hourly-total-prev">{euro(prevRev)}</Text></Text></View>
          </View>
        </View>
        <View onLayout={(e) => setChartW(Math.round(e.nativeEvent.layout.width))} style={{ minHeight: 240 }}>
          {todayRev === 0 && prevRev === 0 ? (
            <View style={styles.empty} testID="hourly-chart-empty">
              <Ionicons name="analytics-outline" size={40} color={C.muted} />
              <Text style={styles.emptyText}>Nessun incasso oggi e ieri</Text>
            </View>
          ) : chartW > 0 && hours.length > 0 ? (
            <HourlyCompareChart hours={hours} width={chartW} trigger={date} />
          ) : null}
        </View>
      </Appear>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { gap: 16, marginBottom: 16 },
  wrapWide: { flexDirection: 'row', alignItems: 'stretch' },
  card: { backgroundColor: C.surface, borderRadius: R.lg, padding: 20, borderWidth: 1, borderColor: C.border },
  summary: {},
  summaryWide: { width: 340 },
  chartCard: { flex: 1, minWidth: 0 },
  title: { fontFamily: FONT, fontSize: 18, fontWeight: '800', color: C.text },
  sub: { fontFamily: FONT, fontSize: 12, fontWeight: '600', color: C.muted, marginTop: 2 },
  deltaPill: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 6, marginTop: 10, paddingHorizontal: 12, paddingVertical: 6, borderRadius: R.pill },
  deltaText: { fontFamily: FONT, fontSize: 13, fontWeight: '700' },
  rows: { marginTop: 18, gap: 16 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  rowIcon: { width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  rowText: { flex: 1 },
  rowValue: { fontFamily: FONT, fontSize: 22, fontWeight: '800', color: C.text, letterSpacing: -0.4 },
  rowLabel: { fontFamily: FONT, fontSize: 13, fontWeight: '600', color: C.text2 },
  chartHead: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendLine: { width: 16, height: 4, borderRadius: 2 },
  legendText: { fontFamily: FONT, fontSize: 12, fontWeight: '600', color: C.text2 },
  legendValue: { fontWeight: '800', color: C.text },
  empty: { height: 220, alignItems: 'center', justifyContent: 'center', gap: 10 },
  emptyText: { fontFamily: FONT, fontSize: 14, fontWeight: '600', color: C.text2 },
});
