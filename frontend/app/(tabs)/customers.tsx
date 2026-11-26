import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Switch,
  Platform,
} from 'react-native';
import { notify } from '../../src/store/toastStore';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { format, parseISO, subMonths } from 'date-fns';
import { it } from 'date-fns/locale';
import { useAppStore } from '../../src/store/appStore';
import { customersApi } from '../../src/services/api';
import { Customer, Order } from '../../src/types';
import { compositionText } from '../../src/utils/composition';
import { C, FONT } from '../../src/theme/tokens';
import { Appear } from '../../src/components/motion/Appear';
import { PageHeader } from '../../src/components/ui2/PageHeader';
import { HeaderButton } from '../../src/components/ui2/HeaderButton';
import { useWideLayout } from '../../src/theme/layout';
import { ConfirmDialog } from '../../src/components/ui2/ConfirmDialog';
import { CustomerFilterChips, CustomerView } from '../../src/components/customers/CustomerFilterChips';
import { CustomerViewBanner } from '../../src/components/customers/CustomerViewBanner';

// Tinta tenue della scheda: privato azzurro, società viola, fermo da 6 mesi giallo, archiviato grigio
const customerTone = (c: Customer, cutoff: string) => {
  if (c.archived) return { bg: C.sunken, fg: C.text2 };
  if (isInactive(c, cutoff)) return { bg: C.warningSoft, fg: C.warningFg };
  if (c.customerType === 'societa') return { bg: C.secondarySoft, fg: C.secondary };
  return { bg: C.primarySoft, fg: C.primaryDark };
};

// Senza ordini da 6 mesi: ultimo ordine (o creazione, se non ha mai ordinato) prima della soglia
const isInactive = (c: Customer, cutoff: string) =>
  !c.archived && (c.lastOrderDate || (c.createdAt || '').slice(0, 10)) < cutoff;

// Stessi colori della schermata Ordini
const ORDER_STATUS_STYLE: Record<string, { label: string; bg: string; fg: string }> = {
  in_attesa: { label: 'In attesa', bg: '#FFAE1F', fg: '#2A3547' },
  in_preparazione: { label: 'In preparazione', bg: '#00A1FF', fg: '#ffffff' },
  pronto: { label: 'Pronto', bg: '#0E9F80', fg: '#ffffff' },
  sospeso: { label: 'Sospeso', bg: '#F2545B', fg: '#ffffff' },
  consegnato: { label: 'Consegnato', bg: '#98A4B8', fg: '#ffffff' },
  completato: { label: 'Completato', bg: '#0E9F80', fg: '#ffffff' },
  annullato: { label: 'Annullato', bg: '#F2545B', fg: '#ffffff' },
};


