import React from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import Animated, { ZoomIn } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { Order } from '../../types';
import { compositionText } from '../../utils/composition';
import { PressableScale } from '../motion/PressableScale';
import { C, FONT, R, statusOf } from '../../theme/tokens';
import { CHANNELS, STATUS_LABELS, serviceOf } from './orderMeta';

// Elementi bianchi semitrasparenti sopra la tinta della scheda
const GLASS = 'rgba(255,255,255,0.78)';

const Chip = ({ icon, label, tone, testID }: { icon: string; label: string; tone?: 'amber'; testID?: string }) => (
  <View style={[styles.chip, tone === 'amber' && styles.chipAmber]} testID={testID}>
    <Ionicons name={icon as any} size={13} color={tone === 'amber' ? C.warningFg : C.text2} />
    <Text style={[styles.chipText, tone === 'amber' && { color: C.warningFg }]}>{label}</Text>
  </View>
);

type Props = {
  order: Order;
  selected: boolean;
  onOpen: () => void;
  onPrint: (e: any) => void;
  onTogglePayment: () => void;
  containerStyle?: StyleProp<ViewStyle>;
};

export const OrderTicket = ({ order, selected, onOpen, onPrint, onTogglePayment, containerStyle }: Props) => {
  const st = statusOf(order.status);
  const channel = CHANNELS.find((c) => c.id === order.channel);
  const service = serviceOf(order.serviceType);
  return (
    <PressableScale hoverLift scaleTo={0.98} containerStyle={containerStyle} onPress={onOpen}
      style={[styles.card, { backgroundColor: st.bg }, selected && { borderColor: st.solid }]} testID={`order-card-${order.id}`}>
      <View style={styles.head}>
        <View style={styles.titleWrap}>
          <Text style={[styles.name, { color: st.fg }]} numberOfLines={1}>{order.customerName || 'Anonimo'}</Text>
          <View style={styles.numPill}><Text style={styles.num}>#{order.orderNumber}</Text></View>
        </View>
        <PressableScale style={styles.printBtn} onPress={(e) => onPrint(e)} testID={`order-print-${order.id}`} accessibilityLabel="Stampa comanda">
          <Ionicons name="print-outline" size={18} color={C.primary} />
        </PressableScale>
        <View style={styles.badge} testID={`order-status-${order.id}`}>
          <View style={[styles.badgeDot, { backgroundColor: st.solid }]} />
          <Text style={[styles.badgeText, { color: st.fg }]}>{STATUS_LABELS[order.status]}</Text>
        </View>
      </View>

      <View style={styles.meta}>
        {channel && <Chip icon={channel.icon} label={channel.label} />}
        <Chip icon={service.icon} label={service.label} />
        {!!order.deliveryTime && <Chip icon="time-outline" label={`Ora: ${order.deliveryTime}`} tone="amber" testID={`order-delivery-${order.id}`} />}
      </View>

      {order.items.length > 0 && (
        <View style={styles.items} testID={`order-items-summary-${order.id}`}>
          {order.items.map((item, idx) => (
            <Text key={`${order.id}-item-${idx}`} style={styles.itemLine} numberOfLines={2}>
              <Text style={styles.qty}>{item.quantity}× </Text>
              {item.dishName}
              {!!item.composition?.length && <Text style={styles.itemNote}>: {compositionText(item.composition)}</Text>}
              {!!item.notes && <Text style={styles.itemNote}> ({item.notes})</Text>}
            </Text>
          ))}
        </View>
      )}

      {!!order.notes && (
        <View style={styles.notes} testID={`order-notes-${order.id}`}>
          <Ionicons name="chatbubble-ellipses-outline" size={14} color={C.primary} />
          <Text style={styles.notesText} numberOfLines={2}>{order.notes}</Text>
        </View>
      )}

      <View style={styles.footer}>
        <Text style={styles.total} testID={`order-total-${order.id}`}>{order.total.toFixed(2)} €</Text>
        <View style={styles.footerRight}>
          <PressableScale
            style={[styles.payPill, order.isPaid ? styles.payPaid : styles.payUnpaid]}
            onPress={(e) => { e?.stopPropagation?.(); onTogglePayment(); }}
            testID={`order-payment-toggle-${order.id}`}
          >
            <Animated.View key={order.isPaid ? 'paid' : 'unpaid'} entering={ZoomIn.springify().damping(10).stiffness(280)}>
              <Ionicons name={order.isPaid ? 'checkmark-circle' : 'card-outline'} size={15} color={order.isPaid ? C.success : C.primary} />
            </Animated.View>
            <Text style={[styles.payText, { color: order.isPaid ? C.success : C.primary }]}>{order.isPaid ? 'Pagato' : 'Da pagare'}</Text>
          </PressableScale>
          <Text style={styles.time}>{format(new Date(order.createdAt), 'HH:mm')}</Text>
        </View>
      </View>
    </PressableScale>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: R.lg, borderWidth: 2, borderColor: 'transparent',
    paddingVertical: 16, paddingHorizontal: 18, overflow: 'hidden',
  },
  head: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  titleWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, minWidth: 0 },
  name: { fontFamily: FONT, fontSize: 17, fontWeight: '800', color: C.text, letterSpacing: -0.3, flexShrink: 1 },
  numPill: { backgroundColor: GLASS, borderRadius: R.pill, paddingHorizontal: 8, paddingVertical: 2 },
  num: { fontFamily: FONT, fontSize: 12, fontWeight: '700', color: C.text2, fontVariant: ['tabular-nums'] },
  printBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: GLASS, alignItems: 'center', justifyContent: 'center' },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: R.pill, paddingHorizontal: 10, paddingVertical: 5, backgroundColor: GLASS },
  badgeDot: { width: 7, height: 7, borderRadius: 4 },
  badgeText: { fontFamily: FONT, fontSize: 12, fontWeight: '800', letterSpacing: 0.2 },
  meta: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 12 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: GLASS, borderRadius: R.pill, paddingHorizontal: 9, paddingVertical: 4 },
  chipAmber: { backgroundColor: '#fff' },
  chipText: { fontFamily: FONT, fontSize: 12, fontWeight: '600', color: C.text2 },
  items: { marginTop: 12, gap: 3 },
  itemLine: { fontFamily: FONT, fontSize: 14, lineHeight: 20, color: C.text, fontWeight: '500' },
  qty: { fontWeight: '800', color: C.primary },
  itemNote: { fontFamily: FONT, color: C.text2, fontWeight: '500', fontSize: 13 },
  notes: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10, backgroundColor: GLASS, borderRadius: R.sm, paddingHorizontal: 10, paddingVertical: 7 },
  notesText: { fontFamily: FONT, flex: 1, fontSize: 13, color: C.text2, fontStyle: 'italic' },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: 'rgba(42,53,71,0.12)', borderStyle: 'dashed' },
  total: { fontFamily: FONT, fontSize: 20, fontWeight: '800', color: C.text, letterSpacing: -0.4, fontVariant: ['tabular-nums'] },
  footerRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  payPill: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: R.pill, borderWidth: 1, paddingHorizontal: 11, paddingVertical: 6, minHeight: 32 },
  payPaid: { backgroundColor: '#fff', borderColor: '#A9E6D6' },
  payUnpaid: { backgroundColor: '#fff', borderColor: '#B3E2FF' },
  payText: { fontFamily: FONT, fontSize: 12, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.4 },
  time: { fontFamily: FONT, fontSize: 13, fontWeight: '600', color: C.muted, fontVariant: ['tabular-nums'] },
});
