import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Path, Stop } from 'react-native-svg';
import Animated, { FadeIn } from 'react-native-reanimated';
import { C, FONT, R, elevation } from '../../theme/tokens';
import { RevealX } from './ChartPieces';
import { euro, euroShort, niceMax } from './chartUtils';

export type HourPoint = { hour: number; revenue: number; orders: number; prevRevenue: number; prevOrders: number };

const H = 200;
const AXIS_L = 44;
const TIP_W = 150;

// Curva morbida tra i punti (Catmull-Rom → Bézier)
const smooth = (pts: [number, number][]) => {
  if (pts.length < 2) return pts.length ? `M${pts[0][0]},${pts[0][1]}` : '';
  let d = `M${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] || p2;
    const c1x = p1[0] + (p2[0] - p0[0]) / 6;
    const c1y = Math.min(H, p1[1] + (p2[1] - p0[1]) / 6);
    const c2x = p2[0] - (p3[0] - p1[0]) / 6;
    const c2y = Math.min(H, p2[1] - (p3[1] - p1[1]) / 6);
    d += ` C${c1x.toFixed(1)},${c1y.toFixed(1)} ${c2x.toFixed(1)},${c2y.toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
  }
  return d;
};

// Mostra solo le ore utili: da un'ora prima del primo incasso a un'ora dopo l'ultimo (almeno 6 ore)
export const visibleHours = (hours: HourPoint[]) => {
  const active = hours.filter((h) => h.revenue > 0 || h.prevRevenue > 0).map((h) => h.hour);
  let from = active.length ? Math.max(0, Math.min(...active) - 1) : 10;
  let to = active.length ? Math.min(23, Math.max(...active) + 1) : 15;
  while (to - from < 5) { if (from > 0) from--; if (to - from < 5 && to < 23) to++; }
  return hours.filter((h) => h.hour >= from && h.hour <= to);
};

