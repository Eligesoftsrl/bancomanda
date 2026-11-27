import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { Order } from '../../types';
import { DayTotal, PeriodFilters, ordersApi, reportsApi } from '../../services/api';
import { C, FONT, R, statusOf } from '../../theme/tokens';
import { STATUS_LABELS, serviceOf } from '../orders/orderMeta';
import { PeriodOrderRow } from './PeriodOrderRow';
import { PeriodOrderFilters } from './PeriodOrderFilters';

const PAGE = 50;

type Props = { startDate: string; endDate: string; refreshKey: number; wide: boolean; onOpen: (o: Order) => void };

// Report di periodo: tutti gli ordini, raggruppati per giorno; toccandone uno si apre come in Ordini
export const PeriodOrdersList = ({ startDate, endDate, refreshKey, wide, onOpen }: Props) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [totals, setTotals] = useState<DayTotal[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<PeriodFilters>({});

  // La ricerca parte quando si smette di scrivere
  useEffect(() => {
    const t = setTimeout(() => setFilters((f) => ((f.customer || '') === search ? f : { ...f, customer: search })), 350);
    return () => clearTimeout(t);
  }, [search]);

  const load = useCallback(async (skip: number) => {
    setLoading(true);
    try {
      const [page, days] = await Promise.all([
        ordersApi.getByRange(startDate, endDate, skip, PAGE, filters),
        skip ? Promise.resolve(null) : reportsApi.getOrdersByDay(startDate, endDate, filters),
      ]);
      setOrders((prev) => (skip ? [...prev, ...page] : page));
      if (days) setTotals(days);
      setHasMore(page.length === PAGE);
    } catch {
      if (!skip) { setOrders([]); setTotals([]); }
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, filters]);

  useEffect(() => { load(0); }, [load, refreshKey]);

  const byDay = orders.reduce((acc, o) => {
    (acc[o.menuDate] = acc[o.menuDate] || []).push(o);
    return acc;
  }, {} as Record<string, Order[]>);
  const totalOf = Object.fromEntries(totals.map((t) => [t.date, t]));
  const count = totals.reduce((s, t) => s + t.totalOrders, 0);
  const revenue = totals.reduce((s, t) => s + t.totalRevenue, 0);

  return (
    <View style={styles.card} testID="period-orders-section">
      <View style={styles.head}>
        <View style={styles.icon}><Ionicons name="list" size={20} color={C.primary} /></View>
        <Text style={styles.title}>Ordini del periodo</Text>
        <Text style={styles.count} testID="period-orders-count">{count} ordini · {revenue.toFixed(2)} €</Text>
      </View>
      <PeriodOrderFilters search={search} onSearch={setSearch} filters={filters} onChange={setFilters} />
      {Object.entries(byDay).map(([day, list]) => (
        <View key={day} testID={`period-orders-day-${day}`}>
          <View style={styles.dayRow}>
            <Text style={styles.day}>{format(new Date(day), 'EEEE d MMMM', { locale: it })}</Text>
            <Text style={styles.dayTotal} testID={`period-orders-day-total-${day}`}>
              {totalOf[day]?.totalOrders ?? list.length} ordini · {(totalOf[day]?.totalRevenue ?? 0).toFixed(2)} €
            </Text>
          </View>
          {list.map((o) => (
            <PeriodOrderRow key={o.id} order={o} wide={wide} onPress={() => onOpen(o)}
              status={{ label: STATUS_LABELS[o.status] || o.status, tone: statusOf(o.status) }} service={serviceOf(o.serviceType)} />
          ))}
        </View>
      ))}
      {loading && <ActivityIndicator color={C.primary} style={{ marginVertical: 14 }} />}
      {!loading && orders.length === 0 && <Text style={styles.empty} testID="period-orders-empty">Nessun ordine con questi filtri</Text>}
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
  head: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 6 },
  icon: { width: 38, height: 38, borderRadius: 12, backgroundColor: C.primarySoft, alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: FONT, flex: 1, fontSize: 17, fontWeight: '700', color: C.text },
  count: { fontFamily: FONT, fontSize: 14, fontWeight: '700', color: C.text2 },
  dayRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginTop: 14, marginBottom: 6 },
  day: { fontFamily: FONT, fontSize: 13, fontWeight: '700', color: C.text2, textTransform: 'capitalize' },
  dayTotal: { fontFamily: FONT, fontSize: 13, fontWeight: '700', color: C.primaryDark, backgroundColor: C.primarySoft, paddingHorizontal: 10, paddingVertical: 3, borderRadius: R.pill },
  empty: { fontFamily: FONT, fontSize: 14, color: C.muted, textAlign: 'center', marginVertical: 18 },
  more: { alignSelf: 'center', marginTop: 14, paddingVertical: 11, paddingHorizontal: 22, borderRadius: R.pill, backgroundColor: C.primarySoft },
  moreText: { fontFamily: FONT, fontSize: 14, fontWeight: '700', color: C.primaryDark },
});