export default function CustomersScreen() {
  const { contentWidth } = useWideLayout();
  const cols = contentWidth >= 1180 ? 3 : contentWidth >= 700 ? 2 : 1;
  const cellW = `${100 / cols}%` as const;
  const setStoreCustomers = useAppStore((st) => st.setCustomers);
  // Lista locale con statistiche (la schermata Ordini aggiorna lo store senza statistiche)
  const [customers, setCustomersState] = useState<Customer[]>([]);
  const setCustomers = (list: Customer[]) => {
    setCustomersState(list);
    setStoreCustomers(list);
  };
  const [view, setView] = useState<CustomerView>('active');
  const [archiveTarget, setArchiveTarget] = useState<Customer[] | null>(null);
  const [archiving, setArchiving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showOrdersModal, setShowOrdersModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerOrders, setCustomerOrders] = useState<Order[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Form state
  const [name, setName] = useState('');
  const [customerType, setCustomerType] = useState<'persona' | 'societa'>('persona');
  const [partitaIva, setPartitaIva] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [requiresInvoice, setRequiresInvoice] = useState(false);
  const [notes, setNotes] = useState('');

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await customersApi.getAll({ scope: 'all', withStats: true });
      setCustomers(data);
    } catch (error) {
      console.error('Error loading customers:', error);
      notify('Impossibile caricare i clienti', 'error');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const resetForm = () => {
    setName('');
    setCustomerType('persona');
    setPartitaIva('');
    setPhone('');
    setEmail('');
    setAddress('');
    setRequiresInvoice(false);
    setNotes('');
    setEditingCustomer(null);
  };

  const openCreateModal = () => {
    resetForm();
    setShowModal(true);
  };

  const openEditModal = (customer: Customer) => {
    setEditingCustomer(customer);
    setName(customer.name);
    setCustomerType(customer.customerType || 'persona');
    setPartitaIva(customer.partitaIva || '');
    setPhone(customer.phone || '');
    setEmail(customer.email || '');
    setAddress(customer.address || '');
    setRequiresInvoice(customer.requiresInvoice);
    setNotes(customer.notes || '');
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      notify('Inserisci il nome del cliente', 'error');
      return;
    }
    
    // Validazione partita IVA per società
    if (customerType === 'societa' && !partitaIva.trim()) {
      notify('La Partita IVA è obbligatoria per le società', 'error');
      return;
    }

    try {
      if (editingCustomer) {
        const updated = await customersApi.update(editingCustomer.id, {
          name: name.trim(),
          customerType,
          partitaIva: partitaIva.trim(),
          phone: phone.trim(),
          email: email.trim(),
          address: address.trim(),
          requiresInvoice,
          notes: notes.trim(),
        });
        setCustomers(customers.map(c => c.id === updated.id ? { ...c, ...updated, lastOrderDate: c.lastOrderDate, ordersCount: c.ordersCount } : c));
        notify('Cliente aggiornato');
      } else {
        const newCustomer = await customersApi.create({
          name: name.trim(),
          customerType,
          partitaIva: partitaIva.trim(),
          phone: phone.trim(),
          email: email.trim(),
          address: address.trim(),
          requiresInvoice,
          notes: notes.trim(),
        });
        setCustomers([newCustomer, ...customers]);
        notify('Cliente creato');
      }
      
      setShowModal(false);
      resetForm();
    } catch (error: any) {
      notify(error.response?.data?.detail || 'Impossibile salvare il cliente', 'error');
    }
  };

  const viewCustomerOrders = async (customer: Customer) => {
    try {
      setSelectedCustomer(customer);
      const orders = await customersApi.getOrders(customer.id);
      setCustomerOrders(orders);
      setShowOrdersModal(true);
    } catch (error) {
      notify('Impossibile caricare lo storico ordini', 'error');
    }
  };

  const cutoff = format(subMonths(new Date(), 6), 'yyyy-MM-dd');
  const groups = useMemo(() => ({
    active: customers.filter(c => !c.archived),
    inactive: customers.filter(c => isInactive(c, cutoff)),
    archived: customers.filter(c => c.archived),
  }), [customers, cutoff]);
  const counts = { active: groups.active.length, inactive: groups.inactive.length, archived: groups.archived.length };

  const q = searchQuery.toLowerCase();
  const filteredCustomers = groups[view].filter(c =>
    c.name.toLowerCase().includes(q) ||
    c.phone?.toLowerCase().includes(q) ||
    c.email?.toLowerCase().includes(q) ||
    c.partitaIva?.toLowerCase().includes(q)
  );

  const setArchived = (ids: string[], archived: boolean) =>
    setCustomers(customers.map(c => (ids.includes(c.id) ? { ...c, archived } : c)));

  const confirmArchive = async () => {
    if (!archiveTarget) return;
    const ids = archiveTarget.map(c => c.id);
    setArchiving(true);
    try {
      const res = await customersApi.archive(ids);
      setArchived(ids, true);
      notify(res.archived === 1 ? 'Cliente archiviato' : `${res.archived} clienti archiviati`);
      setArchiveTarget(null);
    } catch (error: any) {
      notify(error.response?.data?.detail || "Impossibile archiviare", 'error');
    } finally {
      setArchiving(false);
    }
  };

  const restoreCustomer = async (customer: Customer) => {
    try {
      await customersApi.restore([customer.id]);
      setArchived([customer.id], false);
      notify(`${customer.name} ripristinato`);
    } catch (error: any) {
      notify(error.response?.data?.detail || 'Impossibile ripristinare', 'error');
    }
  };

  const lastOrderLabel = (c: Customer) =>
    c.lastOrderDate
      ? `Ultimo ordine ${format(parseISO(c.lastOrderDate), 'd MMM yyyy', { locale: it })} · ${c.ordersCount} ${c.ordersCount === 1 ? 'ordine' : 'ordini'}`
      : 'Nessun ordine';

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
      {/* Header */}
      <PageHeader
        title="Clienti"
        subtitle="Anagrafica, contatti e storico ordini"
        testID="customers-header"
        right={<HeaderButton icon="add" label="Nuovo cliente" tone="primary" onPress={openCreateModal} testID="customers-new-button" />}
      >
        <View style={styles.headerTools}>
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={18} color="#5A6A85" />
            <TextInput
              style={styles.searchInput}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Cerca cliente per nome, telefono o email..."
              placeholderTextColor="#98A4B8"
              testID="customers-search-input"
            />
          </View>
          <CustomerFilterChips value={view} counts={counts} onChange={setView} />
        </View>
      </PageHeader>

      {/* Content */}
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentInner}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#00A1FF" />
        }
      >
        {view !== 'active' && filteredCustomers.length > 0 && (
          <CustomerViewBanner view={view} count={filteredCustomers.length} onArchiveAll={() => setArchiveTarget(filteredCustomers)} />
        )}
        {filteredCustomers.length === 0 ? (
          <View style={styles.emptyState} testID="customers-empty-state">
            <Ionicons name={view === 'archived' ? 'archive-outline' : 'people-outline'} size={64} color="#5A6A85" />
            <Text style={styles.emptyStateText}>
              {searchQuery ? 'Nessun risultato' : view === 'archived' ? 'Nessun cliente archiviato' : view === 'inactive' ? 'Tutti i clienti hanno ordinato negli ultimi 6 mesi' : 'Nessun cliente'}
            </Text>
          </View>
        ) : (
          <View style={styles.customerGrid}>
          {filteredCustomers.map((customer, customerIdx) => (
            <Appear index={customerIdx} key={customer.id} style={[styles.gridCell, { width: cellW }]}>
            <View style={[styles.customerCard, { backgroundColor: customerTone(customer, cutoff).bg }]} testID={`customer-card-${customer.id}`}>
              <View style={styles.customerHeader}>
                <View style={styles.customerAvatar}>
                  <Text style={[styles.customerAvatarText, { color: customerTone(customer, cutoff).fg }]}>
                    {customer.name.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={styles.customerInfo}>
                  <View style={styles.customerNameRow}>
                    <Text style={[styles.customerName, { color: customerTone(customer, cutoff).fg }]}>{customer.name}</Text>
                    {customer.requiresInvoice && (
                      <View style={styles.invoiceBadge}>
                        <Ionicons name="document-text" size={12} color="#fff" />
                        <Text style={styles.invoiceBadgeText}>Fattura</Text>
                      </View>
                    )}
                  </View>
                  {customer.phone && (
                    <View style={styles.contactRow}>
                      <Ionicons name="call-outline" size={14} color="#5A6A85" />
                      <Text style={styles.contactText}>{customer.phone}</Text>
                    </View>
                  )}
                  {customer.email && (
                    <View style={styles.contactRow}>
                      <Ionicons name="mail-outline" size={14} color="#5A6A85" />
                      <Text style={styles.contactText}>{customer.email}</Text>
                    </View>
                  )}
                  {customer.address && (
                    <View style={styles.contactRow}>
                      <Ionicons name="location-outline" size={14} color="#5A6A85" />
                      <Text style={styles.contactText}>{customer.address}</Text>
                    </View>
                  )}
                  <View style={[styles.lastOrderPill, isInactive(customer, cutoff) && styles.lastOrderPillOld]} testID={`customer-last-order-${customer.id}`}>
                    <Ionicons name="receipt-outline" size={13} color={isInactive(customer, cutoff) ? C.warningFg : C.text2} />
                    <Text style={[styles.lastOrderText, isInactive(customer, cutoff) && { color: C.warningFg }]}>{lastOrderLabel(customer)}</Text>
                  </View>
                </View>
              </View>
              
              {customer.notes && (
                <Text style={styles.customerNotes}>{customer.notes}</Text>
              )}
              
              <View style={styles.customerActions}>
                <TouchableOpacity
                  style={[styles.actionButton, styles.historyButton]}
                  onPress={() => viewCustomerOrders(customer)}
                  testID={`customer-history-${customer.id}`}
                >
                  <Ionicons name="time-outline" size={18} color={C.secondary} />
                  <Text style={[styles.actionButtonText, { color: C.secondary }]}>Storico</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionButton, styles.editButton]}
                  onPress={() => openEditModal(customer)}
                  testID={`customer-edit-${customer.id}`}
                >
                  <Ionicons name="create-outline" size={18} color={C.primaryDark} />
                  <Text style={[styles.actionButtonText, { color: C.primaryDark }]}>Modifica</Text>
                </TouchableOpacity>
                {customer.archived ? (
                  <TouchableOpacity
                    style={[styles.actionButton, styles.restoreButton]}
                    onPress={() => restoreCustomer(customer)}
                    testID={`customer-restore-${customer.id}`}
                  >
                    <Ionicons name="arrow-undo-outline" size={18} color={C.success} />
                    <Text style={[styles.actionButtonText, { color: C.success }]}>Ripristina</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={styles.archiveIconButton}
                    onPress={() => setArchiveTarget([customer])}
                    testID={`customer-archive-${customer.id}`}
                    accessibilityLabel="Archivia cliente"
                  >
                    <Ionicons name="archive-outline" size={19} color={C.warningFg} />
                  </TouchableOpacity>
                )}
              </View>
            </View>
            </Appear>
          ))}
          </View>
        )}
      </ScrollView>

      <ConfirmDialog
        visible={!!archiveTarget}
        title={archiveTarget && archiveTarget.length > 1 ? `Archiviare ${archiveTarget.length} clienti?` : `Archiviare ${archiveTarget?.[0]?.name || ''}?`}
        message="Spariranno dalla lista e dalla scelta cliente negli ordini. Gli ordini passati restano intatti e puoi ripristinarli dal filtro Archiviati."
        confirmLabel="Archivia"
        busy={archiving}
        onConfirm={confirmArchive}
        onCancel={() => setArchiveTarget(null)}
        testID="customers-archive-dialog"
      />

      {/* Create/Edit Modal */}
      <Modal visible={showModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingCustomer ? 'Modifica Cliente' : 'Nuovo Cliente'}
              </Text>
              <TouchableOpacity onPress={() => { setShowModal(false); resetForm(); }}>
                <Ionicons name="close" size={24} color="#2A3547" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={Platform.OS === 'web'} testID="customer-modal-scroll">
              {/* Customer Type Selector */}
              <Text style={styles.inputLabel}>Tipo Cliente *</Text>
              <View style={styles.typeSelector}>
                <TouchableOpacity
                  style={[styles.typeButton, customerType === 'persona' && styles.typeButtonActive]}
                  onPress={() => setCustomerType('persona')}
                >
                  <Ionicons name="person" size={20} color={customerType === 'persona' ? '#fff' : '#5A6A85'} />
                  <Text style={[styles.typeButtonText, customerType === 'persona' && styles.typeButtonTextActive]}>
                    Persona Fisica
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.typeButton, customerType === 'societa' && styles.typeButtonActive]}
                  onPress={() => setCustomerType('societa')}
                >
                  <Ionicons name="business" size={20} color={customerType === 'societa' ? '#fff' : '#5A6A85'} />
                  <Text style={[styles.typeButtonText, customerType === 'societa' && styles.typeButtonTextActive]}>
                    Società
                  </Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.inputLabel}>{customerType === 'societa' ? 'Ragione Sociale *' : 'Nome *'}</Text>
              <TextInput
                style={styles.textInput}
                value={name}
                onChangeText={setName}
                placeholder={customerType === 'societa' ? 'Ragione sociale' : 'Nome cliente'}
                placeholderTextColor="#5A6A85"
              />

              {customerType === 'societa' && (
                <>
                  <Text style={styles.inputLabel}>Partita IVA *</Text>
                  <TextInput
                    style={styles.textInput}
                    value={partitaIva}
                    onChangeText={setPartitaIva}
                    placeholder="Inserisci Partita IVA"
                    placeholderTextColor="#5A6A85"
                    autoCapitalize="characters"
                  />
                </>
              )}

              <Text style={styles.inputLabel}>Telefono</Text>
              <TextInput
                style={styles.textInput}
                value={phone}
                onChangeText={setPhone}
                placeholder="Numero di telefono"
                placeholderTextColor="#5A6A85"
                keyboardType="phone-pad"
              />

              <Text style={styles.inputLabel}>Email</Text>
              <TextInput
                style={styles.textInput}
                value={email}
                onChangeText={setEmail}
                placeholder="Indirizzo email"
                placeholderTextColor="#5A6A85"
                keyboardType="email-address"
                autoCapitalize="none"
              />

              <Text style={styles.inputLabel}>Indirizzo</Text>
              <TextInput
                style={styles.textInput}
                value={address}
                onChangeText={setAddress}
                placeholder="Indirizzo"
                placeholderTextColor="#5A6A85"
              />

              <View style={styles.switchRow}>
                <Text style={styles.switchLabel}>Richiede Fattura</Text>
                <Switch
                  value={requiresInvoice}
                  onValueChange={setRequiresInvoice}
                  trackColor={{ false: '#E0E6EB', true: '#0E9F80' }}
                  thumbColor="#fff"
                />
              </View>

              <Text style={styles.inputLabel}>Note</Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                value={notes}
                onChangeText={setNotes}
                placeholder="Note sul cliente..."
                placeholderTextColor="#5A6A85"
                multiline
              />
            </ScrollView>

            {/* Fuori dallo scroll: il salvataggio resta sempre visibile */}
            <TouchableOpacity style={[styles.primaryButton, styles.modalFooterButton]} onPress={handleSave} testID="customer-save-button">
              <Text style={styles.primaryButtonText}>
                {editingCustomer ? 'Salva Modifiche' : 'Crea Cliente'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Orders History Modal */}
      <Modal visible={showOrdersModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, styles.ordersModal]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                Storico Ordini - {selectedCustomer?.name}
              </Text>
              <TouchableOpacity onPress={() => setShowOrdersModal(false)}>
                <Ionicons name="close" size={24} color="#2A3547" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.ordersList}>
              {customerOrders.length === 0 ? (
                <View style={styles.emptyOrdersState}>
                  <Ionicons name="receipt-outline" size={48} color="#5A6A85" />
                  <Text style={styles.emptyOrdersText}>Nessun ordine trovato</Text>
                </View>
              ) : (
                customerOrders.map((order) => (
                  <View key={order.id} style={styles.orderHistoryCard}>
                    <View style={styles.orderHistoryHeader}>
                      <Text style={styles.orderHistoryNumber}>#{order.orderNumber}</Text>
                      <Text style={styles.orderHistoryDate}>
                        {format(new Date(order.createdAt), 'd MMM yyyy HH:mm', { locale: it })}
                      </Text>
                    </View>
                    <View style={styles.orderHistoryItems}>
                      {order.items.map((item, idx) => (
                        <Text key={idx} style={styles.orderHistoryItem}>
                          {item.quantity}x {item.dishName}{item.composition?.length ? `: ${compositionText(item.composition)}` : ''}
                        </Text>
                      ))}
                    </View>
                    <View style={styles.orderHistoryFooter}>
                      <View
                        style={[styles.statusBadge, { backgroundColor: (ORDER_STATUS_STYLE[order.status] || ORDER_STATUS_STYLE.in_attesa).bg }]}
                        testID={`order-history-status-${order.id}`}
                      >
                        <Text style={[styles.statusBadgeText, { color: (ORDER_STATUS_STYLE[order.status] || ORDER_STATUS_STYLE.in_attesa).fg }]}>
                          {(ORDER_STATUS_STYLE[order.status] || { label: order.status }).label}
                        </Text>
                      </View>
                      <Text style={styles.orderHistoryTotal}>{order.total.toFixed(2)} €</Text>
                    </View>
                  </View>
                ))
              )}
            </ScrollView>
          </View>
        </View>
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
    marginBottom: 16,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  headerTools: { gap: 10 },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 999,
    paddingHorizontal: 16,
    minHeight: 46,
  },
  searchInput: {
    fontFamily: FONT,
    flex: 1,
    color: '#2A3547',
    padding: 10,
    fontSize: 15,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#00A1FF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
  },
  addButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    marginLeft: 8,
  },
  content: {
    flex: 1,
  },
  contentInner: {
    padding: 16,
    paddingBottom: 32,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
  },
  emptyStateText: {
    fontFamily: FONT,
    color: '#5A6A85',
    fontSize: 18,
    marginTop: 16,
  },
  customerGrid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -6 },
  gridCell: { paddingHorizontal: 6, marginBottom: 12 },
  customerCard: {
    flex: 1,
    borderRadius: 14,
    padding: 16,
  },
  customerHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  customerAvatar: {
    width: 50,
    height: 50,
    borderRadius: 14,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  customerAvatarText: {
    fontFamily: FONT,
    fontSize: 22,
    fontWeight: '800',
  },
  customerInfo: {
    flex: 1,
  },
  customerNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  customerName: {
    fontFamily: FONT,
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2A3547',
    marginRight: 10,
  },
  invoiceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#00A1FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  invoiceBadgeText: {
    fontFamily: FONT,
    color: '#ffffff',
    fontSize: 11,
    marginLeft: 4,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  contactText: {
    fontFamily: FONT,
    color: '#5A6A85',
    fontSize: 14,
    marginLeft: 8,
  },
  customerNotes: {
    fontFamily: FONT,
    color: '#5A6A85',
    fontSize: 13,
    fontStyle: 'italic',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(42,53,71,0.1)',
  },
  customerActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 'auto',
    paddingTop: 14,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    borderRadius: 999,
  },
  historyButton: {
    backgroundColor: 'rgba(255,255,255,0.85)',
  },
  restoreButton: {
    backgroundColor: 'rgba(255,255,255,0.85)',
  },
  archiveIconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.85)',
  },
  customerCardArchived: {
    backgroundColor: C.hover,
  },
  lastOrderPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 5,
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.8)',
  },
  lastOrderPillOld: {
    backgroundColor: '#fff',
  },
  lastOrderText: {
    fontFamily: FONT,
    fontSize: 12,
    fontWeight: '600',
    color: C.text2,
  },
  editButton: {
    backgroundColor: 'rgba(255,255,255,0.85)',
  },
  actionButtonText: {
    fontFamily: FONT,
    color: '#ffffff',
    fontWeight: '700',
    marginLeft: 6,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(42, 53, 71, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    width: '90%',
    maxWidth: 500,
    maxHeight: '80%',
  },
  ordersModal: {
    maxWidth: 600,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontFamily: FONT,
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2A3547',
    flex: 1,
  },
  inputLabel: {
    fontFamily: FONT,
    color: '#5A6A85',
    fontSize: 14,
    marginBottom: 8,
    marginTop: 12,
  },
  textInput: {
    fontFamily: FONT,
    backgroundColor: '#F4F7FB',
    color: '#2A3547',
    padding: 14,
    borderRadius: 12,
    fontSize: 16,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    paddingVertical: 8,
  },
  switchLabel: {
    fontFamily: FONT,
    color: '#2A3547',
    fontSize: 16,
  },
  primaryButton: {
    backgroundColor: '#00A1FF',
    padding: 16,
    borderRadius: 999,
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 20,
  },
  modalScroll: {
    flexShrink: 1,
    paddingRight: Platform.OS === 'web' ? 8 : 0,
  },
  modalFooterButton: {
    marginTop: 16,
    marginBottom: 0,
  },
  primaryButtonText: {
    fontFamily: FONT,
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  ordersList: {
    flex: 1,
  },
  emptyOrdersState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyOrdersText: {
    fontFamily: FONT,
    color: '#5A6A85',
    fontSize: 16,
    marginTop: 12,
  },
  orderHistoryCard: {
    backgroundColor: '#F4F7FB',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
  },
  orderHistoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  orderHistoryNumber: {
    fontFamily: FONT,
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2A3547',
  },
  orderHistoryDate: {
    fontFamily: FONT,
    color: '#5A6A85',
    fontSize: 13,
  },
  orderHistoryItems: {
    borderTopWidth: 1,
    borderTopColor: '#E0E6EB',
    paddingTop: 10,
  },
  orderHistoryItem: {
    fontFamily: FONT,
    color: '#5A6A85',
    fontSize: 14,
    marginBottom: 4,
  },
  orderHistoryFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#E0E6EB',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusBadgeText: {
    fontFamily: FONT,
    color: '#2A3547',
    fontSize: 12,
    fontWeight: '600',
  },
  orderHistoryTotal: {
    fontFamily: FONT,
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0E9F80',
  },
  typeSelector: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 8,
  },
  typeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F4F7FB',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 999,
    gap: 8,
  },
  typeButtonActive: {
    backgroundColor: '#00A1FF',
  },
  typeButtonText: {
    fontFamily: FONT,
    color: '#5A6A85',
    fontSize: 14,
    fontWeight: '500',
  },
  typeButtonTextActive: {
    color: '#ffffff',
  },
});