export const HourlyCompareChart = ({ hours, width, trigger }: { hours: HourPoint[]; width: number; trigger: string }) => {
  const [sel, setSel] = useState<number | null>(null);
  const pts = useMemo(() => visibleHours(hours), [hours]);
  const plotW = Math.max(width - AXIS_L - 8, 80);
  const n = pts.length;
  const step = n > 1 ? plotW / (n - 1) : plotW;
  const max = niceMax(Math.max(...pts.map((p) => Math.max(p.revenue, p.prevRevenue))));
  const x = (i: number) => i * step;
  const y = (v: number) => H - (v / max) * H;
  const today = pts.map((p, i) => [x(i), y(p.revenue)] as [number, number]);
  const prev = pts.map((p, i) => [x(i), y(p.prevRevenue)] as [number, number]);
  const labelEvery = Math.max(1, Math.ceil(n / Math.max(2, Math.floor(plotW / 52))));
  const s = sel != null ? pts[sel] : null;

  return (
    <View testID="hourly-chart">
      <View style={{ height: H, marginTop: 8 }}>
        {[0, 1, 2, 3, 4].map((k) => (
          <View key={k} style={[styles.gridRow, { top: (H * k) / 4 }]}>
            <Text style={styles.axis}>{euroShort((max * (4 - k)) / 4)} €</Text>
            <View style={[styles.gridLine, { width: plotW }, k === 4 && { backgroundColor: C.borderStrong }]} />
          </View>
        ))}
        <View style={[styles.plot, { left: AXIS_L, width: plotW }]}>
          {s && <View style={[styles.guide, { left: x(sel!) - 0.5 }]} />}
          <RevealX width={plotW + 8} height={H + 8} trigger={trigger}>
            <Svg width={plotW + 8} height={H + 8}>
              <Defs>
                <LinearGradient id="todayFill" x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0" stopColor={C.primary} stopOpacity={0.25} />
                  <Stop offset="1" stopColor={C.primary} stopOpacity={0} />
                </LinearGradient>
              </Defs>
              <Path d={smooth(prev)} stroke={C.secondary} strokeWidth={2.5} fill="none" strokeDasharray="6,5" />
              <Path d={`${smooth(today)} L${x(n - 1)},${H} L0,${H} Z`} fill="url(#todayFill)" />
              <Path d={smooth(today)} stroke={C.primary} strokeWidth={3} fill="none" strokeLinecap="round" />
              {s && <Circle cx={x(sel!)} cy={y(s.prevRevenue)} r={5} fill={C.secondary} stroke="#fff" strokeWidth={2} />}
              {s && <Circle cx={x(sel!)} cy={y(s.revenue)} r={6} fill="#fff" stroke={C.primary} strokeWidth={3} />}
            </Svg>
          </RevealX>
          <View style={StyleSheet.absoluteFill}>
            {pts.map((p, i) => (
              <Pressable key={p.hour} onPress={() => setSel(i)} onHoverIn={() => setSel(i)} testID={`hourly-slot-${p.hour}`}
                accessibilityLabel={`Ore ${p.hour}: oggi ${euro(p.revenue)}, ieri ${euro(p.prevRevenue)}`}
                style={[styles.slot, { left: Math.max(0, x(i) - step / 2), width: step }]} />
            ))}
          </View>
          {s && (
            <Animated.View key={sel} entering={FadeIn.duration(150)} pointerEvents="none" testID="hourly-tooltip"
              style={[styles.tip, { left: Math.min(Math.max(x(sel!) - TIP_W / 2, 0), Math.max(plotW - TIP_W, 0)) }]}>
              <Text style={styles.tipTitle}>Ore {String(s.hour).padStart(2, '0')}:00</Text>
              <View style={styles.tipRow}><View style={[styles.dot, { backgroundColor: C.primary }]} /><Text style={styles.tipLabel}>Oggi</Text><Text style={styles.tipValue} testID="hourly-tooltip-today">{euro(s.revenue)}</Text></View>
              <View style={styles.tipRow}><View style={[styles.dot, { backgroundColor: C.secondary }]} /><Text style={styles.tipLabel}>Ieri</Text><Text style={styles.tipValue} testID="hourly-tooltip-prev">{euro(s.prevRevenue)}</Text></View>
            </Animated.View>
          )}
        </View>
      </View>
      <View style={[styles.xAxis, { marginLeft: AXIS_L, width: plotW }]}>
        {pts.map((p, i) => (i % labelEvery === 0 ? (
          <Text key={p.hour} style={[styles.xLabel, { left: Math.min(Math.max(x(i) - 22, -6), plotW - 38) }]}>{String(p.hour).padStart(2, '0')}:00</Text>
        ) : null))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  gridRow: { position: 'absolute', left: 0, right: 0, flexDirection: 'row', alignItems: 'center', height: 0 },
  axis: { width: AXIS_L - 8, marginRight: 8, textAlign: 'right', fontFamily: FONT, fontSize: 10, fontWeight: '600', color: C.muted },
  gridLine: { height: 1, backgroundColor: C.border },
  plot: { position: 'absolute', top: 0, height: H },
  guide: { position: 'absolute', top: 0, bottom: 0, width: 1, backgroundColor: C.borderStrong },
  slot: { position: 'absolute', top: 0, bottom: 0 },
  tip: { position: 'absolute', top: -6, width: TIP_W, backgroundColor: C.navy, borderRadius: R.md, paddingVertical: 9, paddingHorizontal: 12, gap: 4, ...elevation(2) },
  tipTitle: { fontFamily: FONT, fontSize: 12, fontWeight: '700', color: '#fff', marginBottom: 2 },
  tipRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  tipLabel: { flex: 1, fontFamily: FONT, fontSize: 12, color: '#CFD6DB' },
  tipValue: { fontFamily: FONT, fontSize: 13, fontWeight: '800', color: '#fff' },
  xAxis: { height: 24, marginTop: 8, position: 'relative' },
  xLabel: { position: 'absolute', width: 44, textAlign: 'center', fontFamily: FONT, fontSize: 11, fontWeight: '600', color: C.text2 },
});
