import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { Order } from '../../types';
import { PressableScale } from '../motion/PressableScale';
import { C, FONT, R, STATUS } from '../../theme/tokens';

type Props = {
  order: Order;
  wide: boolean;
  status: { label: string; tone: (typeof STATUS)[keyof typeof STATUS] };
  service: { label: string; icon: string };
  onPress: () => void;
};

const itemsText = (o: Order) => o.items.map((i) => `${i.quantity}× ${i.dishName}`).join(', ') || 'Nessun piatto';

// Una riga della tabella ordini del Report (su telefono va a capo)
export const PeriodOrderRow = ({ order, wide, status, service, onPress }: Props) => (
  <PressableScale scaleTo={0.99} onPress={onPress} style={[styles.row, wide && styles.rowWide]} testID={`period-order-row-${order.id}`}>
    <View style={[styles.bar, { backgroundColor: status.tone.solid }]} />
    <View style={styles.main}>
      <View style={styles.line}>
        <Text style={styles.num}>#{order.orderNumber}</Text>
        <Text style={styles.time}>{format(new Date(order.createdAt), 'HH:mm')}</Text>
        <Text style={styles.name} numberOfLines={1}>{order.customerName || 'Anonimo'}</Text>
        {wide && (
          <View style={styles.svc}>
            <Ionicons name={service.icon as any} size={14} color={C.text2} />
            <Text style={styles.svcText}>{service.label}</Text>
          </View>
        )}
      </View>
      <Text style={styles.items} numberOfLines={wide ? 1 : 2}>{itemsText(order)}</Text>
    </View>
    <View style={[styles.side, wide && styles.sideWide]}>
      <View style={[styles.pill, { backgroundColor: status.tone.bg }]}>
        <Text style={[styles.pillText, { color: status.tone.fg }]}>{status.label}</Text>
      </View>
      <View style={[styles.pill, { backgroundColor: order.isPaid ? C.successSoft : C.warningSoft }]} testID={`period-order-paid-${order.id}`}>
        <Text style={[styles.pillText, { color: order.isPaid ? C.success : C.warningFg }]}>{order.isPaid ? 'Pagato' : 'Da pagare'}</Text>
      </View>
      <Text style={styles.total} testID={`period-order-total-${order.id}`}>{(order.total || 0).toFixed(2)} €</Text>
    </View>
  </PressableScale>
);

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, paddingRight: 12, borderRadius: R.md, backgroundColor: C.canvas, marginBottom: 6, overflow: 'hidden', flexWrap: 'wrap' },
  rowWide: { flexWrap: 'nowrap' },
  bar: { width: 4, alignSelf: 'stretch', borderRadius: 2 },
  main: { flex: 1, minWidth: 180, gap: 2 },
  line: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  num: { fontFamily: FONT, fontSize: 15, fontWeight: '800', color: C.text },
  time: { fontFamily: FONT, fontSize: 13, fontWeight: '600', color: C.text2 },
  name: { fontFamily: FONT, flex: 1, fontSize: 15, fontWeight: '600', color: C.text },
  svc: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  svcText: { fontFamily: FONT, fontSize: 12, color: C.text2 },
  items: { fontFamily: FONT, fontSize: 13, color: C.text2 },
  side: { flexDirection: 'row', alignItems: 'center', gap: 6, marginLeft: 14 },
  sideWide: { marginLeft: 0 },
  pill: { paddingHorizontal: 9, paddingVertical: 3, borderRadius: R.pill },
  pillText: { fontFamily: FONT, fontSize: 12, fontWeight: '700' },
  total: { fontFamily: FONT, minWidth: 70, textAlign: 'right', fontSize: 15, fontWeight: '800', color: C.text },
});
