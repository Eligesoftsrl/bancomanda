import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { Order } from '../../types';
import { ordersApi } from '../../services/api';
import { C, FONT, R, statusOf } from '../../theme/tokens';
import { STATUS_LABELS, serviceOf } from '../orders/orderMeta';
import { PeriodOrderRow } from './PeriodOrderRow';

const PAGE = 50;

type Props = { startDate: string; endDate: string; refreshKey: number; wide: boolean; onOpen: (o: Order) => void };

// Report di periodo: tutti gli ordini, raggruppati per giorno; toccandone uno si apre come in Ordini
export const PeriodOrdersList = ({ startDate, endDate, refreshKey, wide, onOpen }: Props) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(false);

  const load = useCallback(async (skip: number) => {
    setLoading(true);
    try {
      const page = await ordersApi.getByRange(startDate, endDate, skip, PAGE);
      setOrders((prev) => (skip ? [...prev, ...page] : page));
      setHasMore(page.length === PAGE);
    } catch {
      if (!skip) setOrders([]);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => { load(0); }, [load, refreshKey]);

  const days = orders.reduce((acc, o) => {
    (acc[o.menuDate] = acc[o.menuDate] || []).push(o);
    return acc;
  }, {} as Record<string, Order[]>);

  return (
    <View style={styles.card} testID="period-orders-section">
      <View style={styles.head}>
        <View style={styles.icon}><Ionicons name="list" size={20} color={C.primary} /></View>
        <Text style={styles.title}>Ordini del periodo</Text>
        <Text style={styles.count} testID="period-orders-count">{orders.length}{hasMore ? '+' : ''}</Text>
      </View>
      {Object.entries(days).map(([day, list]) => (
        <View key={day} testID={`period-orders-day-${day}`}>
          <Text style={styles.day}>{format(new Date(day), 'EEEE d MMMM', { locale: it })}</Text>
          {list.map((o) => (
            <PeriodOrderRow key={o.id} order={o} wide={wide} onPress={() => onOpen(o)}
              status={{ label: STATUS_LABELS[o.status] || o.status, tone: statusOf(o.status) }} service={serviceOf(o.serviceType)} />
          ))}
        </View>
      ))}
      {loading && <ActivityIndicator color={C.primary} style={{ marginVertical: 14 }} />}
      {!loading && orders.length === 0 && <Text style={styles.empty}>Nessun ordine nel periodo</Text>}
      {!loading && hasMore && (
        <TouchableOpacity style={styles.more} onPress={() => load(orders.length)} testID="period-orders-load-more">
          <Text style={styles.moreText}>Mostra altri ordini</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: { backgroundColor: C.surface, borderRadius: R.xl, padding: 18, marginTop: 16, borderWidth: 1, borderColor: C.border },
  head: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 },
  icon: { width: 38, height: 38, borderRadius: 12, backgroundColor: C.primarySoft, alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: FONT, flex: 1, fontSize: 17, fontWeight: '700', color: C.text },
  count: { fontFamily: FONT, fontSize: 14, fontWeight: '700', color: C.text2 },
  day: { fontFamily: FONT, fontSize: 13, fontWeight: '700', color: C.text2, textTransform: 'capitalize', marginTop: 14, marginBottom: 6 },
  empty: { fontFamily: FONT, fontSize: 14, color: C.muted, textAlign: 'center', marginVertical: 18 },
  more: { alignSelf: 'center', marginTop: 14, paddingVertical: 11, paddingHorizontal: 22, borderRadius: R.pill, backgroundColor: C.primarySoft },
  moreText: { fontFamily: FONT, fontSize: 14, fontWeight: '700', color: C.primaryDark },
});
