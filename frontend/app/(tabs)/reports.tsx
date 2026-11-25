import { compositionText } from '../../src/utils/composition';
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Modal,
  TextInput,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { dismissToast, notify } from '../../src/store/toastStore';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { format, addDays, subDays, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { it } from 'date-fns/locale';
import { Calendar, LocaleConfig } from 'react-native-calendars';
import { useAppStore } from '../../src/store/appStore';
import { reportsApi, missedSalesApi, setupApi, ordersApi, kitchenApi, porzionaturApi, authApi, KitchenGroup } from '../../src/services/api';
import { DailySummary, DailyRevenuePoint, MissedSale, Order } from '../../src/types';
import { AccountButton } from '../../src/components/AccountButton';
import { C, FONT } from '../../src/theme/tokens';
import { PageHeader } from '../../src/components/ui2/PageHeader';
import { DatePill } from '../../src/components/ui2/DatePill';
import { StatCard } from '../../src/components/ui2/StatCard';
import { RevenueChart } from '../../src/components/reports/RevenueChart';

// Configure Italian locale for react-native-calendars
LocaleConfig.locales['it'] = {
  monthNames: ['Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno','Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre'],
  monthNamesShort: ['Gen','Feb','Mar','Apr','Mag','Giu','Lug','Ago','Set','Ott','Nov','Dic'],
  dayNames: ['Domenica','Lunedì','Martedì','Mercoledì','Giovedì','Venerdì','Sabato'],
  dayNamesShort: ['Dom','Lun','Mar','Mer','Gio','Ven','Sab'],
  today: 'Oggi'
};
LocaleConfig.defaultLocale = 'it';

const CHANNEL_LABELS: Record<string, string> = {
  persona: 'Di Persona',
  telefono: 'Telefono',
  whatsapp: 'WhatsApp',
  richiesta: 'Richiesta',
};


type ReportMode = 'daily' | 'range';

interface SetupStatus {
  database: string;
  collections: Record<string, number>;
  issues: { missing_initialPortions: number };
  status: string;
}

export default function ReportsScreen() {
  const isCompactR = useWindowDimensions().width < 768;
  const { selectedDate, setSelectedDate } = useAppStore();
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [summary, setSummary] = useState<DailySummary | null>(null);
  const [missedSales, setMissedSales] = useState<MissedSale[]>([]);
  const [topDishes, setTopDishes] = useState<any[]>([]);
  
  // Setup/Admin state
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showSetupModal, setShowSetupModal] = useState(false);
  const [password, setPassword] = useState('');
  const [setupStatus, setSetupStatus] = useState<SetupStatus | null>(null);
  const [isSetupLoading, setIsSetupLoading] = useState(false);
  
  // Report mode and date range
  const [reportMode, setReportMode] = useState<ReportMode>('daily');
  const [startDate, setStartDate] = useState(format(subDays(new Date(), 7), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  
  // Range statistics
  const [rangeStats, setRangeStats] = useState<{
    totalOrders: number;
    totalRevenue: number;
    missedSalesTotal: number;
    missedSalesQuantity: number;
  } | null>(null);

  const [dailyRevenue, setDailyRevenue] = useState<DailyRevenuePoint[]>([]);

  // Unpaid orders
  const [unpaidOrders, setUnpaidOrders] = useState<Order[]>([]);
  const [isLoadingUnpaid, setIsLoadingUnpaid] = useState(false);

  // Kitchen view (piatti flag "manda in cucina" per la data selezionata)
  const [kitchenGroups, setKitchenGroups] = useState<KitchenGroup[]>([]);
  const [isLoadingKitchen, setIsLoadingKitchen] = useState(false);

  // Porzionatura view (piatti degli ordini NON flag Cucina)
  const [porzionaturaGroups, setPorzionaturaGroups] = useState<KitchenGroup[]>([]);
  const [isLoadingPorzionatura, setIsLoadingPorzionatura] = useState(false);
  const [expandedPorzGroups, setExpandedPorzGroups] = useState<Record<string, boolean>>({});

  // Live silent sync state (Reports polling)
  const [lastReportSyncAt, setLastReportSyncAt] = useState<number>(Date.now());
  const [reportSyncError, setReportSyncError] = useState<boolean>(false);
  const [nowTs, setNowTs] = useState<number>(Date.now());

  const loadKitchen = async (silent: boolean = false) => {
    try {
      if (!silent) setIsLoadingKitchen(true);
      const data = await kitchenApi.getForDate(selectedDate);
      setKitchenGroups(data);
    } catch (error) {
      console.error('Error loading kitchen:', error);
    } finally {
      if (!silent) setIsLoadingKitchen(false);
    }
  };

  const handleToggleKitchenItemReady = async (entry: { orderId: string; itemIndex: number; itemStatus: string }) => {
    const nextStatus = entry.itemStatus === 'ready' ? 'pending' : 'ready';
    try {
      await ordersApi.updateItemStatusByIndex(entry.orderId, entry.itemIndex, nextStatus);
      await loadKitchen();
    } catch (error) {
      console.error('Error updating item status:', error);
      notify('Impossibile aggiornare il piatto', 'error');
    }
  };

  const loadPorzionatura = async (silent: boolean = false) => {
    try {
      if (!silent) setIsLoadingPorzionatura(true);
      const data = await porzionaturApi.getForDate(selectedDate);
      setPorzionaturaGroups(data);
    } catch (error) {
      console.error('Error loading porzionatura:', error);
    } finally {
      if (!silent) setIsLoadingPorzionatura(false);
    }
  };

  const handleTogglePortionReady = async (
    orderId: string,
    itemIndex: number,
    portionIndex: number,
    currentStatus: string
  ) => {
    const nextStatus = currentStatus === 'ready' ? 'pending' : 'ready';
    try {
      await ordersApi.updatePortionStatus(orderId, itemIndex, portionIndex, nextStatus);
      await loadPorzionatura();
    } catch (error) {
      console.error('Error updating portion status:', error);
      notify('Impossibile aggiornare la porzione', 'error');
    }
  };

  const togglePorzGroup = (dishName: string) => {
    setExpandedPorzGroups(prev => ({ ...prev, [dishName]: !prev[dishName] }));
  };
  
  // Calendar picker for range mode
  const [showCalendar, setShowCalendar] = useState(false);
  const [calendarStart, setCalendarStart] = useState<string | null>(null);
  const [calendarEnd, setCalendarEnd] = useState<string | null>(null);

  const loadUnpaidOrders = async () => {
    try {
      setIsLoadingUnpaid(true);
      const data = reportMode === 'daily'
        ? await ordersApi.getUnpaidByRange(undefined, undefined, selectedDate)
        : await ordersApi.getUnpaidByRange(startDate, endDate);
      setUnpaidOrders(data);
    } catch (error) {
      console.error('Error loading unpaid orders:', error);
    } finally {
      setIsLoadingUnpaid(false);
    }
  };

  const handleMarkAsPaid = async (order: Order) => {
    try {
      await ordersApi.updatePayment(order.id, true);
      setUnpaidOrders(prev => prev.filter(o => o.id !== order.id));
    } catch (error) {
      console.error('Error marking as paid:', error);
      notify('Impossibile aggiornare il pagamento', 'error');
    }
  };

  const unpaidTotal = unpaidOrders.reduce((sum, o) => sum + (o.total || 0), 0);

  const loadDailyData = async () => {
    try {
      setIsLoading(true);
      const [summaryData, missedData, topData] = await Promise.all([
        reportsApi.getDailySummary(selectedDate),
        missedSalesApi.getAll(selectedDate),
        reportsApi.getTopDishes(),
      ]);
      setSummary(summaryData);
      setMissedSales(missedData);
      setTopDishes(topData);
    } catch (error) {
      console.error('Error loading reports:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadRangeData = async () => {
    try {
      setIsLoading(true);
      
      reportsApi.getDailyRevenue(startDate, endDate).then(setDailyRevenue).catch(() => setDailyRevenue([]));
      const [topData, missedSummary, totals] = await Promise.all([
        reportsApi.getTopDishes(startDate, endDate, 10),
        reportsApi.getMissedSalesSummary(startDate, endDate),
        reportsApi.getRangeSummary(startDate, endDate),
      ]);
      setTopDishes(topData);
      setRangeStats({
        totalOrders: totals.totalOrders,
        totalRevenue: totals.totalRevenue,
        missedSalesTotal: missedSummary.totalMissedSales || 0,
        missedSalesQuantity: missedSummary.byDish?.reduce((acc: number, d: any) => acc + (d.totalQuantity || d.count || 0), 0) || 0,
      });
      
      // Convert missed sales by dish to array format
      if (missedSummary.byDish) {
        const missedArray = missedSummary.byDish.map((d: any, index: number) => ({
          id: `missed-${index}`,
          dishName: d.dishName,
          quantity: d.totalQuantity || d.count || 1,
          date: '',
          timeSlot: '',
          channel: '',
          reason: 'esaurito',
        }));
        setMissedSales(missedArray);
      }
    } catch (error) {
      console.error('Error loading range reports:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (reportMode === 'daily') {
      loadDailyData();
    } else {
      loadRangeData();
    }
    loadUnpaidOrders();
    if (reportMode === 'daily') {
      loadKitchen();
      loadPorzionatura();
    }
  }, [selectedDate, reportMode, startDate, endDate]);

  // --- Silent live sync ogni 30s per Reports (kitchen + porzionatura + orders per la data corrente) ---
  const silentSyncReports = async () => {
    try {
      const promises: Promise<any>[] = [];
      if (reportMode === 'daily') {
        promises.push(kitchenApi.getForDate(selectedDate).then(setKitchenGroups));
        promises.push(porzionaturApi.getForDate(selectedDate).then(setPorzionaturaGroups));
      }
      const unpaidPromise = reportMode === 'daily'
        ? ordersApi.getUnpaidByRange(undefined, undefined, selectedDate).then(setUnpaidOrders)
        : ordersApi.getUnpaidByRange(startDate, endDate).then(setUnpaidOrders);
      promises.push(unpaidPromise);
      await Promise.allSettled(promises);
      setLastReportSyncAt(Date.now());
      setReportSyncError(false);
    } catch {
      setReportSyncError(true);
    }
  };

  useEffect(() => {
    const syncInt = setInterval(silentSyncReports, 30000);
    const clockInt = setInterval(() => setNowTs(Date.now()), 5000);
    const onFocus = () => silentSyncReports();
    if (typeof window !== 'undefined' && typeof (window as any).addEventListener === 'function') {
      (window as any).addEventListener('focus', onFocus);
      (window as any).addEventListener('online', onFocus);
    }
    return () => {
      clearInterval(syncInt);
      clearInterval(clockInt);
      if (typeof window !== 'undefined' && typeof (window as any).removeEventListener === 'function') {
        (window as any).removeEventListener('focus', onFocus);
        (window as any).removeEventListener('online', onFocus);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate, reportMode, startDate, endDate]);

  const secondsSinceReportSync = Math.floor((nowTs - lastReportSyncAt) / 1000);
  const reportFreshness: 'fresh' | 'stale' | 'error' = reportSyncError
    ? 'error'
    : secondsSinceReportSync < 45 ? 'fresh' : 'stale';
  const reportFreshnessLabel = reportSyncError
    ? 'Errore. Ricarica.'
    : secondsSinceReportSync < 10
      ? 'Aggiornato ora'
      : secondsSinceReportSync < 60
        ? `Aggiornato ${secondsSinceReportSync}s fa`
        : `Aggiornato ${Math.floor(secondsSinceReportSync / 60)} min fa`;

  const onRefresh = async () => {
    setRefreshing(true);
    if (reportMode === 'daily') {
      await loadDailyData();
      await loadKitchen();
    } else {
      await loadRangeData();
    }
    setRefreshing(false);
  };

  const changeDate = (days: number) => {
    const currentDate = new Date(selectedDate);
    currentDate.setDate(currentDate.getDate() + days);
    setSelectedDate(format(currentDate, 'yyyy-MM-dd'));
  };

  const changeDateRange = (which: 'start' | 'end', days: number) => {
    if (which === 'start') {
      const newDate = addDays(new Date(startDate), days);
      if (newDate <= new Date(endDate)) {
        setStartDate(format(newDate, 'yyyy-MM-dd'));
      }
    } else {
      const newDate = addDays(new Date(endDate), days);
      if (newDate >= new Date(startDate)) {
        setEndDate(format(newDate, 'yyyy-MM-dd'));
      }
    }
  };

  // Setup/Admin functions
  // Sblocco verificato dal server con la password dell'account (nessuna password scritta nell'app)
  const handlePasswordSubmit = async () => {
    try {
      await authApi.verifyPassword(password);
      dismissToast();
      setShowPasswordModal(false);
      setPassword('');
      setShowSetupModal(true);
      checkSetupStatus();
    } catch (error: any) {
      notify(error?.response?.data?.detail || 'Password non corretta', 'error');
      setPassword('');
    }
  };

  const checkSetupStatus = async () => {
    try {
      const status = await setupApi.getStatus();
      setSetupStatus(status);
    } catch (error) {
      console.error('Error checking setup status:', error);
    }
  };

  const runSetup = async () => {
    setIsSetupLoading(true);
    try {
      const result = await setupApi.runSetup();
      notify(`Setup completato: categorie aggiunte ${result.categories_added}, menu aggiornati ${result.menus_updated}`);
      checkSetupStatus();
    } catch (error) {
      console.error('Error running setup:', error);
      notify('Impossibile eseguire il setup del database', 'error');
    } finally {
      setIsSetupLoading(false);
    }
  };

  const closeSetupModal = () => {
    setShowSetupModal(false);
    setSetupStatus(null);
  };

  // Calculate total missed quantity
  const totalMissedQuantity = missedSales.reduce((acc, ms) => acc + (ms.quantity || 1), 0);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#00A1FF" />
          <Text style={styles.loadingText}>Caricamento...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Password Modal */}
      <Modal
        visible={showPasswordModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowPasswordModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Ionicons name="lock-closed" size={40} color="#F2545B" />
              <Text style={styles.modalTitle}>Area Riservata</Text>
              <Text style={styles.modalSubtitle}>
                Inserisci la password del tuo account (la stessa usata per accedere)
              </Text>
            </View>
            <TextInput
              style={styles.passwordInput}
              placeholder="Password"
              placeholderTextColor="#5A6A85"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
              onSubmitEditing={handlePasswordSubmit}
              autoFocus
              testID="settings-password-input"
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setShowPasswordModal(false);
                  setPassword('');
                }}
              >
                <Text style={styles.cancelButtonText}>Annulla</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.loginButton}
                onPress={handlePasswordSubmit}
                testID="settings-password-submit"
              >
                <Text style={styles.loginButtonText}>Accedi</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Setup Modal */}
      <Modal
        visible={showSetupModal}
        transparent={true}
        animationType="slide"
        onRequestClose={closeSetupModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.setupModalContent}>
            <View style={styles.setupModalHeader}>
              <Text style={styles.setupModalTitle}>Impostazioni Admin</Text>
              <TouchableOpacity onPress={closeSetupModal}>
                <Ionicons name="close" size={28} color="#2A3547" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.setupModalBody}>
              {/* Status Section */}
              <View style={styles.setupSection}>
                <View style={styles.setupSectionHeader}>
                  <Text style={styles.setupSectionTitle}>Stato Database</Text>
                  <TouchableOpacity onPress={checkSetupStatus}>
                    <Ionicons name="refresh" size={20} color="#00A1FF" />
                  </TouchableOpacity>
                </View>

                {setupStatus ? (
                  <View style={styles.statusContainer}>
                    <View style={styles.statusRow}>
                      <Text style={styles.statusLabel}>Stato:</Text>
                      <View style={[
                        styles.statusBadge,
                        setupStatus.status === 'ok' ? styles.statusOk : styles.statusWarning
                      ]}>
                        <Text style={styles.statusBadgeText}>
                          {setupStatus.status === 'ok' ? 'OK' : 'Setup Necessario'}
                        </Text>
                      </View>
                    </View>
                    {setupStatus.issues.missing_initialPortions > 0 && (
                      <View style={styles.warningBox}>
                        <Ionicons name="warning" size={18} color="#FFAE1F" />
                        <Text style={styles.warningText}>
                          {setupStatus.issues.missing_initialPortions} piatti senza porzioni iniziali
                        </Text>
                      </View>
                    )}
                  </View>
                ) : (
                  <ActivityIndicator size="small" color="#00A1FF" />
                )}
              </View>

              {/* Setup Action */}
              <View style={styles.setupSection}>
                <Text style={styles.setupSectionTitle}>Azioni</Text>
                <TouchableOpacity
                  style={[styles.setupButton, isSetupLoading && styles.setupButtonDisabled]}
                  onPress={runSetup}
                  disabled={isSetupLoading}
                >
                  {isSetupLoading ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="build" size={20} color="#ffffff" />
                      <Text style={styles.setupButtonText}>Esegui Setup Database</Text>
                    </>
                  )}
                </TouchableOpacity>
                <Text style={styles.setupHint}>
                  Sincronizza categorie e campi mancanti nel database.
                </Text>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Header */}
      <PageHeader
        title="Report e Statistiche"
        subtitle="Incassi, cucina e andamento dei piatti"
        testID="reports-header"
        right={
          <>
            <TouchableOpacity
              style={styles.reportSyncIndicator}
              onPress={silentSyncReports}
              testID="report-sync-indicator"
            >
              <View style={[
                styles.reportSyncDot,
                reportFreshness === 'fresh' && styles.reportSyncDotFresh,
                reportFreshness === 'stale' && styles.reportSyncDotStale,
                reportFreshness === 'error' && styles.reportSyncDotError,
              ]} />
              <Text style={[
                styles.reportSyncLabel,
                reportFreshness === 'error' && styles.reportSyncLabelError,
              ]}>{reportFreshnessLabel}</Text>
            </TouchableOpacity>
            <AccountButton />
            <TouchableOpacity
              style={styles.settingsButton}
              onPress={() => setShowPasswordModal(true)}
              testID="report-settings-button"
            >
              <Ionicons name="settings-outline" size={22} color="#5A6A85" />
            </TouchableOpacity>
          </>
        }
      >
        {/* Mode Selector */}
        <View style={styles.modeSelector}>
          <TouchableOpacity
            style={[styles.modeButton, reportMode === 'daily' && styles.modeButtonActive]}
            onPress={() => setReportMode('daily')}
            testID="report-mode-daily"
          >
            <Text style={[styles.modeButtonText, reportMode === 'daily' && styles.modeButtonTextActive]}>
              Giornaliero
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modeButton, reportMode === 'range' && styles.modeButtonActive]}
            onPress={() => setReportMode('range')}
            testID="report-mode-range"
          >
            <Text style={[styles.modeButtonText, reportMode === 'range' && styles.modeButtonTextActive]}>
              Periodo
            </Text>
          </TouchableOpacity>
        </View>
        
        {/* Date Selector */}
        {reportMode === 'daily' ? (
          <View style={styles.dateSelector}>
            <DatePill selectedDate={selectedDate} onChange={changeDate} compact={isCompactR} idPrefix="report-" />
          </View>
        ) : (
          <View style={styles.rangeDateSelector}>
            {/* Preset shortcuts */}
            <View style={styles.presetRow}>
              <TouchableOpacity 
                style={styles.presetChip}
                onPress={() => {
                  setStartDate(format(subDays(new Date(), 6), 'yyyy-MM-dd'));
                  setEndDate(format(new Date(), 'yyyy-MM-dd'));
                }}
                testID="preset-7days"
              >
                <Text style={styles.presetChipText}>7 giorni</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.presetChip}
                onPress={() => {
                  setStartDate(format(subDays(new Date(), 29), 'yyyy-MM-dd'));
                  setEndDate(format(new Date(), 'yyyy-MM-dd'));
                }}
                testID="preset-30days"
              >
                <Text style={styles.presetChipText}>30 giorni</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.presetChip}
                onPress={() => {
                  const now = new Date();
                  setStartDate(format(startOfMonth(now), 'yyyy-MM-dd'));
                  setEndDate(format(now, 'yyyy-MM-dd'));
                }}
                testID="preset-this-month"
              >
                <Text style={styles.presetChipText}>Questo mese</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.presetChip}
                onPress={() => {
                  const prev = subMonths(new Date(), 1);
                  setStartDate(format(startOfMonth(prev), 'yyyy-MM-dd'));
                  setEndDate(format(endOfMonth(prev), 'yyyy-MM-dd'));
                }}
                testID="preset-prev-month"
              >
                <Text style={styles.presetChipText}>Mese scorso</Text>
              </TouchableOpacity>
            </View>

            {/* Clickable date range that opens the calendar */}
            <TouchableOpacity
              style={styles.dateRangeButton}
              onPress={() => {
                setCalendarStart(startDate);
                setCalendarEnd(endDate);
                setShowCalendar(true);
              }}
              testID="open-calendar-button"
            >
              <Ionicons name="calendar-outline" size={20} color="#00A1FF" />
              <Text style={styles.dateRangeButtonText}>
                {format(new Date(startDate), 'd MMM yyyy', { locale: it })}
                {'  →  '}
                {format(new Date(endDate), 'd MMM yyyy', { locale: it })}
              </Text>
              <Ionicons name="chevron-down" size={18} color="#5A6A85" />
            </TouchableOpacity>
          </View>
        )}
      </PageHeader>

      {/* Content */}
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentInner}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#00A1FF" />
        }
      >
        {/* Summary Cards */}
        <View style={styles.summaryGrid}>
          <StatCard
            icon="receipt-outline"
            tone="primary"
            index={0}
            testID="report-stat-orders"
            value={reportMode === 'daily' ? (summary?.totalOrders || 0) : (rangeStats?.totalOrders || 0)}
            label={reportMode === 'daily' ? 'Ordini totali' : 'Ordini periodo'}
          />
          <StatCard
            icon="cash-outline"
            tone="success"
            index={1}
            testID="report-stat-revenue"
            value={`${(reportMode === 'daily' ? (summary?.totalRevenue || 0) : (rangeStats?.totalRevenue || 0)).toFixed(2)} €`}
            label={reportMode === 'daily' ? 'Incasso giorno' : 'Incasso periodo'}
          />
          <StatCard
            icon="alert-circle-outline"
            tone="error"
            index={2}
            testID="report-stat-missed"
            value={totalMissedQuantity}
            label="Mancate vendite"
          />
        </View>

        {reportMode === 'range' && <RevenueChart data={dailyRevenue} loading={isLoading} />}

        {/* Daily-only sections */}
        {reportMode === 'daily' && (
          <>
            {/* Channel Breakdown */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Vendite per Canale</Text>
              <View style={styles.channelGrid}>
                {Object.entries(summary?.channelBreakdown || {}).map(([channel, count]) => (
                  <View key={channel} style={styles.channelCard}>
                    <Ionicons
                      name={
                        channel === 'whatsapp' ? 'logo-whatsapp' :
                        channel === 'telefono' ? 'call' : 'person'
                      }
                      size={24}
                      color="#00A1FF"
                    />
                    <Text style={styles.channelCount}>{count as number}</Text>
                    <Text style={styles.channelLabel}>{CHANNEL_LABELS[channel] || channel}</Text>
                  </View>
                ))}
                {Object.keys(summary?.channelBreakdown || {}).length === 0 && (
                  <Text style={styles.noDataText}>Nessun dato disponibile</Text>
                )}
              </View>
            </View>

            {/* Porzionatura - piatti degli ordini NON flag Cucina, con conferma per singola porzione */}
            <View style={styles.section} testID="porzionatura-section">
              <View style={styles.kitchenHeader}>
                <View style={styles.kitchenHeaderLeft}>
                  <View style={[styles.kitchenIconBubble, { backgroundColor: '#8965E5' }]}>
                    <Ionicons name="scale-outline" size={22} color="#fff" />
                  </View>
                  <View>
                    <Text style={styles.sectionTitle}>Porzionatura</Text>
                    <Text style={styles.kitchenSubtitle}>
                      {porzionaturaGroups.reduce((s, g) => s + g.pendingQuantity, 0)} da porzionare · {porzionaturaGroups.reduce((s, g) => s + g.totalQuantity, 0)} totali · {porzionaturaGroups.length} tipi
                    </Text>
                  </View>
                </View>
                <TouchableOpacity onPress={() => loadPorzionatura()} style={styles.kitchenRefreshBtn} testID="porzionatura-refresh">
                  <Ionicons name="refresh" size={20} color="#8965E5" />
                </TouchableOpacity>
              </View>

              {isLoadingPorzionatura ? (
                <ActivityIndicator size="small" color="#8965E5" style={{ marginVertical: 16 }} />
              ) : porzionaturaGroups.length === 0 ? (
                <Text style={styles.noDataText}>Nessun piatto da porzionare per oggi.</Text>
              ) : (
                porzionaturaGroups.map((group) => {
                  const isOpen = !!expandedPorzGroups[group.dishName];
                  return (
                    <View key={`porz-${group.dishName}`} style={styles.kitchenGroup}>
                      <TouchableOpacity
                        style={styles.kitchenGroupHeader}
                        onPress={() => togglePorzGroup(group.dishName)}
                        testID={`porz-group-${group.dishName}`}
                        activeOpacity={0.7}
                      >
                        <View style={styles.porzGroupHeaderLeft}>
                          <Ionicons
                            name={isOpen ? 'chevron-down' : 'chevron-forward'}
                            size={18}
                            color="#5A6A85"
                          />
                          <Text style={styles.kitchenGroupName}>{group.dishName}</Text>
                        </View>
                        <View style={styles.kitchenGroupBadge}>
                          <Text style={styles.kitchenGroupBadgeText}>
                            {group.pendingQuantity}/{group.totalQuantity}
                          </Text>
                        </View>
                      </TouchableOpacity>
                      {isOpen && group.entries.flatMap((entry) => {
                        // Espansione visiva: N righe per una entry con quantity=N
                        // Ogni riga ha il proprio status da entry.portionStatuses[p]
                        const portionStatuses = entry.portionStatuses || Array(entry.quantity).fill(entry.itemStatus || 'pending');
                        const serviceMap: Record<string, { label: string; color: string }> = {
                          da_consegnare: { label: 'Da consegnare', color: '#00A1FF' },
                          da_ritirare: { label: 'Da ritirare', color: '#FFAE1F' },
                          in_sede: { label: 'In sede', color: '#0E9F80' },
                        };
                        const svc = serviceMap[entry.serviceType] || { label: entry.serviceType, color: '#5A6A85' };
                        return Array.from({ length: entry.quantity }).map((_, portionIdx) => {
                          const portionStatus = portionStatuses[portionIdx] || 'pending';
                          const isReady = portionStatus === 'ready';
                          return (
                            <View
                              key={`porz-${entry.orderId}-${entry.itemIndex}-${portionIdx}`}
                              style={[styles.kitchenEntry, isReady && styles.kitchenEntryReady]}
                              testID={`porz-entry-${entry.orderId}-${entry.itemIndex}-${portionIdx}`}
                            >
                              <View style={[styles.kitchenQtyBubble, { backgroundColor: '#EEE8FF', borderColor: '#8965E5' }]}>
                                <Text style={styles.kitchenQty}>1x</Text>
                              </View>
                              <View style={styles.kitchenEntryInfo}>
                                <View style={styles.kitchenEntryMainRow}>
                                  <Text style={[styles.kitchenEntryText, isReady && styles.kitchenEntryTextReady]}>
                                    Ordine #{entry.orderNumber}
                                    {entry.customerName ? ` · ${entry.customerName}` : ''}
                                  </Text>
                                  {entry.deliveryTime ? (
                                    <View style={styles.kitchenTimeBadge}>
                                      <Ionicons name="time-outline" size={12} color="#5A6A85" />
                                      <Text style={styles.kitchenTimeText}>{entry.deliveryTime}</Text>
                                    </View>
                                  ) : null}
                                </View>
                                <View style={styles.kitchenEntryMeta}>
                                  <View style={[styles.kitchenServiceBadge, { backgroundColor: svc.color }]}>
                                    <Text style={styles.kitchenServiceText}>{svc.label}</Text>
                                  </View>
                                  {!!entry.composition?.length && (
                                    <Text style={styles.kitchenEntryComposition} testID={`porz-entry-composition-${entry.orderId}-${entry.itemIndex}`}>
                                      {compositionText(entry.composition)}
                                    </Text>
                                  )}
                                  {entry.notes ? (
                                    <Text style={styles.kitchenEntryNote} numberOfLines={2}>
                                      📝 {entry.notes}
                                    </Text>
                                  ) : null}
                                </View>
                              </View>
                              <TouchableOpacity
                                style={[styles.kitchenCompleteBtn, isReady && styles.kitchenCompleteBtnDone]}
                                onPress={() => handleTogglePortionReady(entry.orderId, entry.itemIndex, portionIdx, portionStatus)}
                                testID={`porz-complete-btn-${entry.orderId}-${entry.itemIndex}-${portionIdx}`}
                                activeOpacity={0.7}
                              >
                                {isReady ? (
                                  <>
                                    <Ionicons name="checkmark-circle" size={18} color="#fff" />
                                    <Text style={styles.kitchenCompleteBtnDoneText}>Fatto</Text>
                                  </>
                                ) : (
                                  <>
                                    <Ionicons name="checkmark" size={18} color="#8965E5" />
                                    <Text style={[styles.kitchenCompleteBtnText, { color: '#8965E5' }]}>Pronto</Text>
                                  </>
                                )}
                              </TouchableOpacity>
                            </View>
                          );
                        });
                      })}
                    </View>
                  );
                })
              )}
            </View>

            {/* Menu Availability */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Disponibilità Menu</Text>
              {summary?.menuItems && summary.menuItems.length > 0 ? (
                summary.menuItems.map((item, index) => (
                  <View key={`menu-avail-${item.dishId || item.dishName}-${index}`} style={styles.menuAvailRow}>
                    <Text style={styles.menuAvailName}>{item.dishName}</Text>
                    <View style={[
                      styles.availBadge,
                      item.portions === 0 && styles.availBadgeEmpty,
                      item.portions > 0 && item.portions <= 3 && styles.availBadgeLow,
                    ]}>
                      <Text style={styles.availBadgeText}>
                        {item.portions === 0 ? 'Esaurito' : `${item.portions} disp.`}
                      </Text>
                    </View>
                  </View>
                ))
              ) : (
                <Text style={styles.noDataText}>Nessun menu per oggi</Text>
              )}
            </View>
          </>
        )}

        {/* Kitchen Section - only in daily mode */}
        {reportMode === 'daily' && (
          <View style={styles.section} testID="kitchen-section">
            <View style={styles.kitchenHeader}>
              <View style={styles.kitchenHeaderLeft}>
                <View style={styles.kitchenIconBubble}>
                  <Ionicons name="person" size={22} color="#fff" />
                </View>
                <View>
                  <Text style={styles.sectionTitle}>Cucina</Text>
                  <Text style={styles.kitchenSubtitle}>
                    {kitchenGroups.reduce((s, g) => s + g.pendingQuantity, 0)} da preparare · {kitchenGroups.length} tipi piatto
                  </Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => loadKitchen()} style={styles.kitchenRefreshBtn} testID="kitchen-refresh">
                <Ionicons name="refresh" size={20} color="#8965E5" />
              </TouchableOpacity>
            </View>

            {isLoadingKitchen ? (
              <ActivityIndicator size="small" color="#FFAE1F" style={{ marginVertical: 16 }} />
            ) : kitchenGroups.length === 0 ? (
              <Text style={styles.noDataText}>Nessun piatto in cucina per oggi.{"\n"}Marca i piatti negli ordini con l&apos;icona 👨‍🍳 per farli comparire qui.</Text>
            ) : (
              kitchenGroups.map((group) => (
                <View key={group.dishName} style={styles.kitchenGroup}>
                  <View style={styles.kitchenGroupHeader}>
                    <Text style={styles.kitchenGroupName}>{group.dishName}</Text>
                    <View style={styles.kitchenGroupBadge}>
                      <Text style={styles.kitchenGroupBadgeText}>
                        {group.pendingQuantity}/{group.totalQuantity}
                      </Text>
                    </View>
                  </View>
                  {group.entries.map((entry) => {
                    const isReady = entry.itemStatus === 'ready';
                    const serviceMap: Record<string, { label: string; color: string }> = {
                      da_consegnare: { label: 'Da consegnare', color: '#00A1FF' },
                      da_ritirare: { label: 'Da ritirare', color: '#FFAE1F' },
                      in_sede: { label: 'In sede', color: '#0E9F80' },
                    };
                    const svc = serviceMap[entry.serviceType] || { label: entry.serviceType, color: '#5A6A85' };
                    return (
                      <View
                        key={`${entry.orderId}-${entry.itemIndex}`}
                        style={[styles.kitchenEntry, isReady && styles.kitchenEntryReady]}
                        testID={`kitchen-entry-${entry.orderId}-${entry.itemIndex}`}
                      >
                        <View style={styles.kitchenQtyBubble}>
                          <Text style={styles.kitchenQty}>{entry.quantity}x</Text>
                        </View>
                        <View style={styles.kitchenEntryInfo}>
                          <View style={styles.kitchenEntryMainRow}>
                            <Text style={[styles.kitchenEntryText, isReady && styles.kitchenEntryTextReady]}>
                              Ordine #{entry.orderNumber}
                              {entry.customerName ? ` · ${entry.customerName}` : ''}
                            </Text>
                            {entry.deliveryTime ? (
                              <View style={styles.kitchenTimeBadge}>
                                <Ionicons name="time-outline" size={12} color="#5A6A85" />
                                <Text style={styles.kitchenTimeText}>{entry.deliveryTime}</Text>
                              </View>
                            ) : null}
                          </View>
                          <View style={styles.kitchenEntryMeta}>
                            <View style={[styles.kitchenServiceBadge, { backgroundColor: svc.color }]}>
                              <Text style={styles.kitchenServiceText}>{svc.label}</Text>
                            </View>
                            {!!entry.composition?.length && (
                              <Text style={styles.kitchenEntryComposition} testID={`kitchen-entry-composition-${entry.orderId}-${entry.itemIndex}`}>
                                {compositionText(entry.composition)}
                              </Text>
                            )}
                            {entry.notes ? (
                              <Text style={styles.kitchenEntryNote} numberOfLines={2}>
                                📝 {entry.notes}
                              </Text>
                            ) : null}
                          </View>
                        </View>
                        <TouchableOpacity
                          style={[styles.kitchenCompleteBtn, isReady && styles.kitchenCompleteBtnDone]}
                          onPress={() => handleToggleKitchenItemReady(entry)}
                          testID={`kitchen-complete-btn-${entry.orderId}-${entry.itemIndex}`}
                          activeOpacity={0.7}
                        >
                          {isReady ? (
                            <>
                              <Ionicons name="checkmark-circle" size={18} color="#fff" />
                              <Text style={styles.kitchenCompleteBtnDoneText}>Fatto</Text>
                            </>
                          ) : (
                            <>
                              <Ionicons name="checkmark" size={18} color="#0E9F80" />
                              <Text style={styles.kitchenCompleteBtnText}>Completa</Text>
                            </>
                          )}
                        </TouchableOpacity>
                      </View>
                    );
                  })}
                </View>
              ))
            )}
          </View>
        )}

        {/* Unpaid Orders Section */}
        <View style={styles.section} testID="unpaid-orders-section">
          <View style={styles.unpaidHeader}>
            <View style={styles.unpaidHeaderLeft}>
              <Ionicons name="card-outline" size={22} color="#F2545B" />
              <Text style={styles.sectionTitle}>
                {reportMode === 'daily' ? 'Ordini Non Pagati del Giorno' : 'Ordini Non Pagati nel Periodo'}
              </Text>
            </View>
            {unpaidOrders.length > 0 && (
              <View style={styles.unpaidBadge}>
                <Text style={styles.unpaidBadgeText}>{unpaidOrders.length}</Text>
              </View>
            )}
          </View>
          
          {isLoadingUnpaid ? (
            <ActivityIndicator size="small" color="#F2545B" style={{ marginVertical: 16 }} />
          ) : unpaidOrders.length === 0 ? (
            <Text style={styles.noDataText}>
              {reportMode === 'daily' ? 'Nessun ordine non pagato oggi' : 'Nessun ordine non pagato nel periodo'}
            </Text>
          ) : (
            <>
              {unpaidOrders.map((order) => (
                <View key={order.id} style={styles.unpaidOrderRow} testID={`unpaid-order-${order.id}`}>
                  <View style={styles.unpaidOrderInfo}>
                    <Text style={styles.unpaidOrderCustomer}>
                      {order.customerName || 'Anonimo'}
                    </Text>
                    <Text style={styles.unpaidOrderMeta}>
                      #{order.orderNumber} • {order.menuDate} • {(order.total || 0).toFixed(2)} €
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.markPaidBtn}
                    onPress={() => handleMarkAsPaid(order)}
                    testID={`mark-paid-${order.id}`}
                  >
                    <Ionicons name="checkmark-circle" size={22} color="#fff" />
                    <Text style={styles.markPaidBtnText}>Paga ora</Text>
                  </TouchableOpacity>
                </View>
              ))}
              <View style={styles.unpaidTotalRow}>
                <Text style={styles.unpaidTotalLabel}>Totale da incassare:</Text>
                <Text style={styles.unpaidTotalValue}>{unpaidTotal.toFixed(2)} €</Text>
              </View>
            </>
          )}
        </View>

        {/* Top Dishes - Show in both modes */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {reportMode === 'daily' ? 'Piatti Più Venduti (Storico)' : 'Piatti Più Venduti nel Periodo'}
          </Text>
          {topDishes.length > 0 ? (
            topDishes.slice(0, 10).map((dish, index) => (
              <View key={`top-dish-${dish.dishId || dish.dishName}-${index}`} style={styles.topDishRow}>
                <View style={styles.rankBadge}>
                  <Text style={styles.rankText}>{index + 1}</Text>
                </View>
                <View style={styles.topDishInfo}>
                  <Text style={styles.topDishName}>{dish.dishName}</Text>
                  <Text style={styles.topDishStats}>
                    {dish.totalQuantity} porzioni • {dish.totalRevenue.toFixed(2)} €
                  </Text>
                </View>
              </View>
            ))
          ) : (
            <Text style={styles.noDataText}>Nessun dato disponibile</Text>
          )}
        </View>

        {/* Missed Sales */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {reportMode === 'daily' ? 'Mancate Vendite del Giorno' : 'Mancate Vendite nel Periodo'}
          </Text>
          {missedSales.length > 0 ? (
            missedSales.map((ms, index) => (
              <View key={ms.id || `missed-${index}`} style={styles.missedSaleRow}>
                <View style={styles.missedSaleInfo}>
                  <Text style={styles.missedSaleName}>{ms.dishName}</Text>
                  {reportMode === 'daily' && ms.timeSlot && (
                    <Text style={styles.missedSaleDetails}>
                      {ms.timeSlot} • {CHANNEL_LABELS[ms.channel] || ms.channel}
                    </Text>
                  )}
                </View>
                <View style={styles.missedQuantityBadge}>
                  <Text style={styles.missedQuantityText}>
                    {ms.quantity || 1} {(ms.quantity || 1) === 1 ? 'richiesta' : 'richieste'}
                  </Text>
                </View>
              </View>
            ))
          ) : (
            <Text style={styles.noDataText}>
              {reportMode === 'daily' ? 'Nessuna mancata vendita oggi' : 'Nessuna mancata vendita nel periodo'}
            </Text>
          )}
          
          {missedSales.length > 0 && (
            <View style={styles.missedTotalRow}>
              <Text style={styles.missedTotalLabel}>Totale Richieste Non Soddisfatte:</Text>
              <Text style={styles.missedTotalValue}>{totalMissedQuantity}</Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Calendar Modal for selecting date range */}
      <Modal
        visible={showCalendar}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCalendar(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowCalendar(false)}
          testID="calendar-overlay"
        >
          <TouchableOpacity
            style={styles.calendarModalContent}
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
          >
            <Text style={styles.calendarTitle}>
              {!calendarStart || (calendarStart && calendarEnd)
                ? 'Seleziona data iniziale'
                : 'Seleziona data finale'}
            </Text>
            <Text style={styles.calendarSubtitle}>
              {calendarStart && !calendarEnd
                ? `Dal: ${format(new Date(calendarStart), 'd MMM yyyy', { locale: it })}`
                : calendarStart && calendarEnd
                ? `${format(new Date(calendarStart), 'd MMM yyyy', { locale: it })}  →  ${format(new Date(calendarEnd), 'd MMM yyyy', { locale: it })}`
                : 'Tocca una data per iniziare'}
            </Text>
            
            <Calendar
              current={endDate}
              maxDate={format(new Date(), 'yyyy-MM-dd')}
              markingType="period"
              markedDates={(() => {
                if (!calendarStart) return {};
                if (calendarStart && !calendarEnd) {
                  return {
                    [calendarStart]: { startingDay: true, endingDay: true, color: '#00A1FF', textColor: '#fff' }
                  };
                }
                // Build the range
                const marked: any = {};
                const start = new Date(calendarStart!);
                const end = new Date(calendarEnd!);
                let cur = start;
                while (cur <= end) {
                  const d = format(cur, 'yyyy-MM-dd');
                  marked[d] = {
                    color: '#00A1FF',
                    textColor: '#fff',
                    ...(d === calendarStart ? { startingDay: true } : {}),
                    ...(d === calendarEnd ? { endingDay: true } : {}),
                  };
                  cur = addDays(cur, 1);
                }
                return marked;
              })()}
              onDayPress={(day) => {
                const picked = day.dateString;
                if (!calendarStart || (calendarStart && calendarEnd)) {
                  // Start a new selection
                  setCalendarStart(picked);
                  setCalendarEnd(null);
                } else {
                  // Second click: set end (or swap if before start)
                  if (picked < calendarStart) {
                    setCalendarEnd(calendarStart);
                    setCalendarStart(picked);
                  } else {
                    setCalendarEnd(picked);
                  }
                }
              }}
              theme={{
                calendarBackground: '#ffffff',
                backgroundColor: '#ffffff',
                textSectionTitleColor: '#5A6A85',
                dayTextColor: '#2A3547',
                monthTextColor: '#2A3547',
                arrowColor: '#00A1FF',
                todayTextColor: '#00A1FF',
                selectedDayBackgroundColor: '#00A1FF',
                selectedDayTextColor: '#fff',
                textDisabledColor: '#98A4B8',
              }}
              firstDay={1}
            />
            
            <View style={styles.calendarActionsRow}>
              <TouchableOpacity
                style={styles.calendarCancelBtn}
                onPress={() => setShowCalendar(false)}
                testID="calendar-cancel"
              >
                <Text style={styles.calendarCancelBtnText}>Annulla</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.calendarApplyBtn, (!calendarStart || !calendarEnd) && styles.disabledButton]}
                disabled={!calendarStart || !calendarEnd}
                onPress={() => {
                  if (calendarStart && calendarEnd) {
                    setStartDate(calendarStart);
                    setEndDate(calendarEnd);
                    setShowCalendar(false);
                  }
                }}
                testID="calendar-apply"
              >
                <Text style={styles.calendarApplyBtnText}>Applica</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F7FB',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontFamily: FONT,
    color: '#2A3547',
    marginTop: 10,
    fontSize: 16,
  },
  header: {
    padding: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E6EB',
  },
  headerTitle: {
    fontFamily: FONT,
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2A3547',
    textAlign: 'center',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  reportSyncIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
    paddingHorizontal: 14,
    minHeight: 44,
    borderRadius: 999,
    backgroundColor: '#F6F9FC',
    borderWidth: 1,
    borderColor: '#E0E6EB',
  },
  reportSyncDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#98A4B8',
  },
  reportSyncDotFresh: { backgroundColor: '#0E9F80' },
  reportSyncDotStale: { backgroundColor: '#FFAE1F' },
  reportSyncDotError: { backgroundColor: '#F2545B' },
  reportSyncLabel: {
    fontFamily: FONT,
    fontSize: 11,
    color: '#5A6A85',
    fontWeight: '600',
  },
  reportSyncLabelError: {
    color: '#F2545B',
    fontWeight: '700',
  },
  dateSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  dateButton: {
    padding: 8,
  },
  dateText: {
    fontFamily: FONT,
    fontSize: 18,
    color: '#00A1FF',
    fontWeight: '600',
    marginHorizontal: 16,
    textTransform: 'capitalize',
  },
  content: {
    flex: 1,
  },
  contentInner: {
    padding: 16,
    paddingBottom: 32,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
  },
  ordersCard: {},
  revenueCard: {},
  missedCard: {},
  summaryValue: {
    fontFamily: FONT,
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2A3547',
    marginTop: 8,
  },
  summaryLabel: {
    fontFamily: FONT,
    fontSize: 12,
    color: '#5A6A85',
    marginTop: 4,
    textAlign: 'center',
  },
  section: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: C.border,
    shadowColor: '#5A6A85',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontFamily: FONT,
    fontSize: 18,
    fontWeight: '600',
    color: '#2A3547',
    marginBottom: 16,
  },
  channelGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  channelCard: {
    flex: 1,
    backgroundColor: '#F4F7FB',
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
  },
  channelCount: {
    fontFamily: FONT,
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2A3547',
    marginTop: 8,
  },
  channelLabel: {
    fontFamily: FONT,
    fontSize: 12,
    color: '#5A6A85',
    marginTop: 4,
  },
  noDataText: {
    fontFamily: FONT,
    color: '#5A6A85',
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 20,
  },
  dishSaleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E6EB',
  },
  dishSaleInfo: {
    flex: 1,
  },
  dishSaleName: {
    fontFamily: FONT,
    fontSize: 15,
    color: '#2A3547',
    fontWeight: '500',
  },
  dishSaleQty: {
    fontFamily: FONT,
    fontSize: 13,
    color: '#5A6A85',
    marginTop: 2,
  },
  dishSaleRevenue: {
    fontFamily: FONT,
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0E9F80',
  },
  menuAvailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E6EB',
  },
  menuAvailName: {
    fontFamily: FONT,
    fontSize: 15,
    color: '#2A3547',
  },
  availBadge: {
    backgroundColor: '#0E9F80',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  availBadgeEmpty: {
    backgroundColor: '#F2545B',
  },
  availBadgeLow: {
    backgroundColor: '#FFAE1F',
  },
  availBadgeText: {
    fontFamily: FONT,
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  topDishRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E6EB',
  },
  rankBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#00A1FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  rankText: {
    fontFamily: FONT,
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  topDishInfo: {
    flex: 1,
  },
  topDishName: {
    fontFamily: FONT,
    fontSize: 15,
    color: '#2A3547',
    fontWeight: '500',
  },
  topDishStats: {
    fontFamily: FONT,
    fontSize: 13,
    color: '#5A6A85',
    marginTop: 2,
  },
  missedSaleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E6EB',
  },
  missedSaleInfo: {
    flex: 1,
  },
  missedSaleName: {
    fontFamily: FONT,
    fontSize: 15,
    color: '#2A3547',
    fontWeight: '500',
  },
  missedSaleDetails: {
    fontFamily: FONT,
    fontSize: 13,
    color: '#5A6A85',
    marginTop: 2,
  },
  reasonBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  reasonExhausted: {
    backgroundColor: '#00A1FF',
  },
  reasonNotInMenu: {
    backgroundColor: '#FFAE1F',
  },
  reasonText: {
    fontFamily: FONT,
    color: '#2A3547',
    fontSize: 11,
    fontWeight: '600',
  },
  modeSelector: {
    flexDirection: 'row',
    backgroundColor: C.sunken,
    borderRadius: 999,
    padding: 4,
    maxWidth: 440,
    width: '100%',
  },
  modeButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 999,
    alignItems: 'center',
  },
  modeButtonActive: {
    backgroundColor: C.primary,
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  modeButtonText: {
    fontFamily: FONT,
    color: '#5A6A85',
    fontSize: 14,
    fontWeight: '700',
  },
  modeButtonTextActive: {
    color: '#ffffff',
  },
  rangeDateSelector: {
    gap: 10,
  },
  dateRangeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateRangeLabel: {
    fontFamily: FONT,
    color: '#5A6A85',
    fontSize: 14,
    width: 35,
  },
  dateRangeText: {
    fontFamily: FONT,
    color: '#00A1FF',
    fontSize: 15,
    fontWeight: '600',
    minWidth: 100,
    textAlign: 'center',
  },
  missedQuantityBadge: {
    backgroundColor: '#F2545B',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  missedQuantityText: {
    fontFamily: FONT,
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
  },
  missedTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 2,
    borderTopColor: '#F2545B',
  },
  missedTotalLabel: {
    fontFamily: FONT,
    color: '#2A3547',
    fontSize: 14,
    fontWeight: '600',
  },
  missedTotalValue: {
    fontFamily: FONT,
    color: '#F2545B',
    fontSize: 24,
    fontWeight: 'bold',
  },
  // Kitchen section
  kitchenHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  kitchenHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  kitchenIconBubble: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFAE1F',
    justifyContent: 'center',
    alignItems: 'center',
  },
  kitchenSubtitle: {
    fontFamily: FONT,
    fontSize: 12,
    color: '#5A6A85',
    marginTop: 2,
  },
  kitchenRefreshBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EFF4FA',
    justifyContent: 'center',
    alignItems: 'center',
  },
  kitchenGroup: {
    marginBottom: 18,
    backgroundColor: '#FAFBFC',
    borderRadius: 12,
    padding: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#FFAE1F',
  },
  kitchenGroupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E6EB',
  },
  kitchenGroupName: {
    fontFamily: FONT,
    fontSize: 17,
    fontWeight: '800',
    color: '#2A3547',
    flex: 1,
    letterSpacing: 0.3,
  },
  porzGroupHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  kitchenGroupBadge: {
    backgroundColor: '#8965E5',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  kitchenGroupBadgeText: {
    fontFamily: FONT,
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  kitchenEntry: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 8,
    marginBottom: 6,
    backgroundColor: '#fff',
  },
  kitchenEntryReady: {
    backgroundColor: 'rgba(0, 117, 74, 0.08)',
    opacity: 0.85,
  },
  kitchenCheck: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#EFF4FA',
    borderWidth: 2,
    borderColor: '#E0E6EB',
  },
  kitchenCheckReady: {
    backgroundColor: '#0E9F80',
    borderColor: '#0E9F80',
  },
  kitchenQtyBubble: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFF7E0',
    borderWidth: 2,
    borderColor: '#FFAE1F',
  },
  kitchenCompleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#0E9F80',
    minWidth: 92,
    justifyContent: 'center',
  },
  kitchenCompleteBtnText: {
    fontFamily: FONT,
    color: '#0E9F80',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  kitchenCompleteBtnDone: {
    backgroundColor: '#0E9F80',
    borderColor: '#0E9F80',
  },
  kitchenCompleteBtnDoneText: {
    fontFamily: FONT,
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  kitchenQty: {
    fontFamily: FONT,
    fontSize: 15,
    fontWeight: '800',
    color: '#2A3547',
  },
  kitchenEntryInfo: {
    flex: 1,
  },
  kitchenEntryMainRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
    gap: 8,
  },
  kitchenEntryText: {
    fontFamily: FONT,
    fontSize: 14,
    color: '#2A3547',
    fontWeight: '600',
    flex: 1,
  },
  kitchenEntryTextReady: {
    textDecorationLine: 'line-through',
    color: '#5A6A85',
  },
  kitchenEntryMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  kitchenServiceBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  kitchenServiceText: {
    fontFamily: FONT,
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  kitchenTimeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#EFF4FA',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  kitchenTimeText: {
    fontFamily: FONT,
    fontSize: 11,
    color: '#5A6A85',
    fontWeight: '600',
  },
  kitchenEntryComposition: {
    fontFamily: FONT,
    fontSize: 14,
    fontWeight: '700',
    color: '#0E9F80',
    flexBasis: '100%',
  },
  kitchenEntryNote: {
    fontFamily: FONT,
    fontSize: 11,
    color: '#5A6A85',
    fontStyle: 'italic',
    flex: 1,
  },
  // Unpaid orders section
  unpaidHeader: {    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  unpaidHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  unpaidBadge: {
    backgroundColor: '#F2545B',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    minWidth: 28,
    alignItems: 'center',
  },
  unpaidBadgeText: {
    fontFamily: FONT,
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 13,
  },
  unpaidOrderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F4F7FB',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    marginBottom: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#F2545B',
  },
  unpaidOrderInfo: {
    flex: 1,
    marginRight: 12,
  },
  unpaidOrderCustomer: {
    fontFamily: FONT,
    color: '#2A3547',
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  unpaidOrderMeta: {
    fontFamily: FONT,
    color: '#5A6A85',
    fontSize: 12,
  },
  markPaidBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#0E9F80',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
  },
  markPaidBtnText: {
    fontFamily: FONT,
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  unpaidTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 2,
    borderTopColor: '#F2545B',
  },
  unpaidTotalLabel: {
    fontFamily: FONT,
    color: '#2A3547',
    fontSize: 14,
    fontWeight: '600',
  },
  unpaidTotalValue: {
    fontFamily: FONT,
    color: '#F2545B',
    fontSize: 22,
    fontWeight: 'bold',
  },
  // Header row with settings button
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  settingsButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.sunken,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  // Range mode - preset shortcuts + clickable calendar trigger
  presetRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
    justifyContent: 'flex-start',
  },
  presetChip: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    minHeight: 44,
    justifyContent: 'center',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: C.border,
  },
  presetChipText: {
    fontFamily: FONT,
    color: '#2A3547',
    fontSize: 13,
    fontWeight: '700',
  },
  dateRangeButton: {
    alignSelf: 'flex-start',
    minWidth: 320,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#F4F7FB',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#E0E6EB',
  },
  dateRangeButtonText: {
    fontFamily: FONT,
    color: '#2A3547',
    fontSize: 14,
    fontWeight: '600',
  },
  // Calendar modal
  calendarModalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    width: '100%',
    maxWidth: 380,
    maxHeight: '90%',
    ...Platform.select({ web: { overflowY: 'auto' as any } }),
  },
  calendarTitle: {
    fontFamily: FONT,
    color: '#2A3547',
    fontSize: 17,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 4,
  },
  calendarSubtitle: {
    fontFamily: FONT,
    color: '#00A1FF',
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 12,
    fontWeight: '600',
  },
  calendarActionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  calendarCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 999,
    backgroundColor: '#E0E6EB',
    alignItems: 'center',
  },
  calendarCancelBtnText: {
    fontFamily: FONT,
    color: '#2A3547',
    fontWeight: '600',
    fontSize: 14,
  },
  calendarApplyBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 999,
    backgroundColor: '#00A1FF',
    alignItems: 'center',
  },
  calendarApplyBtnText: {
    fontFamily: FONT,
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 14,
  },
  disabledButton: {
    opacity: 0.5,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(42, 53, 71, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 340,
    maxHeight: '90%',
    ...Platform.select({ web: { overflowY: 'auto' as any } }),
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontFamily: FONT,
    fontSize: 22,
    fontWeight: 'bold',
    color: '#2A3547',
    marginTop: 16,
  },
  modalSubtitle: {
    fontFamily: FONT,
    fontSize: 14,
    color: '#5A6A85',
    textAlign: 'center',
    marginTop: 8,
  },
  passwordInput: {
    fontFamily: FONT,
    backgroundColor: '#F4F7FB',
    borderRadius: 12,
    padding: 14,
    color: '#2A3547',
    fontSize: 16,
    marginBottom: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#F4F7FB',
    padding: 14,
    borderRadius: 999,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontFamily: FONT,
    color: '#5A6A85',
    fontSize: 16,
    fontWeight: '600',
  },
  loginButton: {
    flex: 1,
    backgroundColor: '#00A1FF',
    padding: 14,
    borderRadius: 999,
    alignItems: 'center',
  },
  loginButtonText: {
    fontFamily: FONT,
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  // Setup Modal styles
  setupModalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
  },
  setupModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E6EB',
  },
  setupModalTitle: {
    fontFamily: FONT,
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2A3547',
  },
  setupModalBody: {
    padding: 16,
  },
  setupSection: {
    backgroundColor: '#F4F7FB',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
  },
  setupSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  setupSectionTitle: {
    fontFamily: FONT,
    fontSize: 16,
    fontWeight: '600',
    color: '#2A3547',
  },
  statusContainer: {
    gap: 10,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusLabel: {
    fontFamily: FONT,
    color: '#5A6A85',
    fontSize: 14,
  },
  statusValue: {
    fontFamily: FONT,
    color: '#2A3547',
    fontSize: 14,
    fontWeight: '600',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusOk: {
    backgroundColor: '#0E9F80',
  },
  statusWarning: {
    backgroundColor: '#FFAE1F',
  },
  statusBadgeText: {
    fontFamily: FONT,
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF4E0',
    padding: 10,
    borderRadius: 14,
    gap: 8,
    marginTop: 4,
  },
  warningText: {
    fontFamily: FONT,
    color: '#FFAE1F',
    fontSize: 13,
    flex: 1,
  },
  setupButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#00A1FF',
    padding: 14,
    borderRadius: 999,
    gap: 8,
  },
  setupButtonDisabled: {
    opacity: 0.6,
  },
  setupButtonText: {
    fontFamily: FONT,
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  setupHint: {
    fontFamily: FONT,
    color: '#5A6A85',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 10,
  },
});
