import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Path, Stop } from 'react-native-svg';
import Animated, { FadeIn } from 'react-native-reanimated';
import { C, FONT, R, elevation } from '../../theme/tokens';
import { ChartBar, RevealX } from './ChartPieces';
import { ChartPoint, euro, euroShort, niceMax } from './chartUtils';

export const PLOT_H = 220;
const AXIS_L = 44;
const AXIS_R = 30;
const TIP_W = 172;

type Props = { points: ChartPoint[]; mode: 'bars' | 'line'; width: number; selected: number | null; onSelect: (i: number) => void };

const pathOf = (xy: [number, number][]) => xy.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');

export const ChartPlot = ({ points, mode, width, selected, onSelect }: Props) => {
  const plotW = Math.max(width - AXIS_L - AXIS_R, 60);
  const n = points.length;
  const slot = plotW / n;
  const barW = Math.max(2, Math.min(slot * 0.62, 30));
  const revMax = niceMax(Math.max(...points.map((p) => p.totalRevenue)));
  const ordMax = niceMax(Math.max(...points.map((p) => p.totalOrders)), true);
  const xc = (i: number) => slot * i + slot / 2;
  const yRev = (v: number) => PLOT_H - (v / revMax) * PLOT_H;
  const yOrd = (v: number) => PLOT_H - (v / ordMax) * PLOT_H;
  const revXY = points.map((p, i) => [xc(i), yRev(p.totalRevenue)] as [number, number]);
  const ordXY = points.map((p, i) => [xc(i), yOrd(p.totalOrders)] as [number, number]);
  const dots = n <= 45;
  const labelStep = Math.max(1, Math.ceil(n / Math.max(2, Math.floor(plotW / 60))));
  const sel = selected != null ? points[selected] : null;
  const trigger = `${mode}-${n}-${points[0]?.date}`;

  return (
    <View style={{ width }} testID="revenue-chart-plot">
      <View style={[styles.area, { height: PLOT_H }]}>
        {[0, 1, 2, 3, 4].map((k) => (
          <View key={k} style={[styles.gridRow, { top: (PLOT_H * k) / 4 }]}>
            <Text style={[styles.axisL, { width: AXIS_L - 8 }]}>{euroShort((revMax * (4 - k)) / 4)} €</Text>
            <View style={[styles.gridLine, { width: plotW }, k === 4 && styles.gridBase]} />
            <Text style={[styles.axisR, { width: AXIS_R - 6 }]}>{Math.round((ordMax * (4 - k)) / 4)}</Text>
          </View>
        ))}

        <View style={[styles.plot, { left: AXIS_L, width: plotW, height: PLOT_H }]}>
          {sel && <View style={[styles.guide, { left: xc(selected!) - 0.5 }]} />}

          {mode === 'bars' && points.map((p, i) => (
            <ChartBar key={`${p.date}-${trigger}`} x={xc(i) - barW / 2} width={barW} height={(p.totalRevenue / revMax) * PLOT_H}
              index={i} total={n} active={selected === i} dim={selected != null && selected !== i} testID={`revenue-chart-bar-${i}`} />
          ))}

          <RevealX width={plotW} height={PLOT_H} trigger={trigger}>
            <Svg width={plotW} height={PLOT_H}>
              <Defs>
                <LinearGradient id="revFill" x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0" stopColor={C.primary} stopOpacity={0.28} />
                  <Stop offset="1" stopColor={C.primary} stopOpacity={0} />
                </LinearGradient>
              </Defs>
              {mode === 'line' && (
                <>
                  <Path d={`${pathOf(revXY)} L${xc(n - 1).toFixed(1)},${PLOT_H} L${xc(0).toFixed(1)},${PLOT_H} Z`} fill="url(#revFill)" />
                  <Path d={pathOf(revXY)} stroke={C.primary} strokeWidth={3} fill="none" strokeLinejoin="round" strokeLinecap="round" />
                  {dots && revXY.map(([x, y], i) => <Circle key={`r${i}`} cx={x} cy={y} r={selected === i ? 6 : 3.5} fill="#fff" stroke={C.primary} strokeWidth={2.5} />)}
                </>
              )}
              <Path d={pathOf(ordXY)} stroke={C.secondary} strokeWidth={2.5} fill="none" strokeDasharray={mode === 'line' ? '6,5' : undefined} strokeLinejoin="round" />
              {dots && ordXY.map(([x, y], i) => <Circle key={`o${i}`} cx={x} cy={y} r={selected === i ? 5 : 3} fill={C.secondary} stroke="#fff" strokeWidth={1.5} />)}
            </Svg>
          </RevealX>

          <View style={StyleSheet.absoluteFill}>
            {points.map((p, i) => (
              <Pressable key={p.date} onPress={() => onSelect(i)} onHoverIn={() => onSelect(i)} testID={`revenue-chart-slot-${i}`}
                accessibilityLabel={`${p.tooltip}: ${euro(p.totalRevenue)}, ${p.totalOrders} ordini`}
                style={[styles.slot, { left: slot * i, width: slot }]} />
            ))}
          </View>

          {sel && (
            <Animated.View key={selected} entering={FadeIn.duration(160)} pointerEvents="none" testID="revenue-chart-tooltip"
              style={[styles.tip, { left: Math.min(Math.max(xc(selected!) - TIP_W / 2, 0), Math.max(plotW - TIP_W, 0)) }]}>
              <Text style={styles.tipDate} numberOfLines={1}>{sel.tooltip}</Text>
              <View style={styles.tipRow}>
                <View style={[styles.tipDot, { backgroundColor: C.primary }]} />
                <Text style={styles.tipLabel}>Incasso</Text>
                <Text style={styles.tipValue} testID="revenue-chart-tooltip-revenue">{euro(sel.totalRevenue)}</Text>
              </View>
              <View style={styles.tipRow}>
                <View style={[styles.tipDot, { backgroundColor: C.secondary }]} />
                <Text style={styles.tipLabel}>Ordini</Text>
                <Text style={styles.tipValue} testID="revenue-chart-tooltip-orders">{sel.totalOrders}</Text>
              </View>
            </Animated.View>
          )}
        </View>
      </View>

      <View style={[styles.xAxis, { marginLeft: AXIS_L, width: plotW }]}>
        {points.map((p, i) => (i % labelStep === 0 ? (
          <Text key={p.date} style={[styles.xLabel, { left: Math.min(Math.max(xc(i) - 30, -10), plotW - 50) }]} numberOfLines={1}>{p.label}</Text>
        ) : null))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  area: { position: 'relative', marginTop: 6 },
  gridRow: { position: 'absolute', left: 0, right: 0, flexDirection: 'row', alignItems: 'center', height: 0 },
  axisL: { fontFamily: FONT, fontSize: 10, fontWeight: '600', color: C.muted, textAlign: 'right', marginRight: 8 },
  axisR: { fontFamily: FONT, fontSize: 10, fontWeight: '700', color: C.secondary, textAlign: 'left', marginLeft: 6 },
  gridLine: { height: 1, backgroundColor: C.border },
  gridBase: { backgroundColor: C.borderStrong },
  plot: { position: 'absolute', top: 0 },
  guide: { position: 'absolute', top: 0, bottom: 0, width: 1, backgroundColor: C.borderStrong },
  slot: { position: 'absolute', top: 0, bottom: 0 },
  tip: { position: 'absolute', top: -4, width: TIP_W, backgroundColor: C.navy, borderRadius: R.md, paddingVertical: 10, paddingHorizontal: 12, gap: 4, ...elevation(2) },
  tipDate: { fontFamily: FONT, fontSize: 12, fontWeight: '700', color: '#fff', textTransform: 'capitalize', marginBottom: 2 },
  tipRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  tipDot: { width: 8, height: 8, borderRadius: 4 },
  tipLabel: { fontFamily: FONT, fontSize: 12, color: '#CFD6DB', flex: 1 },
  tipValue: { fontFamily: FONT, fontSize: 13, fontWeight: '800', color: '#fff' },
  xAxis: { height: 26, position: 'relative', marginTop: 8 },
  xLabel: { position: 'absolute', width: 60, textAlign: 'center', fontFamily: FONT, fontSize: 11, fontWeight: '600', color: C.text2 },
});
