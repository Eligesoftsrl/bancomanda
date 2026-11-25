import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  ScrollView,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
  RefreshControl,
  useWindowDimensions,
  Platform,
  Image,
} from 'react-native';
import { ChipScroller } from '../../src/components/ChipScroller';
import { QuickCustomerForm } from '../../src/components/orders/QuickCustomerForm';
import { notify } from '../../src/store/toastStore';
import { escapeHtml } from '../../src/utils/escapeHtml';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useAppStore } from '../../src/store/appStore';
import { ordersApi, menusApi, customersApi, categoriesApi, dishesApi, optionGroupsApi } from '../../src/services/api';
import { Order, MenuItem, Customer, Category, Dish, OptionGroup, Selections } from '../../src/types';
import { DishComposer } from '../../src/components/composable/DishComposer';
import { compositionText, euro, fromPrice, groupsForDish, selectionError, selectionExtra, selectionsFrom, toSelectionList } from '../../src/utils/composition';
import { sortCategoriesByFixedOrder, sortMenuItemsByCategory } from '../../src/utils/categoryOrder';
import { TimePickerInline } from '../../src/components/TimePickerInline';
import Animated, { SlideInDown, ZoomIn } from 'react-native-reanimated';
import { CHANNELS, STATUS_LABELS } from '../../src/components/orders/orderMeta';
import { OrdersHeader } from '../../src/components/orders/OrdersHeader';
import { StatusCounters } from '../../src/components/orders/StatusCounters';
import { OrderTicket } from '../../src/components/orders/OrderTicket';
import { EmptyOrders } from '../../src/components/orders/EmptyOrders';
import { PressableScale } from '../../src/components/motion/PressableScale';
import { Appear } from '../../src/components/motion/Appear';
import { FlipText } from '../../src/components/motion/FlipText';
import { ModalSheet } from '../../src/components/motion/ModalSheet';
import { Shimmer, SkeletonCard } from '../../src/components/motion/Skeleton';
import { C, FONT, R, elevation, statusOf } from '../../src/theme/tokens';


// Stati per cambio automatico (escluso "consegnato" che è solo manuale)
const ORDER_STATUSES = ['in_attesa', 'in_preparazione', 'pronto', 'sospeso'];
// Tutti gli stati incluso consegnato (per filtri)
const ALL_ORDER_STATUSES = ['in_attesa', 'in_preparazione', 'pronto', 'sospeso', 'consegnato'];



