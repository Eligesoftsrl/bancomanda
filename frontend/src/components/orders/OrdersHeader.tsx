import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { DatePill } from '../ui2/DatePill';
import { PressableScale } from '../motion/PressableScale';
import { PulseDot } from '../motion/PulseDot';
import { Appear } from '../motion/Appear';
import { C, FONT, R } from '../../theme/tokens';

type Props = {
  freshness: 'fresh' | 'stale' | 'error';
  freshnessLabel: string;
  onSync: () => void;
  selectedDate: string;
  onChangeDate: (days: number) => void;
  compact: boolean;
  sidebar?: boolean;
};

export const OrdersHeader = ({ freshness, freshnessLabel, onSync, selectedDate, onChangeDate, compact, sidebar }: Props) => {
  const dot = freshness === 'fresh' ? C.success : freshness === 'stale' ? C.warning : C.error;

  const sync = (
    <PressableScale style={styles.syncPill} onPress={onSync} testID="sync-indicator">
      <PulseDot color={dot} live={freshness === 'fresh'} />
      <Text style={[styles.syncLabel, freshness === 'error' && { color: C.errorFg }]}>{freshnessLabel}</Text>
    </PressableScale>
  );

  return (
    <View style={[styles.header, compact && styles.headerCompact]}>
      <Appear from="above" style={styles.brandRow}>
        {sidebar ? (
          <View>
            <Text style={styles.pageTitle}>Ordini</Text>
            <Text style={styles.subtitle}>Comande del giorno, stato e pagamenti</Text>
          </View>
        ) : (
          <>
            <Image source={require('../../../assets/images/icon.png')} style={styles.logo} resizeMode="contain" testID="header-logo" />
            <View>
              <Text style={styles.title}>Bancomanda</Text>
              <Text style={styles.subtitle}>Ordini del giorno</Text>
            </View>
          </>
        )}
        {compact && <View style={styles.syncCompact}>{sync}</View>}
      </Appear>

      <Appear from="above" index={1} style={compact ? styles.dateWrapCompact : undefined}>
        <DatePill selectedDate={selectedDate} onChange={onChangeDate} compact={compact} />
      </Appear>

      {!compact && <Appear from="above" index={2}>{sync}</Appear>}
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 16,
    paddingHorizontal: 24, paddingVertical: 14, backgroundColor: C.surface,
    borderBottomWidth: 1, borderBottomColor: C.border,
  },
  headerCompact: { flexDirection: 'column', alignItems: 'stretch', paddingHorizontal: 14, paddingVertical: 10, gap: 10 },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 12, minWidth: 220 },
  logo: { width: 40, height: 40, borderRadius: 11 },
  title: { fontFamily: FONT, fontSize: 20, fontWeight: '800', color: C.text, letterSpacing: -0.4 },
  pageTitle: { fontFamily: FONT, fontSize: 24, fontWeight: '800', color: C.text, letterSpacing: -0.5 },
  subtitle: { fontFamily: FONT, fontSize: 12, fontWeight: '600', color: C.muted, marginTop: 1 },
  syncCompact: { marginLeft: 'auto' },
  syncPill: {
    flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10, paddingHorizontal: 16,
    borderRadius: R.pill, backgroundColor: C.sunken, borderWidth: 1, borderColor: C.border, minHeight: 44,
  },
  syncLabel: { fontFamily: FONT, fontSize: 12, fontWeight: '700', color: C.text2 },
  dateWrapCompact: { alignSelf: 'stretch' },
});