export default function OrdersScreen() {
  const { width } = useWindowDimensions();
  const isSmallScreen = width < 768;
  const router = useRouter();
  
  const { selectedDate, setSelectedDate, currentMenu, setCurrentMenu, orders, setOrders, customers, setCustomers } = useAppStore();
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showNewOrderModal, setShowNewOrderModal] = useState(false);
  const [showAddItemModal, setShowAddItemModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  
  // Categories for filter
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string | null>(null);
  
  // Search orders by customer name
  const [orderSearchQuery, setOrderSearchQuery] = useState('');
  
  // Sort categories by fixed order
  const sortedCategories = useMemo(() => sortCategoriesByFixedOrder(categories), [categories]);
  
  // Toast state
  // Avviso globale: visibile anche sopra le finestre aperte
  const showToast = (message: string, type: 'success' | 'error' = 'success') => notify(message, type);
  const [newOrderChannel, setNewOrderChannel] = useState('persona');
  const [newOrderServiceType, setNewOrderServiceType] = useState<'in_sede' | 'da_ritirare' | 'da_consegnare'>('in_sede');
  const [newOrderCustomer, setNewOrderCustomer] = useState<Customer | null>(null);
  const [newOrderNotes, setNewOrderNotes] = useState('');
  const [newOrderDeliveryTime, setNewOrderDeliveryTime] = useState('');
  // Inline time picker visibility
  const [showNewOrderTimePicker, setShowNewOrderTimePicker] = useState(false);
  const [showEditOrderTimePicker, setShowEditOrderTimePicker] = useState(false);
  // Inline editing of order header (customer, notes, deliveryTime, serviceType)
  const [editOrderHeader, setEditOrderHeader] = useState(false);
  const [editCustomerName, setEditCustomerName] = useState('');
  const [editCustomerId, setEditCustomerId] = useState<string | null>(null);
  const [editOrderNotes, setEditOrderNotes] = useState('');
  const [editOrderDeliveryTime, setEditOrderDeliveryTime] = useState('');
  const [editOrderServiceType, setEditOrderServiceType] = useState<'in_sede' | 'da_ritirare' | 'da_consegnare'>('in_sede');
  const [editShowCustomerPicker, setEditShowCustomerPicker] = useState(false);
  const [editCustomerSearchQuery, setEditCustomerSearchQuery] = useState('');
  const [showQuickCustomer, setShowQuickCustomer] = useState(false);
  const [selectedMenuItem, setSelectedMenuItem] = useState<MenuItem | null>(null);
  // Piatti componibili: anagrafica piatti/gruppi e scelte in corso
  const [dishMap, setDishMap] = useState<Record<string, Dish>>({});
  const [optionGroups, setOptionGroups] = useState<OptionGroup[]>([]);
  const [composerSel, setComposerSel] = useState<Selections>({});
  const [itemEditSel, setItemEditSel] = useState<Selections>({});
  const [itemQuantity, setItemQuantity] = useState('1');
  const [itemCustomPrice, setItemCustomPrice] = useState<string>(''); // Prezzo personalizzato
  const [itemNotes, setItemNotes] = useState(''); // Note per singola voce
  const [showCustomerPicker, setShowCustomerPicker] = useState(false);
  const [showInlineCustomerPicker, setShowInlineCustomerPicker] = useState(false);
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  
  // Piatto libero - inline mode
  const [showInlineCustomItem, setShowInlineCustomItem] = useState(false);
  const [showCustomItemModal, setShowCustomItemModal] = useState(false);
  const [customItemName, setCustomItemName] = useState('');
  const [customItemPrice, setCustomItemPrice] = useState('');
  const [customItemQuantity, setCustomItemQuantity] = useState('1');
  
  // Status filter for orders
  const [statusFilter, setStatusFilter] = useState<string | null>(null);

  // OP06: Portions dashboard modal
  const [showPortionsModal, setShowPortionsModal] = useState(false);

  // Unpaid orders warning
  const [unpaidOrders, setUnpaidOrders] = useState<Order[]>([]);

  // Check for unpaid orders when customer is selected
  const checkUnpaidOrders = async (customerId: string) => {
    try {
      const unpaid = await customersApi.getUnpaidOrders(customerId);
      if (unpaid.length > 0) {
        setUnpaidOrders(unpaid);
      } else {
        setUnpaidOrders([]);
      }
    } catch (error) {
      console.error('Error checking unpaid orders:', error);
    }
  };

  // Handle payment toggle
  const handleTogglePayment = async (order: Order) => {
    try {
      const updated = await ordersApi.updatePayment(order.id, !order.isPaid);
      setOrders(orders.map(o => o.id === updated.id ? updated : o));
      if (selectedOrder?.id === updated.id) {
        setSelectedOrder(updated);
      }
      showToast(updated.isPaid ? 'Ordine segnato come pagato' : 'Ordine segnato come non pagato');
    } catch (error) {
      console.error('Error updating payment:', error);
      showToast('Errore nell\'aggiornare lo stato pagamento', 'error');
    }
  };

  // Handle item status change
  const handleItemStatusChange = async (orderId: string, itemIndex: number, newStatus: string) => {
    try {
      const updated = await ordersApi.updateItemStatusByIndex(orderId, itemIndex, newStatus);
      setOrders(orders.map(o => o.id === updated.id ? updated : o));
      if (selectedOrder?.id === updated.id) {
        setSelectedOrder(updated);
      }
    } catch (error) {
      console.error('Error updating item status:', error);
      showToast('Errore nell\'aggiornare lo stato piatto', 'error');
    }
  };

  // Handle receipt photo capture
  const handleTakeReceiptPhoto = async () => {
    if (!selectedOrder) return;
    
    // Request camera permissions
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      showToast('Permesso fotocamera negato', 'error');
      return;
    }
    
    // Launch camera
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [3, 4],
      quality: 0.5,
      base64: true,
    });
    
    if (!result.canceled && result.assets[0].base64) {
      try {
        const base64Image = `data:image/jpeg;base64,${result.assets[0].base64}`;
        const updated = await ordersApi.uploadReceipt(selectedOrder.id, base64Image);
        setOrders(orders.map(o => o.id === updated.id ? updated : o));
        setSelectedOrder(updated);
        showToast('Scontrino allegato');
      } catch (error) {
        console.error('Error uploading receipt:', error);
        showToast('Errore nel caricare lo scontrino', 'error');
      }
    }
  };

  // Handle delete receipt
  const handleDeleteReceipt = async () => {
    if (!selectedOrder) return;
    
    try {
      const updated = await ordersApi.deleteReceipt(selectedOrder.id);
      setOrders(orders.map(o => o.id === updated.id ? updated : o));
      setSelectedOrder(updated);
      showToast('Scontrino rimosso');
    } catch (error) {
      console.error('Error deleting receipt:', error);
      showToast('Errore nel rimuovere lo scontrino', 'error');
    }
  };

  const handleDeleteOrder = async () => {
    if (!selectedOrder) return;
    
    try {
      await ordersApi.deleteOrder(selectedOrder.id);
      setOrders(orders.filter(o => o.id !== selectedOrder.id));
      setSelectedOrder(null);
      setShowAddItemModal(false);
      setShowDeleteConfirm(false);
      // Refresh menu to get updated portions
      const menu = await menusApi.getByDate(selectedDate);
      setCurrentMenu(menu);
      showToast('Ordine cancellato');
    } catch (error) {
      console.error('Error deleting order:', error);
      showToast('Errore nel cancellare l\'ordine', 'error');
    }
  };

  // State for receipt preview modal
  const [showReceiptPreview, setShowReceiptPreview] = useState(false);
  const [showInlineReceipt, setShowInlineReceipt] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Generate PDF for order - works on both web and mobile
  const handlePrintOrder = async (order: Order, e?: any) => {
    // Prevent event bubbling if called from card button
    if (e) {
      e.stopPropagation();
    }
    
    const customer = customers.find(c => c.id === order.customerId);
    // Peso in righe: le scelte dei piatti componibili occupano mezza riga ciascuna
    const weightOf = (it: typeof order.items[number]) => 1 + (it.composition?.length || 0) * 0.5;
    const itemCount = Math.ceil(order.items.reduce((acc, it) => acc + weightOf(it), 0));

    // Split: oltre 10 righe → divide su più etichette (max 10 righe per etichetta)
    const ITEMS_PER_LABEL = 10;
    const needsSplit = itemCount > ITEMS_PER_LABEL;
    const itemPages: typeof order.items[] = [];
    let page: typeof order.items = [];
    let pageWeight = 0;
    order.items.forEach((it) => {
      if (page.length && pageWeight + weightOf(it) > ITEMS_PER_LABEL) {
        itemPages.push(page);
        page = [];
        pageWeight = 0;
      }
      page.push(it);
      pageWeight += weightOf(it);
    });
    if (page.length || !itemPages.length) itemPages.push(page);
    const totalPages = itemPages.length;

    // Scala adattiva: riduce i font per stare in 100mm quando NON splittiamo
    // 1-5 piatti → 1.0, 6 → 0.92, 7-8 → 0.82, 9-10 → 0.72
    // Quando splittiamo, scale=1.0 perché ogni etichetta ha max 10 piatti
    const scale = needsSplit ? 1.0 :
      itemCount <= 5 ? 1.0 :
      itemCount === 6 ? 0.92 :
      itemCount <= 8 ? 0.82 :
      0.72;
    const fs = (pt: number) => (pt * scale).toFixed(2);
    const mm = (n: number) => (n * scale).toFixed(2);

    const channelLabel = CHANNELS.find(c => c.id === order.channel)?.label || 'Persona';
    const serviceLabel = order.serviceType === 'da_consegnare' ? 'DA CONSEGNARE' :
      order.serviceType === 'da_ritirare' ? 'DA RITIRARE' : 'IN SEDE';

    // Genera HTML di una singola etichetta
    const renderLabel = (items: typeof order.items, pageNum: number, isFirst: boolean, isLast: boolean) => `
      <div class="label" ${pageNum < totalPages ? 'style="page-break-after: always;"' : ''}>
        <h1>ORDINE #${order.orderNumber}${needsSplit ? ` (${pageNum}/${totalPages})` : ''}</h1>
        <p class="subtitle">${channelLabel} · ${serviceLabel}</p>
        <hr class="hr" />

        <div class="info">
          <p class="bold">${escapeHtml(order.customerName || 'Cliente Anonimo')}</p>
          ${isFirst && customer?.address ? `<p>${escapeHtml(customer.address)}</p>` : ''}
          ${isFirst && customer?.phone ? `<p>Tel: ${escapeHtml(customer.phone)}</p>` : ''}
        </div>

        ${order.deliveryTime ? `<div class="delivery-time">ORA: ${escapeHtml(order.deliveryTime)}</div>` : ''}

        ${isFirst && order.notes ? `<div class="notes-box"><span class="bold">NOTE:</span> ${escapeHtml(order.notes)}</div>` : ''}

        <hr class="hr" />

        ${items.map(item => `
          <div class="item">
            <div class="item-row">
              <span class="item-name">${item.quantity}x ${escapeHtml(item.dishName)}</span>
              <span class="item-price">${item.subtotal.toFixed(2)}€</span>
            </div>
            ${(item.composition || []).map((c, ci) => `<div class="item-note">${ci > 0 && c.groupId !== item.composition![0].groupId ? '+ ' : ''}${escapeHtml(c.name)}${c.quantity > 1 ? ` ×${c.quantity}` : ''}</div>`).join('')}
            ${item.notes ? `<div class="item-note">&gt; ${escapeHtml(item.notes)}</div>` : ''}
          </div>
        `).join('')}

        ${isLast ? `
          <hr class="double" />
          <div class="total">TOT: ${order.total.toFixed(2)}€</div>
        ` : `
          <hr class="hr" />
          <p class="subtitle">— continua sull'etichetta ${pageNum + 1}/${totalPages} —</p>
        `}
      </div>
    `;

    const htmlContent = `
      <html>
        <head>
          <meta charset="UTF-8">
          <style>
            @page {
              size: 60mm auto;
              margin: 1.5mm 2mm 1.5mm 2mm;
            }
            * {
              box-sizing: border-box;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            html, body {
              width: 56mm;
              margin: 0;
              padding: 0;
              page-break-inside: avoid;
              break-inside: avoid-page;
            }
            body {
              font-family: 'Courier New', monospace;
              font-size: ${fs(9)}pt;
              line-height: 1.2;
              color: #000;
              padding: 0;
            }
            * {
              page-break-inside: avoid;
              break-inside: avoid;
            }
            .label { page-break-inside: avoid; }
            .center { text-align: center; }
            .right  { text-align: right; }
            .bold   { font-weight: 700; }
            .hr     { border: 0; border-top: 1px dashed #000; margin: ${mm(1.5)}mm 0; }
            .double { border: 0; border-top: 1.5px solid #000; margin: ${mm(1.5)}mm 0; }
            h1 {
              font-size: ${fs(9)}pt;
              text-align: center;
              margin: 0 0 0.3mm 0;
              letter-spacing: 0.3px;
            }
            .subtitle {
              text-align: center;
              font-size: ${fs(6.5)}pt;
              margin: 0 0 0.5mm 0;
              line-height: 1.1;
              color: #333;
            }
            .info p {
              margin: 0.3mm 0;
              font-size: ${fs(8)}pt;
              word-wrap: break-word;
              line-height: 1.15;
            }
            .delivery-time {
              text-align: center;
              font-size: ${fs(11)}pt;
              font-weight: 700;
              margin: ${mm(1.5)}mm 0;
              padding: ${mm(0.8)}mm 0;
              border: 1px solid #000;
            }
            .notes-box {
              margin: ${mm(1)}mm 0;
              padding: ${mm(0.8)}mm;
              border: 1px dashed #000;
              font-size: ${fs(7.5)}pt;
              word-wrap: break-word;
              line-height: 1.2;
            }
            .item {
              margin: ${mm(0.6)}mm 0;
            }
            .item-row {
              display: flex;
              justify-content: space-between;
              gap: 1mm;
              font-size: ${fs(8.5)}pt;
            }
            .item-name {
              flex: 1;
              font-weight: 700;
              word-wrap: break-word;
              overflow-wrap: break-word;
            }
            .item-price {
              white-space: nowrap;
            }
            .item-note {
              font-size: ${fs(7)}pt;
              font-style: italic;
              padding-left: 2.5mm;
              margin-top: 0.2mm;
              line-height: 1.15;
            }
            .total {
              font-size: ${fs(11)}pt;
              font-weight: 700;
              text-align: right;
              margin-top: ${mm(1.5)}mm;
            }
          </style>
        </head>
        <body>
          ${itemPages.map((items, idx) => renderLabel(items, idx + 1, idx === 0, idx === totalPages - 1)).join('')}
        </body>
      </html>
    `;

    try {
      if (Platform.OS === 'web') {
        // Web: open in new window
        const printWindow = window.open('', '_blank');
        if (printWindow) {
          printWindow.document.write(htmlContent + '<script>window.print();</script>');
          printWindow.document.close();
        }
      } else {
        // Mobile (iOS/Android): genera PDF con dimensione esatta rotolo 62mm.
        // Etichetta DK Brother = 62x100mm fissi.
        // Se split: ogni "pagina" del PDF è una nuova etichetta → height = 95mm.
        // Se singola: altezza calcolata in base al contenuto, max 95mm.
        let heightPts: number;
        if (needsSplit) {
          heightPts = Math.round(95 * 2.83465);
        } else {
          const baseHeightMm = 35 * scale;
          const perItemMm = 7 * scale;
          const perItemNoteMm = 5 * scale;
          const deliveryMm = order.deliveryTime ? 10 * scale : 0;
          const notesMm = order.notes ? (10 + Math.ceil(order.notes.length / 22) * 3.5) * scale : 0;
          const itemsMm = order.items.reduce((acc, it) => {
            const extraNameLines = Math.max(0, Math.floor(it.dishName.length / 24));
            return acc + perItemMm + extraNameLines * 4 * scale + (it.notes ? perItemNoteMm : 0);
          }, 0);
          const calcMm = baseHeightMm + deliveryMm + notesMm + itemsMm + 8;
          const totalMm = Math.min(95, Math.max(65, calcMm));
          heightPts = Math.round(totalMm * 2.83465);
        }

        await Print.printAsync({
          html: htmlContent,
          width: 176,                // 62mm fissi
          height: heightPts,         // 95mm se split, dinamico se singola
          orientation: 'portrait',
          margins: { left: 0, right: 0, top: 0, bottom: 0 },
        });
      }
    } catch (error) {
      console.error('Print error:', error);
      showToast('Errore nella stampa', 'error');
    }
  };

  // Filter orders by status + customer name search
  // "Tutti" esclude gli ordini chiusi
  const filteredOrders = useMemo(() => {
    let result = statusFilter 
      ? orders.filter(o => o.status === statusFilter)
      : orders.filter(o => o.status !== 'consegnato');
    
    if (orderSearchQuery.trim()) {
      const query = orderSearchQuery.toLowerCase();
      result = result.filter(order => 
        (order.customerName || 'anonimo').toLowerCase().includes(query)
      );
    }
    return result;
  }, [orders, statusFilter, orderSearchQuery]);

  // Conteggio ordini per filtro "Tutti" (esclude consegnato)
  const activeOrdersCount = orders.filter(o => o.status !== 'consegnato').length;
  const closedOrdersCount = orders.filter(o => o.status === 'consegnato').length;

  // --- Live silent sync state ---
  const [lastSyncAt, setLastSyncAt] = useState<number>(Date.now());
  const [syncError, setSyncError] = useState<boolean>(false);
  const [nowTs, setNowTs] = useState<number>(Date.now());

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      
      // Load categories
      try {
        const categoriesData = await categoriesApi.getAll();
        setCategories(categoriesData);
      } catch (error) {
        console.error('Error loading categories:', error);
      }
      
      // Piatti e gruppi di scelta (per i piatti componibili)
      try {
        const [allDishes, groups] = await Promise.all([dishesApi.getAll(false), optionGroupsApi.getAll()]);
        setDishMap(Object.fromEntries(allDishes.map((d) => [d.id, d])));
        setOptionGroups(groups);
      } catch (error) {
        console.error('Error loading option groups:', error);
      }
      
      // Load menu for selected date
      try {
        const menu = await menusApi.getByDate(selectedDate);
        setCurrentMenu(menu);
      } catch (error: any) {
        if (error.response?.status === 404) {
          setCurrentMenu(null);
        } else {
          throw error;
        }
      }
      
      // Load orders for selected date
      const ordersData = await ordersApi.getAll(selectedDate);
      setOrders(ordersData);
      
      // Load customers
      const customersData = await customersApi.getAll();
      setCustomers(customersData);

      setLastSyncAt(Date.now());
      setSyncError(false);
    } catch (error) {
      console.error('Error loading data:', error);
      setSyncError(true);
      showToast('Impossibile caricare i dati', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [selectedDate]);

  // Silent background sync (no loading spinner, no toast on success)
  const silentSync = useCallback(async () => {
    try {
      const [menuRes, ordersData, customersData] = await Promise.allSettled([
        menusApi.getByDate(selectedDate),
        ordersApi.getAll(selectedDate),
        customersApi.getAll(),
      ]);
      if (menuRes.status === 'fulfilled') setCurrentMenu(menuRes.value);
      else if ((menuRes.reason as any)?.response?.status === 404) setCurrentMenu(null);
      if (ordersData.status === 'fulfilled') setOrders(ordersData.value);
      if (customersData.status === 'fulfilled') setCustomers(customersData.value);
      setLastSyncAt(Date.now());
      setSyncError(false);
    } catch {
      setSyncError(true);
    }
  }, [selectedDate]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // --- Live silent sync ---
  // Refresh silenzioso ogni 30s + al focus della pagina/tab
  useEffect(() => {
    // Poll dei dati ogni 30s
    const syncInt = setInterval(() => {
      silentSync();
    }, 30000);
    // Aggiorna il tempo mostrato ("N sec fa") ogni 5s per rimanere fresh
    const clockInt = setInterval(() => setNowTs(Date.now()), 5000);
    // Ricarica quando la tab torna in focus (web/browser)
    const onFocus = () => silentSync();
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
  }, [silentSync]);

  // Freshness classification
  const secondsSinceSync = Math.floor((nowTs - lastSyncAt) / 1000);
  const freshnessLevel: 'fresh' | 'stale' | 'error' = syncError
    ? 'error'
    : secondsSinceSync < 45
      ? 'fresh'
      : 'stale';
  const freshnessLabel = syncError
    ? 'Errore. Ricarica.'
    : secondsSinceSync < 10
      ? 'Aggiornato ora'
      : secondsSinceSync < 60
        ? `Aggiornato ${secondsSinceSync}s fa`
        : `Aggiornato ${Math.floor(secondsSinceSync / 60)} min fa`;

  // Reset edit mode and edit-related sub-states when the selected order changes
  // (or when no order is selected). Prevents "modifica" from staying open across orders.
  useEffect(() => {
    setEditOrderHeader(false);
    setEditShowCustomerPicker(false);
    setEditCustomerSearchQuery('');
    setShowEditOrderTimePicker(false);
  }, [selectedOrder?.id]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const openEditOrderHeader = () => {
    if (!selectedOrder) return;
    setEditCustomerName(selectedOrder.customerName || '');
    setEditCustomerId(selectedOrder.customerId || null);
    setEditOrderNotes(selectedOrder.notes || '');
    setEditOrderDeliveryTime(selectedOrder.deliveryTime || '');
    setEditOrderServiceType((selectedOrder.serviceType as any) || 'in_sede');
    setEditShowCustomerPicker(false);
    setEditCustomerSearchQuery('');
    setEditOrderHeader(true);
  };

  const saveOrderHeader = async () => {
    if (!selectedOrder) return;
    try {
      const updated = await ordersApi.updateInfo(selectedOrder.id, {
        customerName: editCustomerName.trim() || null,
        customerId: editCustomerId,
        notes: editOrderNotes,
        deliveryTime: editOrderDeliveryTime,
        serviceType: editOrderServiceType,
      });
      setSelectedOrder(updated);
      setOrders(orders.map(o => o.id === updated.id ? updated : o));
      setEditOrderHeader(false);
      showToast('Ordine aggiornato');
    } catch (e: any) {
      showToast(e.response?.data?.detail || 'Errore aggiornamento ordine', 'error');
    }
  };

  const handleCreateOrder = async () => {
    if (!currentMenu) {
      showToast('Nessun menu disponibile per questa data', 'error');
      return;
    }

    try {
      const order = await ordersApi.create(selectedDate, {
        channel: newOrderChannel,
        serviceType: newOrderServiceType,
        customerId: newOrderCustomer?.id,
        customerName: newOrderCustomer?.name,
        notes: newOrderNotes,
        deliveryTime: newOrderDeliveryTime,
      });
      
      setOrders([order, ...orders]);
      setSelectedOrder(order);
      setShowNewOrderModal(false);
      setNewOrderChannel('persona');
      setNewOrderServiceType('in_sede');
      setNewOrderCustomer(null);
      setNewOrderNotes('');
      setNewOrderDeliveryTime('');
      setShowAddItemModal(true);
      showToast('Ordine creato');
    } catch (error: any) {
      showToast(error.response?.data?.detail || 'Impossibile creare l\'ordine', 'error');
    }
  };

  const handleAddItem = async () => {
    if (!selectedOrder || !selectedMenuItem) return;
    
    const qty = parseInt(itemQuantity);
    if (isNaN(qty) || qty <= 0) {
      showToast('Quantità non valida', 'error');
      return;
    }

    // Prezzo personalizzato (se specificato)
    const customPrice = itemCustomPrice ? parseFloat(itemCustomPrice.replace(',', '.')) : undefined;
    const composerGroups = groupsForDish(dishMap[selectedMenuItem.dishId], optionGroups);
    if (composerGroups.length && selectionError(composerGroups, composerSel)) return;

    try {
      const updatedOrder = await ordersApi.addItem(selectedOrder.id, {
        dishId: selectedMenuItem.dishId,
        quantity: qty,
        customPrice: customPrice,
        notes: itemNotes || undefined,
        selections: composerGroups.length ? toSelectionList(composerSel) : undefined,
      });
      
      // Update orders list
      setOrders(orders.map(o => o.id === updatedOrder.id ? updatedOrder : o));
      setSelectedOrder(updatedOrder);
      
      // Refresh menu to get updated portions
      const menu = await menusApi.getByDate(selectedDate);
      setCurrentMenu(menu);
      
      setSelectedMenuItem(null);
      setComposerSel({});
      setItemQuantity('1');
      setItemCustomPrice('');
      setItemNotes('');
      showToast('Piatto aggiunto');
    } catch (error: any) {
      showToast(error.response?.data?.detail || 'Impossibile aggiungere il piatto', 'error');
    }
  };

  // Aggiungi piatto libero
  const handleAddCustomItem = async () => {
    if (!selectedOrder) return;
    
    if (!customItemName.trim()) {
      showToast('Inserisci il nome del piatto', 'error');
      return;
    }
    
    const price = parseFloat(customItemPrice.replace(',', '.'));
    if (isNaN(price) || price < 0) {
      showToast('Prezzo non valido', 'error');
      return;
    }
    
    const qty = parseInt(customItemQuantity);
    if (isNaN(qty) || qty <= 0) {
      showToast('Quantità non valida', 'error');
      return;
    }

    try {
      const updatedOrder = await ordersApi.addItem(selectedOrder.id, {
        dishName: customItemName.trim(),
        quantity: qty,
        customPrice: price,
      });
      
      setOrders(orders.map(o => o.id === updatedOrder.id ? updatedOrder : o));
      setSelectedOrder(updatedOrder);
      
      // Reset e chiudi modal
      setCustomItemName('');
      setCustomItemPrice('');
      setCustomItemQuantity('1');
      setShowCustomItemModal(false);
      showToast('Piatto libero aggiunto');
    } catch (error: any) {
      showToast(error.response?.data?.detail || 'Impossibile aggiungere il piatto', 'error');
    }
  };

  const handleRemoveItem = async (itemIndex: number) => {
    if (!selectedOrder) return;

    try {
      const updatedOrder = await ordersApi.removeItemByIndex(selectedOrder.id, itemIndex);
      setOrders(orders.map(o => o.id === updatedOrder.id ? updatedOrder : o));
      setSelectedOrder(updatedOrder);
      
      // Refresh menu
      const menu = await menusApi.getByDate(selectedDate);
      setCurrentMenu(menu);
      showToast('Piatto rimosso');
    } catch (error: any) {
      showToast(error.response?.data?.detail || 'Impossibile rimuovere il piatto', 'error');
    }
  };

  // Inline editing dei singoli item dell'ordine (solo per ordini di oggi)
  const todayDate = format(new Date(), 'yyyy-MM-dd');
  const canEditOrderItems = selectedOrder && selectedOrder.menuDate === todayDate;

  const [editingItemIndex, setEditingItemIndex] = useState<number | null>(null);
  const [itemEditQty, setItemEditQty] = useState('1');
  const [itemEditNotes, setItemEditNotes] = useState('');
  const [itemEditName, setItemEditName] = useState('');
  const [itemEditPrice, setItemEditPrice] = useState('');

  const openEditItem = (index: number, fromOrder?: Order) => {
    const order = fromOrder || selectedOrder;
    if (!order) return;
    const it = order.items[index];
    if (!it) return;
    setEditingItemIndex(index);
    setItemEditQty(String(it.quantity));
    setItemEditNotes(it.notes || '');
    setItemEditName(it.dishName || '');
    setItemEditPrice(String(it.unitPrice ?? ''));
    setItemEditSel(selectionsFrom(it.composition));
  };

  const cancelEditItem = () => {
    setEditingItemIndex(null);
    setItemEditQty('1');
    setItemEditNotes('');
    setItemEditName('');
    setItemEditPrice('');
  };

  const saveEditItem = async () => {
    if (!selectedOrder || editingItemIndex === null) return;
    const it = selectedOrder.items[editingItemIndex];
    const qty = parseInt(itemEditQty);
    if (isNaN(qty) || qty < 1) {
      showToast('Quantità non valida', 'error');
      return;
    }
    const payload: Parameters<typeof ordersApi.updateItemByIndex>[2] = {
      quantity: qty,
      notes: itemEditNotes,
    };
    const editGroups = it.dishId ? groupsForDish(dishMap[it.dishId], optionGroups) : [];
    if (editGroups.length) {
      const err = selectionError(editGroups, itemEditSel);
      if (err) {
        showToast(err, 'error');
        return;
      }
      payload.selections = toSelectionList(itemEditSel);
    }
    if (it.isCustomItem) {
      if (!itemEditName.trim()) {
        showToast('Nome piatto richiesto', 'error');
        return;
      }
      const price = parseFloat(itemEditPrice.replace(',', '.'));
      if (isNaN(price) || price < 0) {
        showToast('Prezzo non valido', 'error');
        return;
      }
      payload.dishName = itemEditName.trim();
      payload.unitPrice = price;
    }
    try {
      const updated = await ordersApi.updateItemByIndex(selectedOrder.id, editingItemIndex, payload);
      setOrders(orders.map(o => o.id === updated.id ? updated : o));
      setSelectedOrder(updated);
      if (!it.isCustomItem) {
        const menu = await menusApi.getByDate(selectedDate);
        setCurrentMenu(menu);
      }
      cancelEditItem();
      showToast('Piatto aggiornato');
    } catch (error: any) {
      showToast(error.response?.data?.detail || 'Impossibile modificare il piatto', 'error');
    }
  };

  // Toggle "manda in cucina" per un singolo item
  const handleToggleKitchen = async (itemIndex: number) => {
    if (!selectedOrder) return;
    const it = selectedOrder.items[itemIndex];
    try {
      const updated = await ordersApi.updateItemByIndex(selectedOrder.id, itemIndex, {
        sendToKitchen: !it.sendToKitchen,
      });
      setOrders(orders.map(o => o.id === updated.id ? updated : o));
      setSelectedOrder(updated);
      showToast(!it.sendToKitchen ? 'Piatto inviato in Cucina' : 'Rimosso dalla Cucina');
    } catch (error: any) {
      showToast(error.response?.data?.detail || 'Impossibile aggiornare', 'error');
    }
  };

  // Duplica un piatto libero (utile per varianti veloci tipo "insalata senza tonno")
  const handleDuplicateCustomItem = async (itemIndex: number) => {    if (!selectedOrder) return;
    const it = selectedOrder.items[itemIndex];
    if (!it.isCustomItem) return;
    try {
      const updated = await ordersApi.addItem(selectedOrder.id, {
        dishName: it.dishName,
        quantity: it.quantity,
        customPrice: it.unitPrice,
      });
      setOrders(orders.map(o => o.id === updated.id ? updated : o));
      setSelectedOrder(updated);
      // Apri subito edit sul nuovo item (ultimo in lista) passando l'order aggiornato
      const newIndex = updated.items.length - 1;
      openEditItem(newIndex, updated);
      showToast('Piatto duplicato. Modifica come vuoi.');
    } catch (error: any) {
      showToast(error.response?.data?.detail || 'Impossibile duplicare il piatto', 'error');
    }
  };

  const handleUpdateStatus = async (orderId: string, status: string) => {
    try {
      const updatedOrder = await ordersApi.updateStatus(orderId, status);
      setOrders(orders.map(o => o.id === updatedOrder.id ? updatedOrder : o));
      
      if (selectedOrder?.id === orderId) {
        setSelectedOrder(updatedOrder);
      }
      
      // Refresh menu if status changed to/from annullato
      if (status === 'annullato' || selectedOrder?.status === 'annullato') {
        const menu = await menusApi.getByDate(selectedDate);
        setCurrentMenu(menu);
      }
      showToast(`Stato: ${STATUS_LABELS[status]}`);
    } catch (error: any) {
      showToast(error.response?.data?.detail || 'Impossibile aggiornare lo stato', 'error');
    }
  };

  const changeDate = (days: number) => {
    const currentDate = new Date(selectedDate);
    currentDate.setDate(currentDate.getDate() + days);
    setSelectedDate(format(currentDate, 'yyyy-MM-dd'));
  };

  const getTotalRevenue = () => {
    return orders
      .filter(o => o.status !== 'annullato')
      .reduce((sum, o) => sum + o.total, 0);
  };

  const gridCols = width >= 1560 ? 3 : width >= 1020 ? 2 : 1;
  const counterValues = {
    tutti: activeOrdersCount,
    in_attesa: orders.filter(o => o.status === 'in_attesa').length,
    in_preparazione: orders.filter(o => o.status === 'in_preparazione').length,
    pronto: orders.filter(o => o.status === 'pronto').length,
    sospeso: orders.filter(o => o.status === 'sospeso').length,
    consegnato: closedOrdersCount,
  };

  const searchBar = currentMenu ? (
    <View style={[styles.ordersSearchContainer, isSmallScreen && styles.ordersSearchContainerCompact]} testID="orders-search-container">
      <Ionicons name="search" size={18} color={C.muted} style={styles.searchIcon} />
      <TextInput
        style={styles.ordersSearchInput}
        value={orderSearchQuery}
        onChangeText={setOrderSearchQuery}
        placeholder="Cerca ordine per nome cliente..."
        placeholderTextColor={C.muted}
        autoCapitalize="none"
        autoCorrect={false}
        testID="orders-search-input"
      />
      {orderSearchQuery.length > 0 && (
        <TouchableOpacity onPress={() => setOrderSearchQuery('')} style={styles.clearSearchButton} testID="orders-search-clear">
          <Ionicons name="close-circle" size={20} color={C.muted} />
        </TouchableOpacity>
      )}
    </View>
  ) : null;

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} testID="orders-loading">
        <View style={styles.skeletonWrap}>
          <Shimmer style={styles.skeletonHeader} />
          <View style={styles.skeletonCounters}>
            {[0, 1, 2, 3, 4, 5].map((i) => <Shimmer key={i} style={styles.skeletonCounter} />)}
          </View>
          {[0, 1, 2].map((i) => <SkeletonCard key={i} />)}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <OrdersHeader
        freshness={freshnessLevel}
        freshnessLabel={freshnessLabel}
        onSync={silentSync}
        selectedDate={selectedDate}
        onChangeDate={changeDate}
        compact={isSmallScreen}
      />

      <StatusCounters
        counts={counterValues}
        active={statusFilter}
        onChange={(key) => setStatusFilter(key as any)}
        compact={isSmallScreen}
      />

      {/* Content */}
      <View style={[styles.content, isSmallScreen && styles.contentCompact]}>
        <View style={[styles.panelHeader, isSmallScreen && styles.panelHeaderCompact]}>
          <View style={styles.panelTitleRow}>
            <Text style={styles.panelTitle}>Ordini del Giorno</Text>
            <View style={styles.panelCount}>
              <FlipText value={filteredOrders.length} style={styles.panelCountText} testID="orders-visible-count" />
            </View>
          </View>

          {!isSmallScreen && searchBar}

          <View style={styles.panelHeaderActions}>
            {/* OP06: Portions Dashboard Button */}
            {currentMenu && currentMenu.items && currentMenu.items.length > 0 && (
              <PressableScale
                style={styles.compactButton}
                onPress={() => setShowPortionsModal(true)}
                testID="portions-dashboard-btn"
                accessibilityLabel="Porzioni disponibili"
              >
                <Ionicons name="restaurant-outline" size={18} color={C.green} />
                {!isSmallScreen && <Text style={styles.compactButtonText}>Porzioni</Text>}
              </PressableScale>
            )}
            <PressableScale
              style={[styles.compactButtonPrimary, !currentMenu && styles.disabledButton]}
              onPress={() => setShowNewOrderModal(true)}
              disabled={!currentMenu}
              testID="new-order-button"
              accessibilityLabel="Nuovo ordine"
            >
              <Ionicons name="add" size={20} color="#ffffff" />
              {!isSmallScreen && <Text style={styles.compactButtonPrimaryText}>Nuovo ordine</Text>}
            </PressableScale>
          </View>
          {isSmallScreen && searchBar}
        </View>

        {!currentMenu ? (
          <EmptyOrders
            icon="calendar-outline"
            title="Nessun menu per questa data"
            subtitle="Crea prima un menu giornaliero"
            actionLabel="Vai al Menu"
            onAction={() => router.push('/menu' as any)}
            testID="orders-empty-menu"
          />
        ) : (
          <ScrollView
            key={`${selectedDate}-${statusFilter || 'tutti'}`}
            style={styles.ordersList}
            contentContainerStyle={styles.ordersGrid}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.brand} />
            }
          >
            {filteredOrders.length === 0 ? (
              <View style={styles.ordersGridFull}>
                <EmptyOrders
                  icon="receipt-outline"
                  title={statusFilter ? `Nessun ordine ${STATUS_LABELS[statusFilter]}` : 'Nessun ordine'}
                  subtitle={orderSearchQuery ? 'Prova a cercare un altro nome' : 'Tocca "Nuovo ordine" per iniziare'}
                  testID="orders-empty"
                />
              </View>
            ) : (
              filteredOrders.map((order, index) => (
                <Appear key={order.id} index={index} style={[styles.ordersGridCell, { width: `${100 / gridCols}%` as any }]}>
                  <OrderTicket
                    order={order}
                    selected={selectedOrder?.id === order.id}
                    onOpen={() => {
                      setSelectedOrder(order);
                      setShowAddItemModal(true);
                    }}
                    onPrint={(e) => handlePrintOrder(order, e)}
                    onTogglePayment={() => handleTogglePayment(order)}
                  />
                </Appear>
              ))
            )}
          </ScrollView>
        )}
      </View>

      {/* New Order Modal */}
      <Modal visible={showNewOrderModal} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <ModalSheet style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Nuovo Ordine</Text>
              <TouchableOpacity onPress={() => setShowNewOrderModal(false)}>
                <Ionicons name="close" size={24} color="#0F172A" />
              </TouchableOpacity>
            </View>

            <ScrollView 
              style={styles.newOrderScroll}
              contentContainerStyle={styles.newOrderScrollContent}
              showsVerticalScrollIndicator={true}
              keyboardShouldPersistTaps="handled"
            >

            <Text style={styles.inputLabel}>Canale</Text>
            <View style={styles.channelSelector}>
              {CHANNELS.map((channel) => (
                <TouchableOpacity
                  key={channel.id}
                  style={[
                    styles.channelButton,
                    newOrderChannel === channel.id && styles.channelButtonActive,
                  ]}
                  onPress={() => setNewOrderChannel(channel.id)}
                >
                  <Ionicons
                    name={channel.icon as any}
                    size={24}
                    color={newOrderChannel === channel.id ? '#0F172A' : '#475569'}
                  />
                  <Text
                    style={[
                      styles.channelButtonText,
                      newOrderChannel === channel.id && styles.channelButtonTextActive,
                    ]}
                  >
                    {channel.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.inputLabel}>Tipologia</Text>
            <View style={styles.serviceTypeSelector}>
              {[
                { id: 'in_sede', label: 'In Sede', icon: 'restaurant' },
                { id: 'da_ritirare', label: 'Da Ritirare', icon: 'walk' },
                { id: 'da_consegnare', label: 'Da Consegnare', icon: 'bicycle' },
              ].map((type) => (
                <TouchableOpacity
                  key={type.id}
                  style={[
                    styles.serviceTypeButton,
                    newOrderServiceType === type.id && styles.serviceTypeButtonActive,
                  ]}
                  onPress={() => setNewOrderServiceType(type.id as any)}
                >
                  <Ionicons
                    name={type.icon as any}
                    size={20}
                    color={newOrderServiceType === type.id ? '#0F172A' : '#475569'}
                  />
                  <Text
                    style={[
                      styles.serviceTypeButtonText,
                      newOrderServiceType === type.id && styles.serviceTypeButtonTextActive,
                    ]}
                  >
                    {type.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.inputLabel}>Cliente (opzionale)</Text>
            {!showInlineCustomerPicker ? (
              <TouchableOpacity
                style={[
                  styles.customerSelector,
                  Platform.OS === 'web' && { cursor: 'pointer' } as any,
                ]}
                onPress={() => setShowInlineCustomerPicker(true)}
                activeOpacity={0.7}
              >
                <Text style={styles.customerSelectorText}>
                  {newOrderCustomer ? newOrderCustomer.name : 'Seleziona cliente...'}
                </Text>
                <Ionicons name="chevron-down" size={20} color="#475569" />
              </TouchableOpacity>
            ) : (
              <View style={styles.inlineCustomerPicker}>
                <View style={styles.inlinePickerHeader}>
                  <TextInput
                    style={styles.inlineSearchInput}
                    placeholder="Cerca cliente..."
                    placeholderTextColor="#94A3B8"
                    value={customerSearchQuery}
                    onChangeText={setCustomerSearchQuery}
                    autoFocus
                  />
                  <TouchableOpacity 
                    onPress={() => {
                      setShowInlineCustomerPicker(false);
                      setCustomerSearchQuery('');
                    }}
                    style={styles.inlineCloseBtn}
                  >
                    <Ionicons name="close" size={20} color="#0F172A" />
                  </TouchableOpacity>
                </View>
                <ScrollView style={styles.inlineCustomerList} nestedScrollEnabled={true}>
                  <TouchableOpacity
                    style={styles.customerOption}
                    onPress={() => {
                      setNewOrderCustomer(null);
                      setShowInlineCustomerPicker(false);
                      setCustomerSearchQuery('');
                    }}
                  >
                    <Text style={styles.customerOptionText}>Nessun cliente (Anonimo)</Text>
                  </TouchableOpacity>
                  {customers
                    .filter(c => c.name.toLowerCase().includes(customerSearchQuery.toLowerCase()))
                    .map(customer => (
                      <TouchableOpacity
                        key={customer.id}
                        style={[
                          styles.customerOption,
                          newOrderCustomer?.id === customer.id && styles.customerOptionSelected
                        ]}
                        onPress={() => {
                          setNewOrderCustomer(customer);
                          setShowInlineCustomerPicker(false);
                          setCustomerSearchQuery('');
                          // Load unpaid orders for this customer
                          customersApi.getUnpaidOrders(customer.id).then(setUnpaidOrders).catch(() => {});
                        }}
                      >
                        <Text style={styles.customerOptionText}>{customer.name}</Text>
                        {customer.type === 'azienda' && (
                          <Ionicons name="business" size={16} color="#475569" />
                        )}
                      </TouchableOpacity>
                    ))}
                </ScrollView>
              </View>
            )}

            <Text style={styles.inputLabel}>Note</Text>
            <TextInput
              style={styles.textInput}
              value={newOrderNotes}
              onChangeText={setNewOrderNotes}
              placeholder="Note ordine..."
              placeholderTextColor="#94A3B8"
              multiline
            />

            <Text style={styles.inputLabel}>Ora di consegna (opzionale)</Text>
            <TimePickerInline 
              value={newOrderDeliveryTime}
              onChange={setNewOrderDeliveryTime}
              testIDPrefix="new-order-time-picker"
              label="Ora di consegna"
            />

            {/* Unpaid Orders Warning - Compact with view options */}
            {unpaidOrders.length > 0 && newOrderCustomer && (
              <View style={styles.unpaidWarningBox}>
                <View style={styles.unpaidWarningHeader}>
                  <Ionicons name="alert-circle" size={16} color="#DB0007" />
                  <Text style={styles.unpaidWarningTitle}>
                    {unpaidOrders.length} ordine/i non pagato/i
                  </Text>
                  {unpaidOrders.length > 2 && (
                    <TouchableOpacity 
                      style={styles.unpaidViewAllBtn}
                      onPress={() => {
                        setShowNewOrderModal(false);
                        router.push(`/unpaid-orders?customerId=${newOrderCustomer?.id}&customerName=${encodeURIComponent(newOrderCustomer?.name || '')}` as any);
                      }}
                    >
                      <Text style={styles.unpaidViewAllText}>Vedi tutti</Text>
                    </TouchableOpacity>
                  )}
                </View>
                {unpaidOrders.slice(0, 2).map((uo) => (
                  <View key={uo.id} style={styles.unpaidOrderItem}>
                    <TouchableOpacity 
                      style={styles.unpaidOrderInfo}
                      onPress={() => {
                        // Navigate to unpaid orders page
                        setShowNewOrderModal(false);
                        router.push(`/unpaid-orders?customerId=${newOrderCustomer?.id}&customerName=${encodeURIComponent(newOrderCustomer?.name || '')}` as any);
                      }}
                    >
                      <Text style={styles.unpaidOrderText} numberOfLines={1}>
                        #{uo.orderNumber} • {uo.total.toFixed(2)} €
                      </Text>
                      <Ionicons name="eye-outline" size={14} color="#2563EB" />
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={styles.unpaidPayButton}
                      onPress={async () => {
                        try {
                          await ordersApi.updatePayment(uo.id, true);
                          const updatedUnpaid = unpaidOrders.filter(o => o.id !== uo.id);
                          setUnpaidOrders(updatedUnpaid);
                          showToast(`Ordine #${uo.orderNumber} pagato`);
                          loadData();
                        } catch (error) {
                          showToast('Errore', 'error');
                        }
                      }}
                    >
                      <Ionicons name="checkmark" size={14} color="#00754A" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
            </ScrollView>

            {/* Fuori dallo scroll: il tasto resta sempre visibile */}
            <TouchableOpacity style={[styles.primaryButton, styles.newOrderFooterButton]} onPress={handleCreateOrder} testID="create-order-button">
              <Text style={styles.primaryButtonText}>Crea Ordine</Text>
            </TouchableOpacity>
          </ModalSheet>
        </View>
      </Modal>

      {/* Customer Picker Modal */}
      <Modal visible={showCustomerPicker} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <ModalSheet style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Seleziona Cliente</Text>
              <TouchableOpacity onPress={() => {
                setShowCustomerPicker(false);
                setCustomerSearchQuery('');
              }}>
                <Ionicons name="close" size={24} color="#0F172A" />
              </TouchableOpacity>
            </View>
            
            {/* Search Input */}
            <View style={styles.searchInputContainer}>
              <Ionicons name="search" size={20} color="#475569" style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                value={customerSearchQuery}
                onChangeText={setCustomerSearchQuery}
                placeholder="Cerca cliente per nome..."
                placeholderTextColor="#94A3B8"
                autoCapitalize="none"
                autoCorrect={false}
              />
              {customerSearchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setCustomerSearchQuery('')} style={styles.clearSearchButton}>
                  <Ionicons name="close-circle" size={20} color="#475569" />
                </TouchableOpacity>
              )}
            </View>
            
            <ScrollView style={styles.customerList}>
              <TouchableOpacity
                style={styles.customerItem}
                onPress={() => {
                  setNewOrderCustomer(null);
                  setShowCustomerPicker(false);
                  setCustomerSearchQuery('');
                }}
              >
                <Text style={styles.customerItemText}>Nessun cliente</Text>
              </TouchableOpacity>
              {customers
                .filter(customer => 
                  customerSearchQuery.trim() === '' || 
                  customer.name.toLowerCase().includes(customerSearchQuery.toLowerCase()) ||
                  (customer.phone && customer.phone.includes(customerSearchQuery))
                )
                .map((customer) => (
                  <TouchableOpacity
                    key={customer.id}
                    style={styles.customerItem}
                    onPress={() => {
                      setNewOrderCustomer(customer);
                      checkUnpaidOrders(customer.id);
                      setShowCustomerPicker(false);
                      setCustomerSearchQuery('');
                    }}
                  >
                    <Text style={styles.customerItemText}>{customer.name}</Text>
                    {customer.phone && (
                      <Text style={styles.customerItemSubtext}>{customer.phone}</Text>
                    )}
                  </TouchableOpacity>
                ))
              }
              {customers.filter(customer => 
                customerSearchQuery.trim() === '' || 
                customer.name.toLowerCase().includes(customerSearchQuery.toLowerCase()) ||
                (customer.phone && customer.phone.includes(customerSearchQuery))
              ).length === 0 && customerSearchQuery.trim() !== '' && (
                <View style={styles.noResultsContainer}>
                  <Ionicons name="person-outline" size={40} color="#475569" />
                  <Text style={styles.noResultsText}>Nessun cliente trovato</Text>
                  <Text style={styles.noResultsSubtext}>Prova con un altro termine di ricerca</Text>
                </View>
              )}
            </ScrollView>
          </ModalSheet>
        </View>
      </Modal>

      {/* Add Item Modal */}
      <Modal visible={showAddItemModal} animationType="slide" transparent={false}>
        <SafeAreaView style={styles.fullScreenModal}>
          <View style={styles.fullScreenModalContent}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderInfo}>
                <Text style={styles.modalTitle}>
                  Ordine #{selectedOrder?.orderNumber}
                  {selectedOrder?.serviceType && (
                    <Text style={styles.modalServiceType}>
                      {' - '}
                      {selectedOrder.serviceType === 'da_consegnare' ? 'Da consegnare' : 
                       selectedOrder.serviceType === 'da_ritirare' ? 'Da ritirare' : 'In sede'}
                    </Text>
                  )}
                </Text>
                {selectedOrder && (
                  <Text style={styles.modalCustomerName}>
                    {selectedOrder.customerName || 'Anonimo'}
                  </Text>
                )}
              </View>
              <View style={styles.modalHeaderActions}>
                {selectedOrder && (
                  <>
                    <Pressable 
                      style={({ pressed }) => [
                        styles.deleteOrderButton,
                        pressed && { opacity: 0.7 },
                        Platform.OS === 'web' && { cursor: 'pointer' } as any,
                      ]}
                      onPress={() => {
                        console.log('Delete button pressed');
                        setShowDeleteConfirm(true);
                      }}
                    >
                      <Ionicons name="trash" size={22} color="#DB0007" />
                    </Pressable>
                    <TouchableOpacity 
                      style={styles.printButton}
                      onPress={() => handlePrintOrder(selectedOrder)}
                    >
                      <Ionicons name="print" size={24} color="#fff" />
                    </TouchableOpacity>
                  </>
                )}
                <TouchableOpacity 
                  style={styles.closeButton}
                  onPress={() => {
                    setShowAddItemModal(false);
                    setSelectedOrder(null);
                    setSelectedMenuItem(null);
                    // The unpaid orders view is already showing underneath
                  }}
                >
                  <Ionicons name="close" size={28} color="#fff" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Inline Delete Confirmation Panel */}
            {showDeleteConfirm && (
              <View style={styles.deleteConfirmPanel}>
                <View style={styles.deleteConfirmContent}>
                  <Ionicons name="warning" size={32} color="#DB0007" />
                  <Text style={styles.deleteConfirmTitle}>Conferma Cancellazione</Text>
                  <Text style={styles.deleteConfirmText}>
                    Vuoi cancellare l'ordine #{selectedOrder?.orderNumber}?{'\n'}
                    Le porzioni verranno ripristinate nel menu.
                  </Text>
                  <View style={styles.deleteConfirmButtons}>
                    <TouchableOpacity 
                      style={styles.deleteConfirmCancelBtn}
                      onPress={() => setShowDeleteConfirm(false)}
                    >
                      <Text style={styles.deleteConfirmCancelText}>Annulla</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={styles.deleteConfirmDeleteBtn}
                      onPress={handleDeleteOrder}
                    >
                      <Ionicons name="trash" size={18} color="#fff" />
                      <Text style={styles.deleteConfirmDeleteText}>Cancella Ordine</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            )}

            <ScrollView 
              style={styles.modalScrollContent} 
              showsVerticalScrollIndicator={true}
              contentContainerStyle={[styles.modalScrollContentContainer, selectedMenuItem && styles.modalScrollWithFooter]}
            >
              {/* Order Header Info - Editable */}
              <Appear index={0} style={styles.mobileSectionCard} testID="order-header-info">
                <View style={styles.orderHeaderInfoRow}>
                  <Text style={styles.sectionTitle}>Info Ordine</Text>
                  {!editOrderHeader && (
                    <TouchableOpacity 
                      style={styles.editHeaderBtn}
                      onPress={openEditOrderHeader}
                      testID="edit-order-header-btn"
                    >
                      <Ionicons name="create-outline" size={18} color="#2563EB" />
                      <Text style={styles.editHeaderBtnText}>Modifica</Text>
                    </TouchableOpacity>
                  )}
                </View>
                
                {!editOrderHeader ? (
                  <View>
                    <View style={styles.orderHeaderInfoLine}>
                      <Ionicons name="person-outline" size={16} color="#475569" />
                      <Text style={styles.orderHeaderInfoLabel}>Intestatario: </Text>
                      <Text style={styles.orderHeaderInfoValue}>
                        {selectedOrder?.customerName || 'Anonimo'}
                      </Text>
                    </View>
                    <View style={styles.orderHeaderInfoLine}>
                      <Ionicons name="restaurant-outline" size={16} color="#475569" />
                      <Text style={styles.orderHeaderInfoLabel}>Tipologia: </Text>
                      <Text style={styles.orderHeaderInfoValue}>
                        {selectedOrder?.serviceType === 'da_consegnare' ? 'Da consegnare' : 
                         selectedOrder?.serviceType === 'da_ritirare' ? 'Da ritirare' : 'In sede'}
                      </Text>
                    </View>
                    {!!selectedOrder?.deliveryTime && (
                      <View style={styles.orderHeaderInfoLine}>
                        <Ionicons name="time-outline" size={16} color="#FFBC0D" />
                        <Text style={styles.orderHeaderInfoLabel}>Ora consegna: </Text>
                        <Text style={[styles.orderHeaderInfoValue, { color: '#FFBC0D', fontWeight: '700' }]}>
                          {selectedOrder.deliveryTime}
                        </Text>
                      </View>
                    )}
                    {!!selectedOrder?.notes && (
                      <View style={[styles.orderHeaderInfoLine, { alignItems: 'flex-start' }]}>
                        <Ionicons name="document-text-outline" size={16} color="#2563EB" style={{ marginTop: 2 }} />
                        <Text style={styles.orderHeaderInfoLabel}>Note: </Text>
                        <Text style={[styles.orderHeaderInfoValue, { flex: 1 }]}>{selectedOrder.notes}</Text>
                      </View>
                    )}
                  </View>
                ) : (
                  <View>
                    <Text style={styles.inputLabel}>Intestatario</Text>
                    {!editShowCustomerPicker ? (
                      <View style={styles.editCustomerRow}>
                        <TextInput
                          style={[styles.textInput, { flex: 1 }]}
                          value={editCustomerName}
                          onChangeText={(t) => { setEditCustomerName(t); setEditCustomerId(null); }}
                          placeholder="Nome intestatario..."
                          placeholderTextColor="#94A3B8"
                          testID="edit-customer-name-input"
                        />
                        <TouchableOpacity 
                          style={styles.pickCustomerBtn}
                          onPress={() => { setShowQuickCustomer(false); setEditShowCustomerPicker(true); }}
                          testID="edit-customer-picker-button"
                        >
                          <Ionicons name="people" size={20} color="#0F172A" />
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <View style={styles.inlineCustomerPicker}>
                        <View style={styles.inlinePickerHeader}>
                          <TextInput
                            style={styles.inlineSearchInput}
                            placeholder="Cerca cliente..."
                            placeholderTextColor="#94A3B8"
                            value={editCustomerSearchQuery}
                            onChangeText={setEditCustomerSearchQuery}
                            autoFocus
                          />
                          <TouchableOpacity 
                            onPress={() => { setEditShowCustomerPicker(false); setEditCustomerSearchQuery(''); setShowQuickCustomer(false); }}
                            style={styles.inlineCloseBtn}
                          >
                            <Ionicons name="close" size={20} color="#0F172A" />
                          </TouchableOpacity>
                        </View>
                        {showQuickCustomer ? (
                          <QuickCustomerForm
                            initialName={editCustomerSearchQuery}
                            onCancel={() => setShowQuickCustomer(false)}
                            onCreated={(c) => {
                              setCustomers([...customers, c].sort((a, b) => a.name.localeCompare(b.name)));
                              setEditCustomerName(c.name);
                              setEditCustomerId(c.id);
                              setShowQuickCustomer(false);
                              setEditShowCustomerPicker(false);
                              setEditCustomerSearchQuery('');
                            }}
                          />
                        ) : (
                          <TouchableOpacity style={styles.newCustomerOption} onPress={() => setShowQuickCustomer(true)} testID="edit-new-customer-button">
                            <Ionicons name="person-add" size={18} color="#00754A" />
                            <Text style={styles.newCustomerOptionText}>Nuovo cliente</Text>
                          </TouchableOpacity>
                        )}
                        <ScrollView style={styles.inlineCustomerList} nestedScrollEnabled>
                          <TouchableOpacity
                            style={styles.customerOption}
                            onPress={() => {
                              setEditCustomerName('');
                              setEditCustomerId(null);
                              setEditShowCustomerPicker(false);
                              setEditCustomerSearchQuery('');
                            }}
                          >
                            <Text style={styles.customerOptionText}>Anonimo</Text>
                          </TouchableOpacity>
                          {customers
                            .filter(c => c.name.toLowerCase().includes(editCustomerSearchQuery.toLowerCase()))
                            .map(c => (
                              <TouchableOpacity
                                key={c.id}
                                style={styles.customerOption}
                                onPress={() => {
                                  setEditCustomerName(c.name);
                                  setEditCustomerId(c.id);
                                  setEditShowCustomerPicker(false);
                                  setEditCustomerSearchQuery('');
                                }}
                              >
                                <Text style={styles.customerOptionText}>{c.name}</Text>
                              </TouchableOpacity>
                            ))}
                        </ScrollView>
                      </View>
                    )}
                    
                    <Text style={styles.inputLabel}>Tipologia</Text>
                    <View style={styles.serviceTypeSelector}>
                      {[
                        { id: 'in_sede', label: 'In Sede', icon: 'restaurant' },
                        { id: 'da_ritirare', label: 'Da Ritirare', icon: 'walk' },
                        { id: 'da_consegnare', label: 'Da Consegnare', icon: 'bicycle' },
                      ].map((type) => (
                        <TouchableOpacity
                          key={type.id}
                          style={[
                            styles.serviceTypeButton,
                            editOrderServiceType === type.id && styles.serviceTypeButtonActive,
                          ]}
                          onPress={() => setEditOrderServiceType(type.id as any)}
                        >
                          <Ionicons
                            name={type.icon as any}
                            size={18}
                            color={editOrderServiceType === type.id ? '#fff' : '#475569'}
                          />
                          <Text
                            style={[
                              styles.serviceTypeButtonText,
                              editOrderServiceType === type.id && styles.serviceTypeButtonTextActive,
                            ]}
                          >
                            {type.label}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                    
                    <Text style={styles.inputLabel}>Ora di consegna (opzionale)</Text>
                    <TimePickerInline 
                      value={editOrderDeliveryTime}
                      onChange={setEditOrderDeliveryTime}
                      testIDPrefix="edit-time-picker"
                      label="Ora di consegna"
                    />
                    
                    <Text style={styles.inputLabel}>Note ordine</Text>
                    <TextInput
                      style={[styles.textInput, { minHeight: 60 }]}
                      value={editOrderNotes}
                      onChangeText={setEditOrderNotes}
                      placeholder="Note ordine..."
                      placeholderTextColor="#94A3B8"
                      multiline
                      testID="edit-notes-input"
                    />
                    
                    <View style={styles.editHeaderActions}>
                      <TouchableOpacity
                        style={styles.editHeaderCancelBtn}
                        onPress={() => setEditOrderHeader(false)}
                      >
                        <Text style={styles.editHeaderCancelText}>Annulla</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.editHeaderSaveBtn}
                        onPress={saveOrderHeader}
                        testID="save-order-header-btn"
                      >
                        <Ionicons name="checkmark" size={18} color="#fff" />
                        <Text style={styles.editHeaderSaveText}>Salva</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </Appear>

              {/* Order Summary Section - NOW FIRST */}
              <Appear index={1} style={styles.mobileSectionCard}>
                <Text style={styles.sectionTitle}>Riepilogo Ordine</Text>
                {selectedOrder?.items.length === 0 ? (
                  <Text style={styles.emptyOrderText}>Nessun piatto nell&apos;ordine</Text>
                ) : (
                  selectedOrder?.items.map((item, index) => (
                    <View key={`order-${item.dishId || 'custom'}-${index}`} style={[
                      styles.orderItemRow,
                      item.sendToKitchen && styles.orderItemKitchen,
                      item.itemStatus === 'ready' && styles.orderItemReady,
                      item.itemStatus === 'problem' && styles.orderItemProblem,
                    ]}>
                      {editingItemIndex === index ? (
                        /* INLINE EDIT FORM */
                        <View style={styles.itemEditForm} testID={`item-edit-form-${index}`}>
                          {item.isCustomItem && (
                            <>
                              <Text style={styles.itemEditLabel}>Nome piatto</Text>
                              <TextInput
                                style={styles.itemEditInput}
                                value={itemEditName}
                                onChangeText={setItemEditName}
                                placeholder="Nome piatto libero"
                                placeholderTextColor="#94A3B8"
                                testID={`item-edit-name-${index}`}
                              />
                            </>
                          )}
                          <View style={styles.itemEditRow}>
                            <View style={styles.itemEditCol}>
                              <Text style={styles.itemEditLabel}>Quantità</Text>
                              <View style={styles.inlineQuantityControl} testID={`item-edit-qty-control-${index}`}>
                                <TouchableOpacity
                                  style={styles.inlineQtyBtn}
                                  onPress={() => setItemEditQty(Math.max(1, parseInt(itemEditQty || '1') - 1).toString())}
                                  testID={`item-edit-qty-minus-${index}`}
                                >
                                  <Ionicons name="remove" size={18} color="#0F172A" />
                                </TouchableOpacity>
                                <Text style={styles.inlineQtyText} testID={`item-edit-qty-${index}`}>{itemEditQty}</Text>
                                <TouchableOpacity
                                  style={styles.inlineQtyBtn}
                                  onPress={() => setItemEditQty((parseInt(itemEditQty || '1') + 1).toString())}
                                  testID={`item-edit-qty-plus-${index}`}
                                >
                                  <Ionicons name="add" size={18} color="#0F172A" />
                                </TouchableOpacity>
                              </View>
                            </View>
                            {item.isCustomItem && (
                              <View style={styles.itemEditCol}>
                                <Text style={styles.itemEditLabel}>Prezzo (€)</Text>
                                <TextInput
                                  style={styles.itemEditInput}
                                  value={itemEditPrice}
                                  onChangeText={setItemEditPrice}
                                  keyboardType="decimal-pad"
                                  testID={`item-edit-price-${index}`}
                                />
                              </View>
                            )}
                          </View>
                          {!!item.dishId && groupsForDish(dishMap[item.dishId], optionGroups).length > 0 && (
                            <>
                              <Text style={styles.itemEditLabel}>
                                Composizione · {euro(item.unitPrice - selectionExtra(groupsForDish(dishMap[item.dishId], optionGroups), selectionsFrom(item.composition)) + selectionExtra(groupsForDish(dishMap[item.dishId], optionGroups), itemEditSel))} cad.
                              </Text>
                              <DishComposer
                                groups={groupsForDish(dishMap[item.dishId], optionGroups)}
                                value={itemEditSel}
                                onChange={setItemEditSel}
                                unavailable={currentMenu?.items.find((mi) => mi.dishId === item.dishId)?.unavailableOptionIds || []}
                                keepIds={(item.composition || []).map((c) => c.optionId)}
                              />
                            </>
                          )}
                          <Text style={styles.itemEditLabel}>Note</Text>
                          <TextInput
                            style={[styles.itemEditInput, styles.itemEditTextarea]}
                            value={itemEditNotes}
                            onChangeText={setItemEditNotes}
                            placeholder="Note per questo piatto..."
                            placeholderTextColor="#94A3B8"
                            multiline
                            testID={`item-edit-notes-${index}`}
                          />
                          <View style={styles.itemEditActions}>
                            <TouchableOpacity
                              style={styles.itemEditCancelBtn}
                              onPress={cancelEditItem}
                              testID={`item-edit-cancel-${index}`}
                            >
                              <Text style={styles.itemEditCancelText}>Annulla</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={styles.itemEditSaveBtn}
                              onPress={saveEditItem}
                              testID={`item-edit-save-${index}`}
                            >
                              <Ionicons name="checkmark" size={16} color="#fff" />
                              <Text style={styles.itemEditSaveText}>Salva</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      ) : (
                        /* NORMAL ITEM ROW */
                        <>
                          <View style={styles.orderItemInfo}>
                            <View style={styles.orderItemNameRow}>
                              <Text style={styles.orderItemName}>{item.dishName}</Text>
                              {item.isCustomItem && (
                                <View style={styles.customItemBadge}>
                                  <Text style={styles.customItemBadgeText}>LIBERO</Text>
                                </View>
                              )}
                            </View>
                            {!!item.composition?.length && (
                              <Text style={styles.orderItemComposition} testID={`order-item-composition-${index}`}>
                                {compositionText(item.composition)}
                              </Text>
                            )}
                            {item.notes ? (
                              <Text style={styles.orderItemNotes}>📝 {item.notes}</Text>
                            ) : null}
                            <Text style={styles.orderItemDetails}>
                              {item.quantity} x {item.unitPrice.toFixed(2)} €
                            </Text>
                          </View>

                          {/* Item Status Icons */}
                          <View style={styles.itemStatusIcons}>
                            <TouchableOpacity
                              style={[
                                styles.itemStatusBtn,
                                item.sendToKitchen && styles.itemKitchenActive,
                              ]}
                              onPress={() => selectedOrder && handleToggleKitchen(index)}
                              testID={`item-kitchen-btn-${index}`}
                            >
                              <Ionicons
                                name="person"
                                size={22}
                                color={item.sendToKitchen ? '#fff' : '#FFBC0D'}
                              />
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={[
                                styles.itemStatusBtn,
                                item.itemStatus === 'ready' && styles.itemStatusBtnActive,
                                item.itemStatus === 'ready' && styles.itemStatusBtnReady,
                              ]}
                              onPress={() => selectedOrder && handleItemStatusChange(
                                selectedOrder.id, 
                                index, 
                                item.itemStatus === 'ready' ? 'pending' : 'ready'
                              )}
                            >
                              <Ionicons 
                                name="checkmark-circle" 
                                size={22} 
                                color={item.itemStatus === 'ready' ? '#fff' : '#00754A'} 
                              />
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={[
                                styles.itemStatusBtn,
                                item.itemStatus === 'problem' && styles.itemStatusBtnActive,
                                item.itemStatus === 'problem' && styles.itemStatusBtnProblem,
                              ]}
                              onPress={() => selectedOrder && handleItemStatusChange(
                                selectedOrder.id, 
                                index, 
                                item.itemStatus === 'problem' ? 'pending' : 'problem'
                              )}
                            >
                              <Ionicons 
                                name="alert-circle" 
                                size={22} 
                                color={item.itemStatus === 'problem' ? '#fff' : '#DB0007'} 
                              />
                            </TouchableOpacity>
                          </View>

                          <Text style={styles.orderItemSubtotal}>{item.subtotal.toFixed(2)} €</Text>

                          {/* Edit + Duplicate (only for today's orders) */}
                          {canEditOrderItems && (
                            <>
                              <TouchableOpacity
                                style={styles.itemActionBtn}
                                onPress={() => openEditItem(index)}
                                testID={`item-edit-btn-${index}`}
                              >
                                <Ionicons name="create-outline" size={18} color="#5423E7" />
                              </TouchableOpacity>
                              {item.isCustomItem && (
                                <TouchableOpacity
                                  style={styles.itemActionBtn}
                                  onPress={() => handleDuplicateCustomItem(index)}
                                  testID={`item-duplicate-btn-${index}`}
                                >
                                  <Ionicons name="copy-outline" size={18} color="#00754A" />
                                </TouchableOpacity>
                              )}
                            </>
                          )}

                          <TouchableOpacity
                            style={styles.removeItemButton}
                            onPress={() => handleRemoveItem(index)}
                          >
                            <Ionicons name="trash-outline" size={18} color="#DB0007" />
                          </TouchableOpacity>
                        </>
                      )}
                    </View>
                  ))
                )}

                <View style={styles.orderTotalRow}>
                  <Text style={styles.orderTotalLabel}>TOTALE</Text>
                  <Text style={styles.orderTotalValue}>
                    {selectedOrder?.total.toFixed(2)} €
                  </Text>
                </View>

                {/* Status Section */}
                {selectedOrder && (
                  <View style={styles.statusSection}>
                    <Text style={styles.statusSectionTitle}>Stato Ordine</Text>
                    <View style={[styles.currentStatusBadge, { backgroundColor: statusOf(selectedOrder.status).bg, borderColor: statusOf(selectedOrder.status).solid }]} testID="order-current-status">
                      <Text style={[styles.currentStatusText, { color: statusOf(selectedOrder.status).fg }]}>{STATUS_LABELS[selectedOrder.status]}</Text>
                    </View>
                    
                    <Text style={styles.changeStatusLabel}>Cambia stato:</Text>
                    <View style={styles.statusButtonsGrid}>
                      {ORDER_STATUSES.filter(s => s !== selectedOrder.status).map(status => (
                        <TouchableOpacity
                          key={status}
                          style={[styles.statusGridButton, { backgroundColor: statusOf(status).bg, borderColor: statusOf(status).bd }]}
                          onPress={() => handleUpdateStatus(selectedOrder.id, status)}
                          testID={`order-status-btn-${status}`}
                        >
                          <Text style={[styles.statusGridButtonText, { color: statusOf(status).fg }]}>{STATUS_LABELS[status]}</Text>
                        </TouchableOpacity>
                      ))}
                      {/* Pulsante Consegnato - sempre visibile, solo manuale */}
                      {selectedOrder.status !== 'consegnato' && (
                        <TouchableOpacity
                          style={[styles.statusGridButton, { backgroundColor: statusOf('consegnato').bg, borderColor: statusOf('consegnato').bd }]}
                          onPress={() => handleUpdateStatus(selectedOrder.id, 'consegnato')}
                          testID="order-status-btn-consegnato"
                        >
                          <Text style={[styles.statusGridButtonText, { color: statusOf('consegnato').fg }]}>Consegnato</Text>
                        </TouchableOpacity>
                      )}
                    </View>

                    {/* Payment Toggle - Compact chip style */}
                    <View style={styles.paymentSection}>
                      <TouchableOpacity 
                        style={[
                          styles.paymentChip,
                          selectedOrder.isPaid ? styles.paymentChipPaid : styles.paymentChipUnpaid
                        ]}
                        onPress={() => handleTogglePayment(selectedOrder)}
                      >
                        <Ionicons 
                          name="card" 
                          size={18} 
                          color={selectedOrder.isPaid ? "#00754A" : "#DB0007"} 
                        />
                        <Text style={[
                          styles.paymentChipText,
                          selectedOrder.isPaid ? styles.paymentChipTextPaid : styles.paymentChipTextUnpaid
                        ]}>
                          {selectedOrder.isPaid ? 'Pagato' : 'Da pagare'}
                        </Text>
                        <Ionicons name="chevron-forward" size={16} color="#475569" />
                      </TouchableOpacity>
                      
                      {/* Receipt Button */}
                      <View style={styles.receiptSection}>
                        {selectedOrder.receiptImage ? (
                          <View style={styles.receiptActions}>
                            {!showInlineReceipt ? (
                              <>
                                <TouchableOpacity 
                                  style={styles.receiptPreviewBtn}
                                  onPress={() => setShowInlineReceipt(true)}
                                >
                                  <Ionicons name="document-text" size={18} color="#00754A" />
                                  <Text style={styles.receiptPreviewText}>Scontrino</Text>
                                </TouchableOpacity>
                                <TouchableOpacity 
                                  style={styles.receiptDeleteBtn}
                                  onPress={handleDeleteReceipt}
                                >
                                  <Ionicons name="trash-outline" size={18} color="#DB0007" />
                                </TouchableOpacity>
                              </>
                            ) : (
                              <View style={styles.inlineReceiptContainer}>
                                <View style={styles.inlineReceiptHeader}>
                                  <Text style={styles.inlineReceiptTitle}>Scontrino</Text>
                                  <TouchableOpacity onPress={() => setShowInlineReceipt(false)}>
                                    <Ionicons name="close" size={20} color="#0F172A" />
                                  </TouchableOpacity>
                                </View>
                                <Image
                                  source={{ uri: selectedOrder.receiptImage }}
                                  style={styles.inlineReceiptImage}
                                  resizeMode="contain"
                                />
                                <TouchableOpacity 
                                  style={styles.receiptDeleteBtn}
                                  onPress={() => {
                                    handleDeleteReceipt();
                                    setShowInlineReceipt(false);
                                  }}
                                >
                                  <Ionicons name="trash-outline" size={18} color="#DB0007" />
                                  <Text style={{color: '#DB0007', marginLeft: 5}}>Elimina</Text>
                                </TouchableOpacity>
                              </View>
                            )}
                          </View>
                        ) : (
                          <TouchableOpacity 
                            style={styles.receiptCaptureBtn}
                            onPress={handleTakeReceiptPhoto}
                          >
                            <Ionicons name="camera" size={18} color="#2563EB" />
                            <Text style={styles.receiptCaptureText}>Allega Scontrino</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  </View>
                )}
              </Appear>

              {/* Menu Items Section - NOW SECOND */}
              {selectedOrder?.status !== 'annullato' && (
                <Appear index={2} style={styles.mobileSectionCard}>
                  <Text style={styles.sectionTitle}>Aggiungi dal Menu del Giorno</Text>
                  <Text style={styles.sectionSubtitle}>Tocca un piatto per selezionarlo</Text>
                  
                  {/* Category Filter */}
                  <ChipScroller style={styles.menuCategoryFilter} testID="order-menu-category-filter">
                    <TouchableOpacity
                      style={[styles.menuCategoryChip, !selectedCategoryFilter && styles.menuCategoryChipActive]}
                      onPress={() => setSelectedCategoryFilter(null)}
                    >
                      <Text style={[styles.menuCategoryChipText, !selectedCategoryFilter && styles.menuCategoryChipTextActive]}>
                        Tutte
                      </Text>
                    </TouchableOpacity>
                    {sortedCategories.map((category) => (
                      <TouchableOpacity
                        key={category.id}
                        style={[styles.menuCategoryChip, selectedCategoryFilter === category.id && styles.menuCategoryChipActive]}
                        onPress={() => setSelectedCategoryFilter(selectedCategoryFilter === category.id ? null : category.id)}
                      >
                        <Text style={[styles.menuCategoryChipText, selectedCategoryFilter === category.id && styles.menuCategoryChipTextActive]}>
                          {category.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ChipScroller>

                  {/* Pulsante Piatto Libero */}
                  {!showInlineCustomItem ? (
                    <TouchableOpacity 
                      style={[
                        styles.customItemButton,
                        Platform.OS === 'web' && { cursor: 'pointer' } as any,
                      ]}
                      onPress={() => setShowInlineCustomItem(true)}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="create-outline" size={18} color="#ffffff" />
                      <Text style={styles.customItemButtonText}>Piatto Libero</Text>
                    </TouchableOpacity>
                  ) : (
                    <View style={styles.inlineCustomItemForm}>
                      <View style={styles.inlineFormHeader}>
                        <Text style={styles.inlineFormTitle}>Piatto Libero</Text>
                        <TouchableOpacity onPress={() => {
                          setShowInlineCustomItem(false);
                          setCustomItemName('');
                          setCustomItemPrice('');
                          setCustomItemQuantity('1');
                        }}>
                          <Ionicons name="close" size={20} color="#0F172A" />
                        </TouchableOpacity>
                      </View>
                      <TextInput
                        style={styles.inlineFormInput}
                        value={customItemName}
                        onChangeText={setCustomItemName}
                        placeholder="Nome piatto"
                        placeholderTextColor="#94A3B8"
                      />
                      <View style={styles.inlineFormRow}>
                        <TextInput
                          style={[styles.inlineFormInput, { flex: 1 }]}
                          value={customItemPrice}
                          onChangeText={setCustomItemPrice}
                          placeholder="Prezzo €"
                          placeholderTextColor="#94A3B8"
                          keyboardType="decimal-pad"
                        />
                        <View style={styles.inlineQuantityControl}>
                          <TouchableOpacity
                            style={styles.inlineQtyBtn}
                            onPress={() => setCustomItemQuantity(Math.max(1, parseInt(customItemQuantity || '1') - 1).toString())}
                          >
                            <Ionicons name="remove" size={18} color="#0F172A" />
                          </TouchableOpacity>
                          <Text style={styles.inlineQtyText}>{customItemQuantity}</Text>
                          <TouchableOpacity
                            style={styles.inlineQtyBtn}
                            onPress={() => setCustomItemQuantity((parseInt(customItemQuantity || '1') + 1).toString())}
                          >
                            <Ionicons name="add" size={18} color="#0F172A" />
                          </TouchableOpacity>
                        </View>
                      </View>
                      <TouchableOpacity
                        style={styles.inlineAddBtn}
                        onPress={async () => {
                          if (!selectedOrder || !customItemName.trim() || !customItemPrice) {
                            showToast('Inserisci nome e prezzo', 'error');
                            return;
                          }
                          try {
                            const price = parseFloat(customItemPrice.replace(',', '.'));
                            const qty = parseInt(customItemQuantity) || 1;
                            const updatedOrder = await ordersApi.addItem(selectedOrder.id, {
                              dishName: customItemName.trim(),
                              quantity: qty,
                              customPrice: price,
                            });
                            setOrders(orders.map(o => o.id === updatedOrder.id ? updatedOrder : o));
                            setSelectedOrder(updatedOrder);
                            showToast(`${customItemName} aggiunto`);
                            setShowInlineCustomItem(false);
                            setCustomItemName('');
                            setCustomItemPrice('');
                            setCustomItemQuantity('1');
                          } catch (error: any) {
                            showToast(error.response?.data?.detail || 'Errore', 'error');
                          }
                        }}
                      >
                        <Ionicons name="add-circle" size={18} color="#fff" />
                        <Text style={styles.inlineAddBtnText}>Aggiungi</Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  {(() => {
                    // Filter menu items by selected category
                    const filteredItems = currentMenu?.items.filter(item => 
                      !selectedCategoryFilter || item.categoryId === selectedCategoryFilter
                    ) || [];
                    
                    // Group filtered items by category
                    const groupedItems = filteredItems.reduce((acc, item) => {
                      const catName = item.categoryName || 'Altro';
                      if (!acc[catName]) acc[catName] = [];
                      acc[catName].push(item);
                      return acc;
                    }, {} as Record<string, typeof filteredItems>);
                    
                    if (filteredItems.length === 0) {
                      return (
                        <Text style={styles.emptyMenuText}>Nessun piatto disponibile</Text>
                      );
                    }
                    
                    return Object.entries(groupedItems).map(([categoryName, items]) => (
                      <View key={categoryName}>
                        <Text style={styles.menuCategoryTitle}>{categoryName}</Text>
                        {items.map((item, index) => {
                          const itemGroups = groupsForDish(dishMap[item.dishId], optionGroups);
                          const isSelected = selectedMenuItem?.dishId === item.dishId;
                          return (
                          <React.Fragment key={`menu-${item.dishId}-${index}`}>
                          <TouchableOpacity
                            style={[
                              styles.menuItemCard,
                              isSelected && styles.menuItemCardSelected,
                              item.portions === 0 && styles.menuItemCardDisabled,
                            ]}
                            onPress={() => {
                              if (item.portions <= 0) return;
                              setComposerSel({});
                              setSelectedMenuItem(isSelected ? null : item);
                            }}
                            disabled={item.portions === 0}
                            testID={`order-menu-item-${item.dishId}`}
                          >
                            <View style={styles.menuItemInfo}>
                              <Text style={styles.menuItemName}>{item.dishName}</Text>
                              {itemGroups.length > 0 ? (
                                <Text style={styles.menuItemPrice}>Componi · {itemGroups.map((g) => g.name).join(' + ')}</Text>
                              ) : (
                                <Text style={styles.menuItemPrice}>{item.dailyPrice.toFixed(2)} €</Text>
                              )}
                            </View>
                            <View style={[
                              styles.portionsBadge,
                              item.portions === 0 && styles.portionsBadgeEmpty,
                              item.portions > 0 && item.portions <= 3 && styles.portionsBadgeLow,
                            ]}>
                              <Text style={styles.portionsText}>
                                {item.portions === 0 ? 'Esaurito' : `${item.portions} porz.`}
                              </Text>
                            </View>
                            {isSelected && (
                              <Animated.View entering={ZoomIn.springify().damping(10).stiffness(260)} style={styles.selectedCheckmark}>
                                <Ionicons name="checkmark-circle" size={24} color="#00754A" />
                              </Animated.View>
                            )}
                          </TouchableOpacity>
                          </React.Fragment>
                          );
                        })}
                      </View>
                    ));
                  })()}
                </Appear>
              )}
            </ScrollView>

            {/* FIXED FOOTER - Appears when item is selected */}
            {selectedMenuItem && (
              <Animated.View entering={SlideInDown.springify().damping(20).stiffness(200)} style={styles.fixedFooter} testID="order-fixed-footer">
                <View style={styles.footerSelectedItem}>
                  <Text style={styles.footerItemName} numberOfLines={1}>
                    {selectedMenuItem.dishName}
                  </Text>
                  <View style={styles.footerItemRight}>
                    <Text style={styles.footerItemPrice} testID="order-footer-price">
                      {selectionError(groupsForDish(dishMap[selectedMenuItem.dishId], optionGroups), composerSel)
                        ? `da ${euro(fromPrice(selectedMenuItem.dailyPrice, groupsForDish(dishMap[selectedMenuItem.dishId], optionGroups), selectedMenuItem.unavailableOptionIds))}`
                        : euro(selectedMenuItem.dailyPrice + selectionExtra(groupsForDish(dishMap[selectedMenuItem.dishId], optionGroups), composerSel))}
                    </Text>
                    <Text style={styles.footerAvailableText}>
                      disp. {selectedMenuItem.portions}
                    </Text>
                  </View>
                </View>
                {/* Piatto componibile: scelte dentro il footer, sempre visibili */}
                {groupsForDish(dishMap[selectedMenuItem.dishId], optionGroups).length > 0 && (
                  <ScrollView style={styles.footerComposerScroll} nestedScrollEnabled keyboardShouldPersistTaps="handled">
                    <DishComposer
                      groups={groupsForDish(dishMap[selectedMenuItem.dishId], optionGroups)}
                      value={composerSel}
                      onChange={setComposerSel}
                      unavailable={selectedMenuItem.unavailableOptionIds || []}
                    />
                  </ScrollView>
                )}
                {/* Footer Controls - Layout verticale per mobile */}
                <View style={styles.footerControlsVertical}>
                  {/* Prima riga: Prezzo e Quantità */}
                  <View style={styles.footerRow}>
                    <View style={styles.footerPriceBox}>
                      <Text style={styles.footerPriceLabel}>Prezzo €</Text>
                      <TextInput
                        style={styles.footerPriceInput}
                        value={itemCustomPrice}
                        onChangeText={setItemCustomPrice}
                        placeholder={(selectedMenuItem.dailyPrice + selectionExtra(groupsForDish(dishMap[selectedMenuItem.dishId], optionGroups), composerSel)).toFixed(2)}
                        placeholderTextColor="#94A3B8"
                        keyboardType="decimal-pad"
                      />
                    </View>
                    <View style={styles.footerQuantityBox}>
                      <Text style={styles.footerQuantityLabel}>Qtà</Text>
                      <View style={styles.footerQuantityControls}>
                        <TouchableOpacity
                          style={[
                            styles.footerQtyBtn,
                            parseInt(itemQuantity) <= 1 && styles.footerQtyBtnDisabled
                          ]}
                          onPress={() => setItemQuantity(Math.max(1, parseInt(itemQuantity) - 1).toString())}
                          disabled={parseInt(itemQuantity) <= 1}
                        >
                          <Ionicons name="remove" size={18} color={parseInt(itemQuantity) <= 1 ? '#666' : '#fff'} />
                        </TouchableOpacity>
                        <Text style={styles.footerQtyText}>{itemQuantity}</Text>
                        <TouchableOpacity
                          style={[
                            styles.footerQtyBtn,
                            parseInt(itemQuantity) >= selectedMenuItem.portions && styles.footerQtyBtnDisabled
                          ]}
                          onPress={() => setItemQuantity(Math.min(selectedMenuItem.portions, parseInt(itemQuantity) + 1).toString())}
                          disabled={parseInt(itemQuantity) >= selectedMenuItem.portions}
                        >
                          <Ionicons name="add" size={18} color={parseInt(itemQuantity) >= selectedMenuItem.portions ? '#666' : '#fff'} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                  {/* Campo Note */}
                  <TextInput
                    style={styles.footerNotesInput}
                    value={itemNotes}
                    onChangeText={setItemNotes}
                    placeholder="Note (es: senza sale, ben cotto...)"
                    placeholderTextColor="#94A3B8"
                  />
                  {/* Piatto componibile: cosa manca ancora */}
                  {!!selectionError(groupsForDish(dishMap[selectedMenuItem.dishId], optionGroups), composerSel) && (
                    <Text style={styles.footerComposerError} testID="order-composer-error">
                      {selectionError(groupsForDish(dishMap[selectedMenuItem.dishId], optionGroups), composerSel)}
                    </Text>
                  )}
                  {/* Seconda riga: Pulsante Aggiungi */}
                  <TouchableOpacity
                    style={[styles.footerAddButtonFull, !!selectionError(groupsForDish(dishMap[selectedMenuItem.dishId], optionGroups), composerSel) && { opacity: 0.5 }]}
                    onPress={handleAddItem}
                    disabled={!!selectionError(groupsForDish(dishMap[selectedMenuItem.dishId], optionGroups), composerSel)}
                    testID="order-confirm-dish-btn"
                  >
                    <Ionicons name="checkmark-circle" size={22} color="#fff" />
                    <Text style={styles.footerAddButtonText}>Conferma Piatto</Text>
                  </TouchableOpacity>
                </View>
              </Animated.View>
            )}
          </View>
        </SafeAreaView>
      </Modal>

      {/* Custom Item Modal - Piatto Libero */}
      <Modal visible={showCustomItemModal} animationType="fade" transparent>
        <View style={styles.customItemModalOverlay}>
          <ModalSheet style={styles.customItemModalContent}>
            <View style={styles.customItemModalHeader}>
              <Text style={styles.customItemModalTitle}>Piatto Libero</Text>
              <TouchableOpacity onPress={() => setShowCustomItemModal(false)}>
                <Ionicons name="close" size={24} color="#0F172A" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.customItemModalBody}>
              <Text style={styles.customItemLabel}>Nome piatto</Text>
              <TextInput
                style={styles.customItemInput}
                value={customItemName}
                onChangeText={setCustomItemName}
                placeholder="Es: Piatto speciale del cliente"
                placeholderTextColor="#94A3B8"
              />
              
              <View style={styles.customItemRow}>
                <View style={styles.customItemField}>
                  <Text style={styles.customItemLabel}>Prezzo (€)</Text>
                  <TextInput
                    style={styles.customItemInput}
                    value={customItemPrice}
                    onChangeText={setCustomItemPrice}
                    placeholder="0.00"
                    placeholderTextColor="#94A3B8"
                    keyboardType="decimal-pad"
                  />
                </View>
                <View style={styles.customItemField}>
                  <Text style={styles.customItemLabel}>Quantità</Text>
                  <View style={styles.customItemQuantityRow}>
                    <TouchableOpacity
                      style={styles.customItemQuantityBtn}
                      onPress={() => setCustomItemQuantity(Math.max(1, parseInt(customItemQuantity) - 1).toString())}
                    >
                      <Ionicons name="remove" size={20} color="#fff" />
                    </TouchableOpacity>
                    <Text style={styles.customItemQuantityText}>{customItemQuantity}</Text>
                    <TouchableOpacity
                      style={styles.customItemQuantityBtn}
                      onPress={() => setCustomItemQuantity((parseInt(customItemQuantity) + 1).toString())}
                    >
                      <Ionicons name="add" size={20} color="#fff" />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
              
              <TouchableOpacity 
                style={styles.customItemAddBtn}
                onPress={handleAddCustomItem}
              >
                <Ionicons name="add-circle" size={22} color="#fff" />
                <Text style={styles.customItemAddBtnText}>Aggiungi all'ordine</Text>
              </TouchableOpacity>
            </View>
          </ModalSheet>
        </View>
      </Modal>

      {/* Receipt Preview Modal */}
      <Modal visible={showReceiptPreview} animationType="fade" transparent>
        <View style={styles.receiptModalOverlay}>
          <ModalSheet style={styles.receiptModalContent}>
            <View style={styles.receiptModalHeader}>
              <Text style={styles.receiptModalTitle}>Scontrino</Text>
              <TouchableOpacity 
                style={styles.receiptModalCloseBtn}
                onPress={() => setShowReceiptPreview(false)}
              >
                <Ionicons name="close" size={24} color="#0F172A" />
              </TouchableOpacity>
            </View>
            {selectedOrder?.receiptImage && (
              <Image
                source={{ uri: selectedOrder.receiptImage }}
                style={styles.receiptImage}
                resizeMode="contain"
              />
            )}
          </ModalSheet>
        </View>
      </Modal>

      {/* OP06: Portions Dashboard Modal */}
      <Modal visible={showPortionsModal} animationType="fade" transparent>
        <View style={styles.portionsModalOverlay}>
          <ModalSheet style={styles.portionsModalContent}>
            <View style={styles.portionsModalHeader}>
              <Text style={styles.portionsModalTitle}>Porzioni Disponibili</Text>
              <TouchableOpacity 
                style={styles.portionsModalCloseBtn}
                onPress={() => setShowPortionsModal(false)}
              >
                <Ionicons name="close" size={24} color="#0F172A" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.portionsModalBody}>
              {currentMenu?.items?.map((item, index) => (
                <View key={`portion-${item.dishId}-${index}`} style={styles.portionItem}>
                  <View style={styles.portionItemInfo}>
                    <Text style={styles.portionItemName}>{item.dishName}</Text>
                    {item.categoryName && (
                      <Text style={styles.portionItemCategory}>{item.categoryName}</Text>
                    )}
                  </View>
                  <View style={[
                    styles.portionItemBadge,
                    item.portions === 0 && styles.portionItemBadgeEmpty,
                    item.portions > 0 && item.portions <= 3 && styles.portionItemBadgeLow,
                  ]}>
                    <Text style={styles.portionItemBadgeText}>
                      {item.portions}/{item.initialPortions || item.portions}
                    </Text>
                  </View>
                </View>
              ))}
            </ScrollView>
          </ModalSheet>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  skeletonCounter: {
    flex: 1,
    height: 72,
    borderRadius: R.lg,
  },
  skeletonCounters: {
    flexDirection: 'row',
    gap: 12,
  },
  skeletonHeader: {
    height: 64,
    borderRadius: R.lg,
  },
  skeletonWrap: {
    flex: 1,
    padding: 24,
    gap: 16,
  },
  ordersGridFull: {
    width: '100%',
  },
  ordersGridCell: {
    paddingHorizontal: 7,
    paddingBottom: 14,
  },
  ordersGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingBottom: 40,
  },
  ordersSearchContainerCompact: {
    maxWidth: '100%',
    flexBasis: '100%',
  },
  compactButtonPrimaryText: {
    fontFamily: FONT,
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
  },
  compactButtonText: {
    fontFamily: FONT,
    color: C.green,
    fontSize: 14,
    fontWeight: '700',
  },
  panelCountText: {
    fontFamily: FONT,
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
  },
  panelCount: {
    minWidth: 30,
    height: 26,
    borderRadius: 13,
    backgroundColor: C.navy,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 9,
  },
  panelTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  panelHeaderCompact: {
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 12,
  },
  contentCompact: {
    paddingHorizontal: 14,
    paddingTop: 12,
  },
  container: {
    flex: 1,
    backgroundColor: C.canvas,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontFamily: FONT,
    color: '#0F172A',
    marginTop: 10,
    fontSize: 16,
  },
  header: {
    padding: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 8,
  },
  headerLogo: {
    width: 38,
    height: 38,
    borderRadius: 9,
  },
  headerTitle: {
    fontFamily: FONT,
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0F172A',
    textAlign: 'center',
  },
  syncIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginLeft: 8,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  syncDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#9CA3AF',
  },
  syncDotFresh: {
    backgroundColor: '#00754A',
  },
  syncDotStale: {
    backgroundColor: '#FFBC0D',
  },
  syncDotError: {
    backgroundColor: '#DB0007',
  },
  syncLabel: {
    fontFamily: FONT,
    fontSize: 11,
    color: '#475569',
    fontWeight: '600',
  },
  syncLabelError: {
    color: '#DB0007',
    fontWeight: '700',
  },
  dateSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  dateButton: {
    padding: 8,
  },
  dateText: {
    fontFamily: FONT,
    fontSize: 18,
    color: '#DB0007',
    fontWeight: '600',
    marginHorizontal: 16,
    textTransform: 'capitalize',
  },
  statsBar: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontFamily: FONT,
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  statValueActive: {
    color: '#DB0007',
  },
  statLabel: {
    fontFamily: FONT,
    fontSize: 12,
    color: '#475569',
    marginTop: 4,
  },
  statLabelActive: {
    color: '#0F172A',
  },
  filterStatItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 8,
    marginHorizontal: 2,
    borderLeftWidth: 3,
    borderLeftColor: 'transparent',
  },
  filterStatItemActive: {
    backgroundColor: '#E2E8F0',
  },
  modalHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  printButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: C.blue,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteOrderButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: C.brandSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Delete confirmation panel styles
  deleteConfirmPanel: {
    backgroundColor: '#FFF1F1',
    borderWidth: 2,
    borderColor: '#DB0007',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 12,
  },
  deleteConfirmContent: {
    alignItems: 'center',
  },
  deleteConfirmTitle: {
    fontFamily: FONT,
    color: '#DB0007',
    fontSize: 18,
    fontWeight: '700',
    marginTop: 8,
    marginBottom: 8,
  },
  deleteConfirmText: {
    fontFamily: FONT,
    color: '#0F172A',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 20,
  },
  deleteConfirmButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  deleteConfirmCancelBtn: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
  },
  deleteConfirmCancelText: {
    fontFamily: FONT,
    color: '#475569',
    fontSize: 14,
    fontWeight: '600',
  },
  deleteConfirmDeleteBtn: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#DB0007',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  deleteConfirmDeleteText: {
    fontFamily: FONT,
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 18,
  },
  ordersPanel: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    overflow: 'hidden',
  },
  panelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 16,
  },
  panelTitle: {
    fontFamily: FONT,
    fontSize: 22,
    fontWeight: '800',
    color: C.text,
    letterSpacing: -0.5,
  },
  newOrderButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DB0007',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  disabledButton: {
    backgroundColor: C.borderStrong,
    shadowOpacity: 0,
  },
  newOrderButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    marginLeft: 8,
  },
  ordersList: {
    flex: 1,
    marginHorizontal: -7,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyStateText: {
    fontFamily: FONT,
    color: '#475569',
    fontSize: 16,
    marginTop: 12,
  },
  emptyStateSubtext: {
    fontFamily: FONT,
    color: '#94a3b8',
    fontSize: 14,
    marginTop: 4,
  },
  orderCard: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.10,
    shadowRadius: 3,
    elevation: 2,
  },
  orderCardSelected: {
    borderColor: '#DB0007',
  },
  orderCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  orderCardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardPrintButton: {
    padding: 6,
    backgroundColor: '#EEF4FF',
    borderRadius: 6,
  },
  orderCardTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  customerNameHeader: {
    fontFamily: FONT,
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  orderNumberSmall: {
    fontFamily: FONT,
    fontSize: 13,
    fontWeight: '500',
    color: '#475569',
  },
  orderNumber: {
    fontFamily: FONT,
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  serviceTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEF4FF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 8,
    gap: 3,
  },
  serviceTypeText: {
    fontFamily: FONT,
    color: '#2563EB',
    fontSize: 10,
    fontWeight: '600',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontFamily: FONT,
    color: '#0F172A',
    fontSize: 12,
    fontWeight: '600',
  },
  orderCardBody: {
    marginBottom: 10,
  },
  orderInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  orderInfoText: {
    fontFamily: FONT,
    color: '#475569',
    marginLeft: 8,
    fontSize: 14,
  },
  customerName: {
    fontFamily: FONT,
    color: '#0F172A',
    fontSize: 14,
    marginTop: 4,
  },
  orderItems: {
    fontFamily: FONT,
    color: '#475569',
    fontSize: 13,
    marginTop: 4,
  },
  orderItemsList: {
    marginTop: 6,
    paddingLeft: 4,
  },
  orderItemLine: {
    fontFamily: FONT,
    color: '#334155',
    fontSize: 13,
    lineHeight: 18,
  },
  orderItemNoteInline: {
    fontFamily: FONT,
    color: '#2563EB',
    fontStyle: 'italic',
    fontSize: 12,
  },
  orderDeliveryTime: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
    backgroundColor: '#FFF7DF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  orderDeliveryTimeText: {
    fontFamily: FONT,
    color: '#FFBC0D',
    fontSize: 12,
    fontWeight: '700',
  },
  orderNotesBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
    backgroundColor: '#EEF4FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderLeftWidth: 3,
    borderLeftColor: '#2563EB',
  },
  orderNotesText: {
    fontFamily: FONT,
    color: '#334155',
    fontSize: 12,
    fontStyle: 'italic',
    flex: 1,
  },
  // Order header info section
  orderHeaderInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  editHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#EEF4FF',
    borderRadius: 8,
  },
  editHeaderBtnText: {
    fontFamily: FONT,
    color: '#2563EB',
    fontSize: 13,
    fontWeight: '600',
  },
  orderHeaderInfoLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginVertical: 4,
  },
  orderHeaderInfoLabel: {
    fontFamily: FONT,
    color: '#475569',
    fontSize: 13,
  },
  orderHeaderInfoValue: {
    fontFamily: FONT,
    color: '#0F172A',
    fontSize: 14,
    fontWeight: '500',
  },
  editCustomerRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  pickCustomerBtn: {
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
  },
  editHeaderActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  editHeaderCancelBtn: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 8,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
  },
  editHeaderCancelText: {
    fontFamily: FONT,
    color: '#0F172A',
    fontWeight: '600',
    fontSize: 14,
  },
  editHeaderSaveBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 11,
    borderRadius: 8,
    backgroundColor: '#00754A',
  },
  editHeaderSaveText: {
    fontFamily: FONT,
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 14,
  },
  timeTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  timeTriggerText: {
    fontFamily: FONT,
    color: '#0F172A',
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  timeTriggerPlaceholder: {
    color: '#475569',
    fontWeight: '400',
  },
  ordersSearchContainer: {
    flex: 1,
    maxWidth: 520,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.surface,
    borderRadius: R.pill,
    paddingHorizontal: 16,
    height: 44,
    borderWidth: 1,
    borderColor: C.border,
    ...elevation(1),
  },
  ordersSearchInput: {
    fontFamily: FONT,
    flex: 1,
    color: C.text,
    fontSize: 14,
    fontWeight: '500',
    paddingVertical: 10,
    marginLeft: 8,
    ...Platform.select({ web: { outlineStyle: 'none' } as any }),
  },
  orderCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingTop: 10,
  },
  orderTotal: {
    fontFamily: FONT,
    fontSize: 18,
    fontWeight: 'bold',
    color: '#00754A',
  },
  orderTime: {
    fontFamily: FONT,
    color: '#475569',
    fontSize: 13,
  },
  modalOverlay: {
    ...Platform.select({ web: { backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' } as any }),
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      web: {
        position: 'fixed' as any,
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 99999,
      },
    }),
  },
  mobileModalOverlay: {
    backgroundColor: '#F1F5F9',
    justifyContent: 'flex-start',
    alignItems: 'stretch',
  },
  fullScreenModal: {
    flex: 1,
    backgroundColor: C.canvas,
  },
  fullScreenModalContent: {
    flex: 1,
    width: '100%',
    maxWidth: 1100,
    alignSelf: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: R.xl,
    padding: 24,
    width: '92%',
    maxWidth: 540,
    maxHeight: '86%',
    ...elevation(3),
    ...Platform.select({ web: { zIndex: 100000 } }),
  },
  newOrderScroll: {
    flexGrow: 0,
    flexShrink: 1,
  },
  newOrderScrollContent: {
    paddingBottom: 8,
  },
  newOrderFooterButton: {
    marginTop: 12,
  },
  largeModal: {
    maxWidth: 900,
    width: '95%',
    maxHeight: '90%',
  },
  mobileModal: {
    flex: 1,
    width: '100%',
    maxWidth: '100%',
    maxHeight: '100%',
    borderRadius: 0,
    padding: 0,
    paddingHorizontal: 12,
    paddingTop: 8,
    backgroundColor: '#F1F5F9',
  },
  modalScrollContent: {
    flex: 1,
  },
  modalScrollContentContainer: {
    paddingBottom: 100,
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: C.navy,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mobileSectionCard: {
    backgroundColor: '#ffffff',
    borderRadius: R.lg,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: C.border,
    ...elevation(1),
  },
  emptyOrderText: {
    fontFamily: FONT,
    color: '#475569',
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 16,
  },
  statusButtonsVertical: {
    marginTop: 16,
    gap: 10,
  },
  statusButtonFull: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  modalHeaderInfo: {
    flex: 1,
  },
  modalTitle: {
    fontFamily: FONT,
    fontSize: 22,
    fontWeight: '800',
    color: C.text,
    letterSpacing: -0.4,
  },
  modalServiceType: {
    fontFamily: FONT,
    fontSize: 16,
    fontWeight: '500',
    color: '#2563EB',
  },
  modalCustomerName: {
    fontFamily: FONT,
    fontSize: 15,
    fontWeight: '700',
    color: C.brand,
    marginTop: 4,
  },
  inputLabel: {
    fontFamily: FONT,
    color: C.text2,
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 8,
    marginTop: 18,
  },
  channelSelector: {
    flexDirection: 'row',
    gap: 12,
  },
  channelButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 8,
    backgroundColor: C.sunken,
    borderRadius: R.lg,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  channelButtonActive: {
    borderColor: C.brand,
    backgroundColor: C.brandSoft,
  },
  channelButtonText: {
    fontFamily: FONT,
    color: C.text2,
    marginTop: 8,
    fontSize: 13,
    fontWeight: '600',
  },
  channelButtonTextActive: {
    color: C.text,
    fontWeight: '800',
  },
  // Service Type Selector
  serviceTypeSelector: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  serviceTypeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    backgroundColor: C.sunken,
    borderRadius: R.md,
    borderWidth: 2,
    borderColor: 'transparent',
    gap: 6,
    minHeight: 44,
  },
  serviceTypeButtonActive: {
    borderColor: C.blue,
    backgroundColor: C.blueSoft,
  },
  serviceTypeButtonText: {
    fontFamily: FONT,
    color: C.text2,
    fontSize: 12,
    fontWeight: '600',
  },
  serviceTypeButtonTextActive: {
    color: '#0F172A',
    fontWeight: '700',
  },
  customerSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: C.sunken,
    padding: 14,
    borderRadius: R.md,
    borderWidth: 1,
    borderColor: C.border,
  },
  customerSelectorText: {
    fontFamily: FONT,
    color: '#0F172A',
    fontSize: 15,
  },
  // Inline customer picker styles
  inlineCustomerPicker: {
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    maxHeight: 250,
    overflow: 'hidden',
  },
  inlinePickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  inlineSearchInput: {
    fontFamily: FONT,
    flex: 1,
    backgroundColor: '#E2E8F0',
    color: '#0F172A',
    padding: 10,
    borderRadius: 8,
    fontSize: 14,
  },
  inlineCloseBtn: {
    marginLeft: 10,
    padding: 5,
  },
  inlineCustomerList: {
    maxHeight: 180,
  },
  newCustomerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    backgroundColor: '#E8F6EF',
  },
  newCustomerOptionText: {
    fontFamily: FONT,
    color: '#00754A',
    fontSize: 14,
    fontWeight: '700',
  },
  customerOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  customerOptionSelected: {
    backgroundColor: '#E2E8F0',
  },
  customerOptionText: {
    fontFamily: FONT,
    color: '#0F172A',
    fontSize: 14,
  },
  textInput: {
    fontFamily: FONT,
    backgroundColor: C.sunken,
    color: C.text,
    padding: 14,
    borderRadius: R.md,
    fontSize: 15,
    minHeight: 64,
    borderWidth: 1,
    borderColor: C.border,
  },
  primaryButton: {
    backgroundColor: C.brand,
    paddingVertical: 16,
    borderRadius: R.pill,
    alignItems: 'center',
    marginTop: 20,
    shadowColor: C.brand,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 6,
  },
  primaryButtonText: {
    fontFamily: FONT,
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  customerList: {
    maxHeight: 400,
  },
  customerItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  customerItemText: {
    fontFamily: FONT,
    color: '#0F172A',
    fontSize: 16,
  },
  customerItemSubtext: {
    fontFamily: FONT,
    color: '#475569',
    fontSize: 13,
    marginTop: 4,
  },
  orderDetailContainer: {
    flex: 1,
    flexDirection: 'row',
    gap: 16,
  },
  orderDetailContainerMobile: {
    flexDirection: 'column',
    gap: 16,
  },
  menuItemsSection: {
    flex: 1,
  },
  menuItemsSectionMobile: {
    flex: 0,
    minHeight: 200,
  },
  orderSummarySection: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    padding: 16,
  },
  orderSummarySectionMobile: {
    flex: 0,
    marginTop: 8,
  },
  sectionTitle: {
    fontFamily: FONT,
    fontSize: 17,
    fontWeight: '800',
    color: C.text,
    marginBottom: 12,
    letterSpacing: -0.3,
  },
  menuCategoryFilter: {
    marginBottom: 12,
    marginHorizontal: -4,
  },
  menuCategoryChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: C.sunken,
    borderRadius: R.pill,
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: C.border,
  },
  menuCategoryChipActive: {
    backgroundColor: C.navy,
    borderColor: C.navy,
  },
  menuCategoryChipText: {
    fontFamily: FONT,
    color: C.text2,
    fontSize: 13,
    fontWeight: '600',
  },
  menuCategoryChipTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  emptyMenuText: {
    fontFamily: FONT,
    color: '#475569',
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 20,
  },
  menuCategoryTitle: {
    fontFamily: FONT,
    fontSize: 12,
    fontWeight: '800',
    color: C.brand,
    marginTop: 16,
    marginBottom: 8,
    paddingLeft: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  menuItemsList: {
    flex: 1,
  },
  menuItemCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: C.surface,
    padding: 14,
    borderRadius: R.md,
    marginBottom: 8,
    borderWidth: 1.5,
    borderColor: C.border,
  },
  menuItemCardSelected: {
    borderColor: C.brand,
    backgroundColor: C.brandSoft,
  },
  menuItemCardDisabled: {
    opacity: 0.5,
  },
  menuItemInfo: {
    flex: 1,
  },
  menuItemName: {
    fontFamily: FONT,
    color: C.text,
    fontSize: 15,
    fontWeight: '700',
  },
  menuItemPrice: {
    fontFamily: FONT,
    color: C.green,
    fontSize: 14,
    fontWeight: '700',
    marginTop: 3,
  },
  portionsBadge: {
    backgroundColor: C.greenSoft,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: R.pill,
  },
  portionsBadgeEmpty: {
    backgroundColor: C.brandSoft,
  },
  portionsBadgeLow: {
    backgroundColor: C.yellowSoft,
  },
  portionsText: {
    fontFamily: FONT,
    color: C.text,
    fontSize: 12,
    fontWeight: '800',
  },
  addItemForm: {
    backgroundColor: '#E2E8F0',
    padding: 12,
    borderRadius: 10,
    marginTop: 10,
  },
  selectedItemText: {
    fontFamily: FONT,
    color: '#0F172A',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  quantityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 10,
  },
  quantityButton: {
    backgroundColor: '#DB0007',
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityInput: {
    fontFamily: FONT,
    backgroundColor: '#F1F5F9',
    color: '#0F172A',
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    width: 60,
    height: 44,
    borderRadius: 10,
  },
  addItemButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#00754A',
    padding: 14,
    borderRadius: 10,
    marginTop: 0,
  },
  addItemButtonText: {
    fontFamily: FONT,
    color: '#ffffff',
    fontWeight: '700',
    marginLeft: 8,
    fontSize: 15,
  },
  orderItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  orderItemInfo: {
    flex: 1,
  },
  orderItemComposition: {
    fontFamily: FONT,
    fontSize: 13,
    fontWeight: '700',
    color: '#00754A',
    marginTop: 2,
  },
  footerComposerScroll: {
    maxHeight: 320,
  },
  footerComposerError: {
    fontFamily: FONT,
    color: '#B45309',
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  orderItemName: {
    fontFamily: FONT,
    color: '#0F172A',
    fontSize: 14,
  },
  orderItemDetails: {
    fontFamily: FONT,
    color: '#475569',
    fontSize: 12,
    marginTop: 2,
  },
  orderItemNotes: {
    fontFamily: FONT,
    color: C.amber,
    fontSize: 12,
    fontStyle: 'italic',
    marginTop: 2,
  },
  orderItemSubtotal: {
    fontFamily: FONT,
    color: '#00754A',
    fontSize: 14,
    fontWeight: '600',
    marginRight: 12,
  },
  removeItemButton: {
    padding: 8,
  },
  itemActionBtn: {
    padding: 8,
  },
  orderItemNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  customItemBadge: {
    backgroundColor: '#5423E7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  customItemBadgeText: {
    fontFamily: FONT,
    color: '#fff',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  itemEditForm: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#5423E7',
  },
  itemEditLabel: {
    fontFamily: FONT,
    fontSize: 11,
    color: '#475569',
    fontWeight: '600',
    marginBottom: 4,
    marginTop: 6,
  },
  itemEditInput: {
    fontFamily: FONT,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 14,
    color: '#0F172A',
  },
  itemEditTextarea: {
    minHeight: 50,
    textAlignVertical: 'top',
  },
  itemEditRow: {
    flexDirection: 'row',
    gap: 10,
  },
  itemEditCol: {
    flex: 1,
  },
  itemEditActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 12,
  },
  itemEditCancelBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  itemEditCancelText: {
    fontFamily: FONT,
    color: '#475569',
    fontSize: 13,
    fontWeight: '600',
  },
  itemEditSaveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: '#00754A',
  },
  itemEditSaveText: {
    fontFamily: FONT,
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  orderTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
    marginTop: 8,
    borderTopWidth: 2,
    borderTopColor: '#E2E8F0',
  },
  orderTotalLabel: {
    fontFamily: FONT,
    color: C.text2,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 1,
  },
  orderTotalValue: {
    fontFamily: FONT,
    color: C.text,
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.6,
  },
  statusSection: {
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  statusSectionTitle: {
    fontFamily: FONT,
    color: '#475569',
    fontSize: 14,
    marginBottom: 10,
  },
  currentStatusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: R.pill,
    marginBottom: 16,
    borderWidth: 1.5,
  },
  currentStatusText: {
    fontFamily: FONT,
    fontSize: 15,
    fontWeight: '800',
  },
  changeStatusLabel: {
    fontFamily: FONT,
    color: '#475569',
    fontSize: 13,
    marginBottom: 10,
  },
  statusButtonsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statusGridButton: {
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: R.pill,
    minWidth: 110,
    borderWidth: 1.5,
  },
  statusGridButtonText: {
    fontFamily: FONT,
    fontSize: 13,
    fontWeight: '800',
    textAlign: 'center',
  },
  statusButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  statusButtonsMobile: {
    flexDirection: 'column',
    gap: 8,
  },
  statusButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 10,
  },
  statusButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    marginLeft: 8,
  },
  sectionSubtitle: {
    fontFamily: FONT,
    color: '#475569',
    fontSize: 13,
    marginBottom: 12,
    marginTop: -8,
  },
  modalScrollWithFooter: {
    paddingBottom: 180,
  },
  selectedCheckmark: {
    marginLeft: 8,
  },
  fixedFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#ffffff',
    borderTopLeftRadius: R.xl,
    borderTopRightRadius: R.xl,
    padding: 18,
    paddingBottom: 24,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.14,
    shadowRadius: 30,
    elevation: 12,
  },
  footerSelectedItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  footerItemName: {
    fontFamily: FONT,
    flex: 1,
    color: C.text,
    fontSize: 17,
    fontWeight: '800',
    marginRight: 12,
  },
  footerItemRight: {
    alignItems: 'flex-end',
  },
  footerItemPrice: {
    fontFamily: FONT,
    color: C.green,
    fontSize: 20,
    fontWeight: '800',
  },
  footerAvailableText: {
    fontFamily: FONT,
    color: '#475569',
    fontSize: 11,
    marginTop: 2,
  },
  footerControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  footerQuantityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  footerQuantityButton: {
    backgroundColor: '#DB0007',
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerQuantityInput: {
    fontFamily: FONT,
    backgroundColor: '#F1F5F9',
    color: '#0F172A',
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    width: 56,
    height: 44,
    borderRadius: 10,
  },
  footerQuantityDisplay: {
    backgroundColor: '#F1F5F9',
    width: 50,
    height: 44,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerQuantityText: {
    fontFamily: FONT,
    color: '#0F172A',
    fontSize: 20,
    fontWeight: 'bold',
  },
  footerQuantityButtonDisabled: {
    backgroundColor: '#CBD5E1',
    opacity: 0.5,
  },
  footerAddButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#00754A',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 10,
    minHeight: 48,
  },
  footerAddButtonText: {
    fontFamily: FONT,
    color: '#ffffff',
    fontWeight: '700',
    marginLeft: 8,
    fontSize: 16,
  },
  // Layout verticale per mobile
  footerControlsVertical: {
    gap: 10,
  },
  footerRow: {
    flexDirection: 'row',
    gap: 12,
  },
  footerPriceBox: {
    flex: 1,
  },
  footerPriceLabel: {
    fontFamily: FONT,
    color: '#475569',
    fontSize: 12,
    marginBottom: 4,
  },
  footerPriceInput: {
    fontFamily: FONT,
    backgroundColor: '#F1F5F9',
    color: '#0F172A',
    fontSize: 18,
    fontWeight: '600',
    padding: 12,
    borderRadius: 10,
    textAlign: 'center',
  },
  footerQuantityBox: {
    flex: 1,
  },
  footerQuantityLabel: {
    fontFamily: FONT,
    color: '#475569',
    fontSize: 12,
    marginBottom: 4,
  },
  footerQuantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    padding: 6,
  },
  footerQtyBtn: {
    backgroundColor: C.brand,
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerQtyBtnDisabled: {
    backgroundColor: C.borderStrong,
    opacity: 0.6,
  },
  footerQtyText: {
    fontFamily: FONT,
    color: '#0F172A',
    fontSize: 20,
    fontWeight: '700',
  },
  footerAddButtonFull: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.green,
    paddingVertical: 16,
    borderRadius: R.pill,
    gap: 8,
    shadowColor: C.green,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.28,
    shadowRadius: 20,
    elevation: 6,
  },
  footerNotesInput: {
    fontFamily: FONT,
    backgroundColor: C.sunken,
    color: C.text,
    padding: 12,
    borderRadius: R.md,
    fontSize: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: C.border,
  },
  // Vecchi stili (mantenuti per compatibilità)
  footerPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,
  },
  footerPriceCurrency: {
    fontFamily: FONT,
    color: '#00754A',
    fontSize: 14,
    marginLeft: 4,
  },
  // Pulsante Piatto Libero
  customItemButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.violet,
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: R.pill,
    marginVertical: 10,
    gap: 6,
  },
  customItemButtonText: {
    fontFamily: FONT,
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  // Inline Custom Item Form
  inlineCustomItemForm: {
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    padding: 12,
    marginVertical: 10,
    borderWidth: 1,
    borderColor: '#5423E7',
  },
  inlineFormHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  inlineFormTitle: {
    fontFamily: FONT,
    color: '#5423E7',
    fontSize: 14,
    fontWeight: '700',
  },
  inlineFormInput: {
    fontFamily: FONT,
    backgroundColor: '#E2E8F0',
    color: '#0F172A',
    padding: 10,
    borderRadius: 8,
    fontSize: 14,
    marginBottom: 8,
  },
  inlineFormRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  inlineQuantityControl: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E2E8F0',
    borderRadius: 8,
    padding: 4,
  },
  inlineQtyBtn: {
    padding: 8,
  },
  inlineQtyText: {
    fontFamily: FONT,
    color: '#0F172A',
    fontSize: 16,
    fontWeight: '600',
    minWidth: 30,
    textAlign: 'center',
  },
  inlineAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#00754A',
    padding: 10,
    borderRadius: 8,
    marginTop: 8,
    gap: 6,
  },
  inlineAddBtnText: {
    fontFamily: FONT,
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  // Modal Piatto Libero
  customItemModalOverlay: {
    ...Platform.select({ web: { backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' } as any }),
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    ...Platform.select({
      web: {
        position: 'fixed' as any,
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 99999,
      },
    }),
  },
  customItemModalContent: {
    backgroundColor: '#ffffff',
    borderRadius: R.xl,
    width: '100%',
    maxWidth: 420,
    maxHeight: '90%',
    ...elevation(3),
    ...Platform.select({ web: { zIndex: 100000, overflowY: 'auto' as any } }),
  },
  customItemModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  customItemModalTitle: {
    fontFamily: FONT,
    color: '#0F172A',
    fontSize: 20,
    fontWeight: '800',
  },
  customItemModalBody: {
    padding: 16,
  },
  customItemLabel: {
    fontFamily: FONT,
    color: '#475569',
    fontSize: 13,
    marginBottom: 6,
  },
  customItemInput: {
    fontFamily: FONT,
    backgroundColor: '#F1F5F9',
    color: '#0F172A',
    fontSize: 16,
    padding: 14,
    borderRadius: 10,
    marginBottom: 16,
  },
  customItemRow: {
    flexDirection: 'row',
    gap: 12,
  },
  customItemField: {
    flex: 1,
  },
  customItemQuantityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    padding: 8,
  },
  customItemQuantityBtn: {
    backgroundColor: '#DB0007',
    width: 40,
    height: 40,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  customItemQuantityText: {
    fontFamily: FONT,
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '700',
  },
  customItemAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#00754A',
    paddingVertical: 14,
    borderRadius: 10,
    marginTop: 10,
    gap: 8,
  },
  customItemAddBtnText: {
    fontFamily: FONT,
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    marginBottom: 12,
    paddingHorizontal: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    fontFamily: FONT,
    flex: 1,
    color: '#0F172A',
    fontSize: 15,
    paddingVertical: 14,
  },
  clearSearchButton: {
    padding: 4,
  },
  noResultsContainer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  noResultsText: {
    fontFamily: FONT,
    color: '#475569',
    fontSize: 16,
    marginTop: 12,
  },
  noResultsSubtext: {
    fontFamily: FONT,
    color: '#94a3b8',
    fontSize: 14,
    marginTop: 4,
  },
  unpaidBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DB0007',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginTop: 6,
    alignSelf: 'flex-start',
    gap: 4,
  },
  unpaidBadgeText: {
    fontFamily: FONT,
    color: '#0F172A',
    fontSize: 10,
    fontWeight: '700',
  },
  unpaidWarningBox: {
    backgroundColor: '#FFF1F1',
    borderWidth: 1,
    borderColor: '#DB0007',
    borderRadius: 8,
    padding: 10,
    marginTop: 12,
  },
  unpaidWarningHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  unpaidWarningTitle: {
    fontFamily: FONT,
    color: '#DB0007',
    fontSize: 13,
    fontWeight: '600',
  },
  unpaidWarningText: {
    fontFamily: FONT,
    color: '#0F172A',
    fontSize: 13,
    marginBottom: 8,
  },
  unpaidOrderItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F1F5F9',
    padding: 8,
    borderRadius: 6,
    marginTop: 4,
  },
  unpaidOrderText: {
    fontFamily: FONT,
    color: '#0F172A',
    fontSize: 12,
    flex: 1,
  },
  unpaidPayButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F6EF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    gap: 4,
  },
  unpaidPayText: {
    fontFamily: FONT,
    color: '#00754A',
    fontSize: 11,
    fontWeight: '600',
  },
  unpaidMoreText: {
    fontFamily: FONT,
    color: '#475569',
    fontSize: 11,
    marginTop: 6,
    textAlign: 'center',
  },
  paymentSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  paymentChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: R.pill,
    gap: 8,
  },
  paymentChipPaid: {
    backgroundColor: '#E8F6EF',
    borderWidth: 1,
    borderColor: '#00754A',
  },
  paymentChipUnpaid: {
    backgroundColor: '#FFF1F1',
    borderWidth: 1,
    borderColor: '#DB0007',
  },
  paymentChipText: {
    fontFamily: FONT,
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
  },
  paymentChipTextPaid: {
    color: '#00754A',
  },
  paymentChipTextUnpaid: {
    color: '#DB0007',
  },
  orderFooterRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  paymentToggle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
  },
  paymentTogglePaid: {
    backgroundColor: '#E8F6EF',
  },
  paymentToggleUnpaid: {
    backgroundColor: '#FFF1F1',
  },
  orderItemReady: {
    backgroundColor: '#E8F6EF',
    borderLeftWidth: 3,
    borderLeftColor: '#00754A',
  },
  orderItemProblem: {
    backgroundColor: '#FFF1F1',
    borderLeftWidth: 3,
    borderLeftColor: '#DB0007',
  },
  itemKitchenActive: {
    backgroundColor: '#FFBC0D',
  },
  orderItemKitchen: {
    borderLeftWidth: 3,
    borderLeftColor: '#FFBC0D',
    backgroundColor: '#FFFBEB',
  },
  itemStatusIcons: {
    flexDirection: 'row',
    gap: 6,
    marginRight: 8,
  },
  itemStatusBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  itemStatusBtnActive: {
    borderWidth: 0,
  },
  itemStatusBtnReady: {
    backgroundColor: '#00754A',
  },
  itemStatusBtnProblem: {
    backgroundColor: '#DB0007',
  },
  receiptSection: {
    marginTop: 12,
  },
  receiptActions: {
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: 8,
  },
  receiptPreviewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F6EF',
    borderWidth: 1,
    borderColor: '#00754A',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 6,
  },
  receiptPreviewText: {
    fontFamily: FONT,
    color: '#00754A',
    fontSize: 14,
    fontWeight: '600',
  },
  receiptDeleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
    backgroundColor: '#FFF1F1',
    borderRadius: 8,
  },
  // Inline Receipt Styles
  inlineReceiptContainer: {
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#00754A',
  },
  inlineReceiptHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  inlineReceiptTitle: {
    fontFamily: FONT,
    color: '#00754A',
    fontSize: 14,
    fontWeight: '700',
  },
  inlineReceiptImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginBottom: 10,
  },
  receiptCaptureBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEF4FF',
    borderWidth: 1,
    borderColor: '#2563EB',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 6,
  },
  receiptCaptureText: {
    fontFamily: FONT,
    color: '#2563EB',
    fontSize: 14,
    fontWeight: '600',
  },
  receiptModalOverlay: {
    ...Platform.select({ web: { backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' } as any }),
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  receiptModalContent: {
    width: '90%',
    maxWidth: 500,
    maxHeight: '85%',
    backgroundColor: '#ffffff',
    borderRadius: R.xl,
    overflow: 'hidden',
    ...elevation(3),
  },
  receiptModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  receiptModalTitle: {
    fontFamily: FONT,
    color: '#0F172A',
    fontSize: 20,
    fontWeight: '800',
  },
  receiptModalCloseBtn: {
    padding: 4,
  },
  receiptImage: {
    width: '100%',
    height: 500,
    flexShrink: 1,
    backgroundColor: '#F1F5F9',
  },
  panelHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginLeft: 'auto',
  },
  portionsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#00754A',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  portionsButtonText: {
    fontFamily: FONT,
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 14,
  },
  portionsModalOverlay: {
    ...Platform.select({ web: { backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' } as any }),
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  portionsModalContent: {
    width: '100%',
    maxWidth: 480,
    maxHeight: '80%',
    backgroundColor: '#ffffff',
    borderRadius: R.xl,
    overflow: 'hidden',
    ...elevation(3),
  },
  portionsModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  portionsModalTitle: {
    fontFamily: FONT,
    color: '#0F172A',
    fontSize: 20,
    fontWeight: '800',
  },
  portionsModalCloseBtn: {
    padding: 4,
  },
  portionsModalBody: {
    padding: 16,
  },
  portionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  portionItemInfo: {
    flex: 1,
  },
  portionItemName: {
    fontFamily: FONT,
    color: '#0F172A',
    fontSize: 15,
    fontWeight: '500',
  },
  portionItemCategory: {
    fontFamily: FONT,
    color: '#475569',
    fontSize: 12,
    marginTop: 2,
  },
  portionItemBadge: {
    backgroundColor: C.greenSoft,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: R.pill,
    minWidth: 52,
    alignItems: 'center',
  },
  portionItemBadgeEmpty: {
    backgroundColor: C.brandSoft,
  },
  portionItemBadgeLow: {
    backgroundColor: C.yellowSoft,
  },
  portionItemBadgeText: {
    fontFamily: FONT,
    color: C.text,
    fontWeight: '800',
    fontSize: 14,
  },
  compactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 44,
    minWidth: 44,
    paddingHorizontal: 14,
    borderRadius: R.pill,
    backgroundColor: C.greenSoft,
    borderWidth: 1,
    borderColor: '#A7E3C6',
  },
  compactButtonPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 44,
    minWidth: 44,
    paddingHorizontal: 18,
    borderRadius: R.pill,
    backgroundColor: C.brand,
    shadowColor: C.brand,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 18,
    elevation: 6,
  },
  unpaidViewAllBtn: {
    marginLeft: 'auto',
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#EEF4FF',
    borderRadius: 4,
  },
  unpaidViewAllText: {
    fontFamily: FONT,
    color: '#2563EB',
    fontSize: 11,
    fontWeight: '600',
  },
  unpaidOrderInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 8,
  },
  unpaidAllItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  unpaidAllInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  unpaidAllNumber: {
    fontFamily: FONT,
    color: '#0F172A',
    fontSize: 15,
    fontWeight: '600',
  },
  unpaidAllTotal: {
    fontFamily: FONT,
    color: '#DB0007',
    fontSize: 15,
    fontWeight: '600',
  },
  unpaidAllDate: {
    fontFamily: FONT,
    color: '#475569',
    fontSize: 12,
  },
  unpaidAllPayBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F6EF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  unpaidAllPayText: {
    fontFamily: FONT,
    color: '#00754A',
    fontSize: 13,
    fontWeight: '600',
  },
});
