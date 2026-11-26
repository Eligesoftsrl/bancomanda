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
  Platform,
  Switch,
  useWindowDimensions,
} from 'react-native';
import { ChipScroller } from '../../src/components/ChipScroller';
import { notify } from '../../src/store/toastStore';
import * as Clipboard from 'expo-clipboard';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { useAppStore } from '../../src/store/appStore';
import { menusApi, dishesApi, missedSalesApi, categoriesApi, tenantApi, optionGroupsApi } from '../../src/services/api';
import { useAuthStore } from '../../src/store/authStore';
import { escapeHtml } from '../../src/utils/escapeHtml';
import { DailyMenu, Dish, MenuItem, Category, OptionGroup } from '../../src/types';
import { TodayOptionsToggles } from '../../src/components/composable/TodayOptionsToggles';
import { euro, groupsForDish, isPreset, optionsSummary, presetExtra, priceText, round2 } from '../../src/utils/composition';
import { sortCategoriesByFixedOrder, sortDishesByCategory, sortMenuItemsByCategory } from '../../src/utils/categoryOrder';
import { useFocusEffect } from 'expo-router';
import { C, FONT } from '../../src/theme/tokens';
import { Appear } from '../../src/components/motion/Appear';
import { PageHeader } from '../../src/components/ui2/PageHeader';
import { DatePill } from '../../src/components/ui2/DatePill';
import { useWideLayout } from '../../src/theme/layout';


export default function MenuScreen() {
  const isCompact = useWindowDimensions().width < 768;
  const { contentWidth } = useWideLayout();
  const wideMenu = contentWidth >= 1000;
  const leftColW = wideMenu ? (contentWidth - 32 - 16) * 0.58 : contentWidth - 32;
  const menuTileW = `${leftColW >= 560 ? 50 : 100}%` as const;
  const [mobileMenuTab, setMobileMenuTab] = useState<'menu' | 'catalog'>('menu');
  const [openCatalogCats, setOpenCatalogCats] = useState<Record<string, boolean>>({});
  const { selectedDate, setSelectedDate, dishes, setDishes, currentMenu, setCurrentMenu } = useAppStore();
  // Local "all dishes" list for the Menu tab so it isn't affected when
  // the Piatti tab filters the shared `dishes` store by category.
  const [allDishes, setAllDishes] = useState<Dish[]>([]);
  // Free-text search query for the "Piatti Disponibili" section
  const [availableSearchQuery, setAvailableSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddDishModal, setShowAddDishModal] = useState(false);
  const [showEditItemModal, setShowEditItemModal] = useState(false);
  const [selectedDish, setSelectedDish] = useState<Dish | null>(null);
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [optionGroups, setOptionGroups] = useState<OptionGroup[]>([]);
  const [todayUnavailable, setTodayUnavailable] = useState<string[]>([]);
  const [portions, setPortions] = useState('');
  const [dailyPrice, setDailyPrice] = useState('');
  const [notes, setNotes] = useState('');
  
  // Categories state for filtering
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string | null>(null);
  
  // Categories selection for sharing menu
  const [showShareOptions, setShowShareOptions] = useState(false);
  const [selectedShareCategories, setSelectedShareCategories] = useState<string[]>([]);
  
  // Sort categories by fixed order
  const sortedCategories = useMemo(() => sortCategoriesByFixedOrder(categories), [categories]);
  
  // Sort menu items by category
  const sortedMenuItems = useMemo(() => 
    currentMenu ? sortMenuItemsByCategory(currentMenu.items, categories) : [],
    [currentMenu, categories]
  );

  // Toast state
  // Avviso globale: visibile anche sopra le finestre aperte
  const showToast = (message: string, type: 'success' | 'error' = 'success') => notify(message, type);

  // "Pubblica sul sito" modal + action
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [publishLoading, setPublishLoading] = useState(false);

  const SITE_JSON_PATH = '/menu/menu.json';
  const SITE_JS_SNIPPET = `fetch('${SITE_JSON_PATH}?t=' + Date.now())
  .then(r => r.json())
  .then(menu => {
    if (!menu.published) { /* mostra menu.message */ return; }
    menu.sections.forEach(sec => {
      sec.items.forEach(p => {
        /* p.name, p.price, p.tags, p.allergens, p.notes
           piatti componibili: p.priceFrom (prezzo "da"), p.optionGroups = [{ name, options: [{ name, price }] }] */
      });
    });
  });`;

  const handleTogglePublish = async (nextValue: boolean) => {
    if (!currentMenu) return;
    try {
      setPublishLoading(true);
      const updated = await menusApi.togglePublish(currentMenu.id, nextValue);
      setCurrentMenu(updated);
      showToast(nextValue ? 'Menu inviato al sito' : 'Menu ritirato dal sito', 'success');
    } catch (e: any) {
      showToast(e?.response?.data?.detail || 'Invio al sito non riuscito', 'error');
    } finally {
      setPublishLoading(false);
    }
  };

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await Clipboard.setStringAsync(text);
      showToast(`${label} copiato`, 'success');
    } catch (e) {
      showToast('Copia non riuscita', 'error');
    }
  };

  // Confirm dialog
  const [confirmDialog, setConfirmDialog] = useState<{ visible: boolean; title: string; message: string; onConfirm: () => void } | null>(null);

  // Missed sale modal state
  const [showMissedSaleModal, setShowMissedSaleModal] = useState(false);
  const [missedSaleItem, setMissedSaleItem] = useState<MenuItem | null>(null);
  const [missedSaleQuantity, setMissedSaleQuantity] = useState('1');

  const handleMissedSale = async () => {
    if (!missedSaleItem) return;
    
    const quantity = parseInt(missedSaleQuantity) || 1;
    if (quantity <= 0) {
      showToast('Inserisci una quantità valida', 'error');
      return;
    }
    
    try {
      await missedSalesApi.create({
        dishName: missedSaleItem.dishName,
        date: selectedDate,
        quantity: quantity,
        timeSlot: 'giornata',
        channel: 'richiesta',
        reason: 'esaurito',
      });
      
      showToast(`Registrate ${quantity} richieste non soddisfatte`);
      setShowMissedSaleModal(false);
      setMissedSaleItem(null);
      setMissedSaleQuantity('1');
    } catch (error) {
      console.error('Error creating missed sale:', error);
      showToast('Errore nel registrare la mancata vendita', 'error');
    }
  };

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
      
      // Load dishes (all active, no category filter) for the available list
      const dishesData = await dishesApi.getAll();
      setAllDishes(dishesData);
      setDishes(dishesData);
      try {
        setOptionGroups(await optionGroupsApi.getAll());
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
    } catch (error) {
      console.error('Error loading data:', error);
      showToast('Impossibile caricare i dati', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Reload data whenever the Menu tab is focused (other tabs might mutate the shared dishes store)
  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleCreateMenu = async () => {
    try {
      const menu = await menusApi.create(selectedDate);
      setCurrentMenu(menu);
      // No toast needed - the menu will appear automatically
    } catch (error: any) {
      showToast(error.response?.data?.detail || 'Impossibile creare il menu', 'error');
    }
  };

  const handleAddDish = async () => {
    if (!currentMenu || !selectedDish) return;
    
    const portionsNum = parseInt(portions);
    const priceNum = parseFloat((dailyPrice || '').replace(',', '.'));
    
    if (isNaN(portionsNum) || portionsNum <= 0) {
      showToast('Inserisci un numero di porzioni valido', 'error');
      return;
    }
    
    // Piatto componibile: prezzo di partenza anche 0 (lo danno le scelte); già composto: prezzo con ingredienti
    const preset = isPreset(selectedDish);
    const recipe = preset ? presetExtra(selectedDish, groupsForDish(selectedDish, optionGroups)) : 0;
    if (isNaN(priceNum) || priceNum < recipe || (priceNum === 0 && (!selectedDish.isComposable || preset))) {
      showToast(recipe > 0 && priceNum < recipe ? `Il prezzo deve essere almeno ${euro(recipe)}: è il valore degli ingredienti` : 'Inserisci un prezzo valido', 'error');
      return;
    }

    try {
      const updatedMenu = await menusApi.addItem(currentMenu.id, {
        dishId: selectedDish.id,
        portions: portionsNum,
        dailyPrice: round2(priceNum - recipe),
        notes: notes,
      });
      
      setCurrentMenu(updatedMenu);
      setShowAddDishModal(false);
      resetForm();
      showToast('Piatto aggiunto al menu');
      // OP03 fix: Force refresh to ensure all items are displayed
      await loadData();
    } catch (error: any) {
      showToast(error.response?.data?.detail || 'Impossibile aggiungere il piatto', 'error');
    }
  };

  const handleUpdateItem = async () => {
    if (!currentMenu || !selectedItem) return;

    const updates: any = {};
    
    if (portions) {
      const portionsNum = parseInt(portions);
      if (!isNaN(portionsNum) && portionsNum >= 0) {
        updates.portions = portionsNum;
      }
    }
    
    if (dailyPrice) {
      const dish = dishById(selectedItem.dishId);
      const recipe = isPreset(dish) ? presetExtra(dish, itemGroups(selectedItem)) : 0;
      const priceNum = round2(parseFloat((dailyPrice || '').replace(',', '.')) - recipe);
      if (priceNum < 0) {
        showToast(`Il prezzo deve essere almeno ${euro(recipe)}: è il valore degli ingredienti`, 'error');
        return;
      }
      if (!isNaN(priceNum) && (priceNum > 0 || (!!dish?.isComposable && priceNum === 0)) && priceNum !== selectedItem.dailyPrice) {
        updates.dailyPrice = priceNum;
      }
    }
    
    if (notes !== selectedItem.notes) {
      updates.notes = notes;
    }

    const before = selectedItem.unavailableOptionIds || [];
    if (before.length !== todayUnavailable.length || before.some((id) => !todayUnavailable.includes(id))) {
      updates.unavailableOptionIds = todayUnavailable;
    }

    if (Object.keys(updates).length === 0) {
      setShowEditItemModal(false);
      return;
    }

    try {
      const updatedMenu = await menusApi.updateItem(currentMenu.id, selectedItem.dishId, updates);
      setCurrentMenu(updatedMenu);
      setShowEditItemModal(false);
      resetForm();
      showToast('Piatto aggiornato');
    } catch (error: any) {
      showToast(error.response?.data?.detail || 'Impossibile aggiornare il piatto', 'error');
    }
  };

  const handleRemoveItem = async (dishId: string) => {
    if (!currentMenu) return;

    setConfirmDialog({
      visible: true,
      title: 'Rimuovi Piatto',
      message: 'Vuoi rimuovere questo piatto dal menu?',
      onConfirm: async () => {
        try {
          const updatedMenu = await menusApi.removeItem(currentMenu.id, dishId);
          setCurrentMenu(updatedMenu);
          showToast('Piatto rimosso');
        } catch (error: any) {
          showToast(error.response?.data?.detail || 'Impossibile rimuovere il piatto', 'error');
        }
        setConfirmDialog(null);
      },
    });
  };

  const resetForm = () => {
    setSelectedDish(null);
    setSelectedItem(null);
    setPortions('');
    setDailyPrice('');
    setNotes('');
  };

  const changeDate = (days: number) => {
    const currentDate = new Date(selectedDate);
    currentDate.setDate(currentDate.getDate() + days);
    setSelectedDate(format(currentDate, 'yyyy-MM-dd'));
  };

  const dishById = (id: string) => allDishes.find((d) => d.id === id);
  const itemGroups = (item: MenuItem) => groupsForDish(dishById(item.dishId), optionGroups);

  const openEditModal = (item: MenuItem) => {
    setSelectedItem(item);
    setTodayUnavailable(item.unavailableOptionIds || []);
    setPortions(item.portions.toString());
    const dish = dishById(item.dishId);
    setDailyPrice(String(isPreset(dish) ? round2(item.dailyPrice + presetExtra(dish, itemGroups(item))) : item.dailyPrice));
    setNotes(item.notes || '');
    setShowEditItemModal(true);
  };

  const openAddModal = (dish: Dish) => {
    setSelectedDish(dish);
    setPortions('');
    setDailyPrice(String(isPreset(dish) ? round2(dish.basePrice + presetExtra(dish, groupsForDish(dish, optionGroups))) : dish.basePrice));
    setNotes('');
    setShowAddDishModal(true);
  };

  // Get dishes not already in menu, sorted by category
  // Uses local `allDishes` (not the shared store) so the Piatti tab filter
  // can't accidentally hide dishes here. Also applies selectedCategoryFilter
  // and the free-text search (availableSearchQuery) — both only affect this list.
  const availableDishes = useMemo(() => {
    let filtered = allDishes.filter(
      d => !currentMenu?.items.some(item => item.dishId === d.id)
    );
    if (selectedCategoryFilter) {
      filtered = filtered.filter(d => d.categoryId === selectedCategoryFilter);
    }
    if (availableSearchQuery.trim()) {
      const q = availableSearchQuery.toLowerCase();
      filtered = filtered.filter(d =>
        d.name.toLowerCase().includes(q) ||
        (d.description || '').toLowerCase().includes(q)
      );
    }
    return sortDishesByCategory(filtered, categories);
  }, [allDishes, currentMenu, categories, selectedCategoryFilter, availableSearchQuery]);

  // OP10: Print Menu PDF with nice graphics - Clean white design for WhatsApp
  const handlePrintMenu = async () => {
    if (!currentMenu || !currentMenu.items.length) {
      showToast('Nessun piatto nel menu da stampare', 'error');
      return;
    }

    // Filter items by selected categories
    const itemsToShare = currentMenu.items.filter(item => 
      selectedShareCategories.includes(item.categoryName || 'Altro')
    );

    if (itemsToShare.length === 0) {
      showToast('Nessun piatto nelle categorie selezionate', 'error');
      return;
    }

    const formattedDate = format(new Date(selectedDate), "EEEE d MMMM yyyy", { locale: it });
    const capitalizedDate = formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1);

    // Su web la finestra va aperta subito (prima di attese) per non essere bloccata dal browser
    const printWindow = Platform.OS === 'web' ? window.open('', '_blank') : null;
    let brandName = useAuthStore.getState().user?.tenant_name || '';
    let brandLogo: string | null = null;
    try {
      const branding = await tenantApi.getBranding();
      brandName = branding.name || brandName;
      brandLogo = branding.logo;
    } catch (error) {
      console.error('Branding error:', error);
    }
    const safeBrandName = escapeHtml(brandName);
    const brandHtml = brandLogo
      ? `<img class="brand-logo" src="${brandLogo}" alt="${safeBrandName}">`
      : `<div class="logo">${safeBrandName}</div>`;
    
    // Group items by category
    const groupedItems: Record<string, MenuItem[]> = {};
    itemsToShare.forEach(item => {
      const cat = item.categoryName || 'Altro';
      if (!groupedItems[cat]) groupedItems[cat] = [];
      groupedItems[cat].push(item);
    });

    // Category order
    const categoryOrder = ['Primi', 'Secondi', 'Contorni', 'Piatti Freddi', 'Insalate', 'Dolci', 'Bibite', 'Fuori Menù', 'Altro'];
    const sortedCategories = Object.keys(groupedItems).sort((a, b) => {
      const indexA = categoryOrder.indexOf(a);
      const indexB = categoryOrder.indexOf(b);
      return (indexA === -1 ? 999 : indexA) - (indexB === -1 ? 999 : indexB);
    });

    const menuItemsHtml = sortedCategories.map(category => `
      <div class="category">
        <div class="category-header">${escapeHtml(category)}</div>
        <div class="category-items">
          ${groupedItems[category].map(item => `
            <div class="menu-item">
              <span class="item-name">${escapeHtml(item.dishName)}</span>
              <span class="item-dots"></span>
              <span class="item-price">${priceText(item.dailyPrice, dishById(item.dishId), itemGroups(item), item.unavailableOptionIds)}</span>
            </div>
            ${itemGroups(item).length ? `<div class="item-notes">${escapeHtml(optionsSummary(itemGroups(item), item.unavailableOptionIds))}</div>` : ''}
            ${item.notes ? `<div class="item-notes">${escapeHtml(item.notes)}</div>` : ''}
          `).join('')}
        </div>
      </div>
    `).join('');

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600;700&family=Montserrat:wght@300;400;500&display=swap');
          
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          
          /* Print-specific styles for multi-page support */
          @media print {
            html, body {
              height: auto !important;
              overflow: visible !important;
            }
            .container {
              min-height: auto !important;
              height: auto !important;
              border: none !important;
              page-break-inside: auto;
            }
            .category {
              page-break-inside: avoid;
            }
            .menu-item {
              page-break-inside: avoid;
            }
            .footer {
              page-break-inside: avoid;
            }
          }
          
          @page {
            size: A4;
            margin: 15mm 10mm;
          }
          
          body {
            font-family: 'Cormorant Garamond', Georgia, serif;
            background: #f8f5f0;
            padding: 0;
            color: #5A6A85;
          }
          
          .container {
            width: 100%;
            padding: 40px 35px;
            background: linear-gradient(180deg, #fffef9 0%, #f9f6f0 100%);
            border: 6px double #c9a961;
            border-radius: 4px;
          }
          
          .header {
            text-align: center;
            margin-bottom: 30px;
            padding-bottom: 25px;
            border-bottom: 2px solid #c9a961;
          }
          
          .logo {
            font-size: 56px;
            font-weight: 700;
            color: #7a1f1f;
            letter-spacing: 6px;
            margin-bottom: 12px;
            font-family: 'Cormorant Garamond', Georgia, serif;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.1);
          }
          
          .brand-logo {
            display: block;
            max-width: 260px;
            max-height: 120px;
            margin: 0 auto 12px;
            object-fit: contain;
          }
          
          .divider {
            width: 100px;
            height: 3px;
            background: linear-gradient(90deg, transparent, #c9a961, transparent);
            margin: 12px auto;
          }
          
          .subtitle {
            font-size: 16px;
            color: #8b7355;
            text-transform: uppercase;
            letter-spacing: 5px;
            margin-bottom: 12px;
            font-family: 'Montserrat', sans-serif;
            font-weight: 400;
          }
          
          .date {
            font-size: 18px;
            color: #5a4a3a;
            font-style: italic;
            font-weight: 500;
          }
          
          .category {
            margin-bottom: 25px;
          }
          
          .category-header {
            font-size: 20px;
            font-weight: 600;
            color: #7a1f1f;
            text-transform: uppercase;
            letter-spacing: 3px;
            margin-bottom: 12px;
            padding-bottom: 8px;
            border-bottom: 2px solid #e8dcc8;
            font-family: 'Cormorant Garamond', Georgia, serif;
          }
          
          .category-items {
            padding-left: 8px;
          }
          
          .menu-item {
            display: flex;
            align-items: baseline;
            padding: 8px 0;
            font-size: 18px;
          }
          
          .item-name {
            color: #5A6A85;
            font-weight: 500;
          }
          
          .item-dots {
            flex: 1;
            border-bottom: 2px dotted #d4c9b8;
            margin: 0 12px;
            min-width: 20px;
          }
          
          .item-price {
            color: #7a1f1f;
            font-weight: 700;
            white-space: nowrap;
            font-size: 18px;
          }
          
          .item-notes {
            font-size: 14px;
            color: #8b7355;
            font-style: italic;
            padding-left: 12px;
            margin-top: -3px;
            margin-bottom: 6px;
          }
          
          .footer {
            text-align: center;
            margin-top: 30px;
            padding-top: 20px;
            border-top: 2px solid #c9a961;
          }
          
          .footer-text {
            font-size: 16px;
            color: #8b7355;
            font-style: italic;
            font-family: 'Cormorant Garamond', Georgia, serif;
          }
          
          .heart {
            color: #7a1f1f;
            font-size: 18px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            ${brandHtml}
            <div class="divider"></div>
            <div class="subtitle">Menu del Giorno</div>
            <div class="date">${capitalizedDate}</div>
          </div>
          
          ${menuItemsHtml}
          
          <div class="footer">
            <div class="footer-text">Buon appetito! <span class="heart">♥</span></div>
          </div>
        </div>
      </body>
      </html>
    `;

    try {
      if (Platform.OS === 'web') {
        if (printWindow) {
          printWindow.document.write(html);
          printWindow.document.close();
          const logoImg = printWindow.document.querySelector('img');
          if (logoImg && !logoImg.complete) {
            await new Promise<void>((resolve) => {
              logoImg.onload = () => resolve();
              logoImg.onerror = () => resolve();
              setTimeout(resolve, 3000);
            });
          }
          printWindow.print();
        }
      } else {
        const { uri } = await Print.printToFileAsync({ html });
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(uri, {
            mimeType: 'application/pdf',
            dialogTitle: `Menu ${formattedDate}`,
            UTI: 'com.adobe.pdf'
          });
        } else {
          await Print.printAsync({ html });
        }
      }
      showToast('Menu pronto per la condivisione!');
    } catch (error) {
      console.error('Print error:', error);
      showToast('Errore nella stampa', 'error');
    }
  };

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

  const renderMenuToday = (currentMenu: DailyMenu) => (
          <>
            {/* Menu Items */}
            <View style={[styles.section, wideMenu && styles.sectionFill]} testID="menu-today-section">
              <View style={styles.sectionHeader}>
                <View style={styles.sectionTitleRow}>
                  <View style={[styles.sectionIcon, { backgroundColor: C.primarySoft }]}><Ionicons name="restaurant-outline" size={18} color={C.primary} /></View>
                  <Text style={styles.sectionTitle}>Menu di oggi</Text>
                  <View style={styles.countPill}><Text style={styles.countPillText} testID="menu-today-count">{currentMenu.items.length}</Text></View>
                </View>
                {/* OP10: Print Menu Button */}
                {currentMenu.items.length > 0 && (
                  <TouchableOpacity 
                    style={styles.printMenuButton}
                    testID='menu-share-button'
                    onPress={() => {
                      // Get unique categories from menu items
                      const menuCategories = [...new Set(currentMenu.items.map(item => item.categoryName || 'Altro'))];
                      setSelectedShareCategories(menuCategories); // Select all by default
                      setShowShareOptions(true);
                    }}
                  >
                    <Ionicons name="share-outline" size={18} color="#fff" />
                    <Text style={styles.printMenuButtonText}>Condividi</Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Share Options Panel */}
              {showShareOptions && (
                <View style={styles.shareOptionsPanel}>
                  <View style={styles.shareOptionsHeader}>
                    <Text style={styles.shareOptionsTitle}>Seleziona categorie da condividere:</Text>
                    <TouchableOpacity onPress={() => setShowShareOptions(false)}>
                      <Ionicons name="close" size={20} color="#2A3547" />
                    </TouchableOpacity>
                  </View>
                  <View style={styles.shareCategoriesList}>
                    {[...new Set(currentMenu.items.map(item => item.categoryName || 'Altro'))].map(catName => (
                      <TouchableOpacity
                        key={catName}
                        style={[
                          styles.shareCategoryChip,
                          selectedShareCategories.includes(catName) && styles.shareCategoryChipActive
                        ]}
                        onPress={() => {
                          if (selectedShareCategories.includes(catName)) {
                            setSelectedShareCategories(selectedShareCategories.filter(c => c !== catName));
                          } else {
                            setSelectedShareCategories([...selectedShareCategories, catName]);
                          }
                        }}
                      >
                        <Ionicons 
                          name={selectedShareCategories.includes(catName) ? "checkbox" : "square-outline"} 
                          size={18} 
                          color={selectedShareCategories.includes(catName) ? "#0E9F80" : "#5A6A85"} 
                        />
                        <Text style={[
                          styles.shareCategoryText,
                          selectedShareCategories.includes(catName) && styles.shareCategoryTextActive
                        ]}>
                          {catName}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <TouchableOpacity 
                    style={[
                      styles.shareConfirmButton,
                      selectedShareCategories.length === 0 && styles.shareConfirmButtonDisabled
                    ]}
                    onPress={() => {
                      if (selectedShareCategories.length > 0) {
                        setShowShareOptions(false);
                        handlePrintMenu();
                      }
                    }}
                    disabled={selectedShareCategories.length === 0}
                  >
                    <Ionicons name="share-outline" size={18} color="#ffffff" />
                    <Text style={styles.shareConfirmButtonText}>Condividi ({selectedShareCategories.length} categorie)</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Category Filter */}
              {categories.length > 0 && currentMenu.items.length > 0 && (
                <ChipScroller
                  testID="menu-category-filter"
                  style={styles.categoryFilter}
                  contentContainerStyle={styles.categoryFilterContent}
                >
                  <TouchableOpacity
                    style={[styles.categoryChip, !selectedCategoryFilter && styles.categoryChipActive]}
                    onPress={() => setSelectedCategoryFilter(null)}
                  >
                    <Text style={[styles.categoryChipText, !selectedCategoryFilter && styles.categoryChipTextActive]}>
                      Tutte
                    </Text>
                  </TouchableOpacity>
                  {sortedCategories.map((category) => (
                    <TouchableOpacity
                      key={category.id}
                      style={[styles.categoryChip, selectedCategoryFilter === category.id && styles.categoryChipActive]}
                      onPress={() => setSelectedCategoryFilter(selectedCategoryFilter === category.id ? null : category.id)}
                    >
                      <Text style={[styles.categoryChipText, selectedCategoryFilter === category.id && styles.categoryChipTextActive]}>
                        {category.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ChipScroller>
              )}

              {(() => {
                // Filter and sort menu items by category
                const filteredItems = sortedMenuItems.filter(item => 
                  !selectedCategoryFilter || item.categoryId === selectedCategoryFilter
                );
                
                if (filteredItems.length === 0) {
                  return (
                    <View style={styles.emptySection}>
                      <Text style={styles.emptySectionText}>
                        {selectedCategoryFilter ? 'Nessun piatto in questa categoria' : 'Nessun piatto nel menu'}
                      </Text>
                    </View>
                  );
                }
                
                return (
                  <View style={styles.menuTileGrid}>
                  {filteredItems.map((item, index) => (
                  <Appear key={`menu-item-${item.dishId}-${index}`} index={index} style={[styles.menuTileCell, { width: menuTileW }]}>
<TouchableOpacity 
                    key={`menu-item-${item.dishId}-${index}`} 
                    testID={`menu-item-${item.dishId}`}
                    style={[styles.menuItemCard, item.portions > 0 && item.portions <= 3 && styles.menuItemCardLow, item.portions === 0 && styles.menuItemCardSoldOut]}
                    onPress={() => {
                      if (item.portions === 0) {
                        setMissedSaleItem(item);
                        setShowMissedSaleModal(true);
                      } else {
                        openEditModal(item);
                      }
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={styles.menuItemInfo}>
                      <View style={styles.menuItemNameRow}>
                        <Text style={styles.menuItemName} numberOfLines={2}>{item.dishName}</Text>
                        {item.categoryName && !selectedCategoryFilter && (
                          <View style={styles.categoryBadge}>
                            <Text style={styles.categoryBadgeText}>{item.categoryName}</Text>
                          </View>
                        )}
                        {item.portions === 0 && (
                          <View style={styles.soldOutBadge}>
                            <Ionicons name="alert-circle" size={14} color="#fff" />
                            <Text style={styles.soldOutText}>ESAURITO</Text>
                          </View>
                        )}
                      </View>
                      {itemGroups(item).length > 0 && (
                        <Text style={styles.menuItemComposable} testID={`menu-item-composable-${item.dishId}`}>
                          {isPreset(dishById(item.dishId)) ? 'Già composto · personalizzabile' : `Componibile · ${itemGroups(item).map((g) => g.name).join(' + ')}`}
                          {(item.unavailableOptionIds || []).length ? ` · ${(item.unavailableOptionIds || []).length} esauriti oggi` : ''}
                        </Text>
                      )}
                      {item.notes && (
                        <Text style={styles.menuItemNotes} numberOfLines={2}>{item.notes}</Text>
                      )}
                      <View style={styles.menuItemDetails}>
                        <Text style={styles.menuItemPrice} numberOfLines={1}>
                          {priceText(item.dailyPrice, dishById(item.dishId), itemGroups(item), item.unavailableOptionIds)}
                        </Text>
                        <View style={[
                          styles.portionsBadge,
                          item.portions === 0 && styles.portionsBadgeEmpty,
                          item.portions > 0 && item.portions <= 3 && styles.portionsBadgeLow,
                        ]}>
                          <Text style={styles.portionsText}>
                            {item.portions}/{Math.max(item.initialPortions || 0, item.portions)} porz.
                          </Text>
                        </View>
                      </View>
                      {item.portions === 0 && (
                        <Text style={styles.missedSaleHint}>Tocca per registrare mancata vendita</Text>
                      )}
                    </View>
                    <View style={styles.menuItemActions}>
                      <TouchableOpacity
                        style={styles.actionButton}
                        testID={`menu-item-edit-${item.dishId}`}
                        onPress={(e) => {
                          e.stopPropagation();
                          openEditModal(item);
                        }}
                      >
                        <Ionicons name="create-outline" size={22} color="#00A1FF" />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.actionButton}
                        testID={`menu-item-remove-${item.dishId}`}
                        onPress={(e) => {
                          e.stopPropagation();
                          handleRemoveItem(item.dishId);
                        }}
                      >
                        <Ionicons name="trash-outline" size={22} color="#F2545B" />
                      </TouchableOpacity>
                    </View>
                  </TouchableOpacity>
</Appear>
                  ))}
                  </View>
                );
              })()}
            </View>
          </>
  );

  const renderCatalog = () => (
          <>
            {/* Available Dishes - Grouped by Category */}
            <View style={[styles.section, wideMenu && styles.sectionFill]} testID="menu-catalog-section">
              <View style={styles.sectionHeader}>
                <View style={styles.sectionTitleRow}>
                  <View style={[styles.sectionIcon, { backgroundColor: C.successSoft }]}><Ionicons name="add-circle-outline" size={18} color={C.success} /></View>
                  <Text style={styles.sectionTitle}>Catalogo piatti</Text>
                  <View style={styles.countPill}><Text style={styles.countPillText} testID="menu-catalog-count">{availableDishes.length}</Text></View>
                </View>
              </View>

              {/* Free-text search for available dishes */}
              <View style={styles.availableSearchContainer} testID="available-search-container">
                <Ionicons name="search" size={18} color="#5A6A85" style={{ marginRight: 8 }} />
                <TextInput
                  style={styles.availableSearchInput}
                  value={availableSearchQuery}
                  onChangeText={setAvailableSearchQuery}
                  placeholder="Cerca nel catalogo..."
                  placeholderTextColor="#5A6A85"
                  autoCapitalize="none"
                  autoCorrect={false}
                  testID="available-search-input"
                />
                {availableSearchQuery.length > 0 && (
                  <TouchableOpacity 
                    onPress={() => setAvailableSearchQuery('')}
                    testID="available-search-clear"
                  >
                    <Ionicons name="close-circle" size={20} color="#5A6A85" />
                  </TouchableOpacity>
                )}
              </View>

              {availableDishes.length === 0 ? (
                <View style={styles.emptySection}>
                  <Text style={styles.emptySectionText}>
                    {availableSearchQuery.trim() || selectedCategoryFilter
                      ? 'Nessun piatto trovato'
                      : 'Tutti i piatti sono già nel menu'}
                  </Text>
                </View>
              ) : (
                (() => {
                  // Group dishes by category
                  const groupedDishes: Record<string, Dish[]> = {};
                  availableDishes.forEach(dish => {
                    const catName = dish.categoryName || 'Senza Categoria';
                    if (!groupedDishes[catName]) groupedDishes[catName] = [];
                    groupedDishes[catName].push(dish);
                  });
                  
                  const searching = !!availableSearchQuery.trim();
                  return Object.entries(groupedDishes).map(([categoryName, dishesInCategory], catIdx) => {
                    const open = searching || !!selectedCategoryFilter || !!openCatalogCats[categoryName];
                    return (
                    <Appear key={`cat-${categoryName}`} index={catIdx} style={styles.catalogGroup}>
                      <TouchableOpacity
                        style={[styles.availableCategoryHeader, open && styles.availableCategoryHeaderOpen]}
                        onPress={() => setOpenCatalogCats((prev) => ({ ...prev, [categoryName]: !prev[categoryName] }))}
                        testID={`catalog-category-${categoryName}`}
                        activeOpacity={0.7}
                      >
                        <Ionicons name={open ? 'chevron-down' : 'chevron-forward'} size={18} color={C.text2} />
                        <Text style={styles.availableCategoryTitle}>{categoryName}</Text>
                        <View style={styles.countPill}><Text style={styles.countPillText}>{dishesInCategory.length}</Text></View>
                      </TouchableOpacity>
                      {open && dishesInCategory.map((dish, dishIdx) => (
                        <Appear key={dish.id} index={dishIdx}>
<TouchableOpacity
                          key={dish.id}
                          style={styles.dishCard}
                          onPress={() => openAddModal(dish)}
                          testID={`catalog-dish-${dish.id}`}
                        >
                          <View style={styles.dishInfo}>
                            <Text style={styles.dishName} numberOfLines={1}>{dish.name}</Text>
                            {dish.description && (
                              <Text style={styles.dishDescription} numberOfLines={1}>{dish.description}</Text>
                            )}
                            <Text style={styles.dishPrice}>
                              {isPreset(dish) ? `Già composto · ${priceText(dish.basePrice, dish, groupsForDish(dish, optionGroups))}` : dish.isComposable ? `Componibile · ${priceText(dish.basePrice, dish, groupsForDish(dish, optionGroups))}` : `Prezzo base: ${dish.basePrice.toFixed(2)} €`}
                            </Text>
                          </View>
                          <View style={styles.addDishButton}>
                            <Ionicons name="add" size={22} color="#fff" />
                          </View>
                        </TouchableOpacity>
</Appear>
                      ))}
                    </Appear>
                    );
                  });
                })()
              )}
            </View>
          </>
  );

  const renderLists = (currentMenu: DailyMenu) => wideMenu ? (
    <View style={styles.menuColumns}>
      <View style={styles.menuColLeft}>{renderMenuToday(currentMenu)}</View>
      <View style={styles.menuColRight}>{renderCatalog()}</View>
    </View>
  ) : (
    <>
      <View style={styles.menuTabs} testID="menu-mobile-tabs">
        {([['menu', 'Menu di oggi', currentMenu.items.length], ['catalog', 'Catalogo piatti', availableDishes.length]] as const).map(([key, label, n]) => (
          <TouchableOpacity key={key} style={[styles.menuTab, mobileMenuTab === key && styles.menuTabActive]} onPress={() => setMobileMenuTab(key)} testID={`menu-tab-${key}`}>
            <Text style={[styles.menuTabText, mobileMenuTab === key && styles.menuTabTextActive]}>{label}</Text>
            <View style={[styles.menuTabCount, mobileMenuTab === key && styles.menuTabCountActive]}>
              <Text style={[styles.menuTabCountText, mobileMenuTab === key && { color: C.primary }]}>{n}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>
      {mobileMenuTab === 'menu' ? renderMenuToday(currentMenu) : renderCatalog()}
    </>
  );

  return (
    <SafeAreaView style={styles.container}>

      {/* Header */}
      <PageHeader
        title="Menu del giorno"
        subtitle="Scegli i piatti, le porzioni e pubblica sul sito"
        testID="menu-header"
        right={<DatePill selectedDate={selectedDate} onChange={changeDate} compact={isCompact} idPrefix="menu-" />}
      />

      {/* Content */}
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentInner}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#00A1FF" />
        }
      >
        {!currentMenu ? (
          <View style={styles.noMenuContainer}>
            <Ionicons name="calendar-outline" size={64} color="#5A6A85" />
            <Text style={styles.noMenuText}>Nessun menu per questa data</Text>
            <TouchableOpacity style={styles.createMenuButton} onPress={handleCreateMenu}>
              <Ionicons name="add-circle" size={20} color="#fff" />
              <Text style={styles.createMenuButtonText}>Crea Menu</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* Pubblicazione sito web */}
            <View style={styles.publishBar} testID="publish-bar">
              <View style={styles.publishBarLeft}>
                <Ionicons
                  name={currentMenu.isPublished ? 'globe' : 'globe-outline'}
                  size={20}
                  color={currentMenu.isPublished ? '#16a34a' : '#5A6A85'}
                />
                <View style={{ flex: 1 }}>
                  <Text style={styles.publishBarTitle}>Pubblica sul sito</Text>
                  <Text style={styles.publishBarSubtitle} testID="publish-status-text">
                    {currentMenu.isPublished
                      ? `Online sul sito${currentMenu.publishedAt ? ' · inviato alle ' + format(new Date(currentMenu.publishedAt), 'HH:mm') : ''}`
                      : 'Attiva per inviare il menu al sito'}
                  </Text>
                </View>
              </View>
              <View style={styles.publishBarRight}>
                {publishLoading && <ActivityIndicator size="small" color="#16a34a" testID="publish-loading" />}
                {currentMenu.isPublished && !publishLoading && (
                  <TouchableOpacity
                    style={styles.publishInfoButton}
                    onPress={() => handleTogglePublish(true)}
                    testID="publish-resend-btn"
                  >
                    <Ionicons name="cloud-upload-outline" size={18} color="#2A3547" />
                    <Text style={styles.publishInfoButtonText}>Aggiorna</Text>
                  </TouchableOpacity>
                )}
                <Switch
                  testID="publish-toggle"
                  value={!!currentMenu.isPublished}
                  onValueChange={handleTogglePublish}
                  disabled={publishLoading}
                  trackColor={{ false: '#E0E6EB', true: '#86efac' }}
                  thumbColor={currentMenu.isPublished ? '#16a34a' : '#EFF4FA'}
                />
                <TouchableOpacity
                  style={styles.publishInfoButton}
                  onPress={() => setShowPublishModal(true)}
                  testID="publish-info-btn"
                >
                  <Ionicons name="code-slash-outline" size={18} color="#2A3547" />
                  <Text style={styles.publishInfoButtonText}>Codice</Text>
                </TouchableOpacity>
              </View>
            </View>

            {renderLists(currentMenu)}
          </>
        )}
      </ScrollView>

      {/* Confirm Dialog */}
      <Modal visible={!!confirmDialog?.visible} animationType="fade" transparent>
        <View style={styles.confirmOverlay}>
          <View style={styles.confirmDialog}>
            <Text style={styles.confirmTitle}>{confirmDialog?.title}</Text>
            <Text style={styles.confirmMessage}>{confirmDialog?.message}</Text>
            <View style={styles.confirmButtons}>
              <TouchableOpacity 
                style={styles.confirmButtonCancel} 
                onPress={() => setConfirmDialog(null)}
              >
                <Text style={styles.confirmButtonCancelText}>Annulla</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.confirmButtonConfirm} 
                onPress={confirmDialog?.onConfirm}
              >
                <Text style={styles.confirmButtonConfirmText}>Conferma</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Publish info Modal */}
      <Modal visible={showPublishModal} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent} testID="publish-modal">
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Menu sul sito</Text>
              <TouchableOpacity onPress={() => setShowPublishModal(false)} testID="publish-modal-close">
                <Ionicons name="close" size={24} color="#2A3547" />
              </TouchableOpacity>
            </View>
            <Text style={styles.publishHelpText}>
              Quando attivi "Pubblica sul sito", l'app crea il file menu.json e lo invia via FTP nella cartella menu del tuo sito. Premi "Aggiorna" dopo aver modificato piatti o prezzi.
            </Text>

            <Text style={styles.inputLabel}>Percorso del file sul sito</Text>
            <View style={styles.codeBox}>
              <Text style={styles.codeText} selectable testID="publish-json-path">{SITE_JSON_PATH}</Text>
            </View>
            <TouchableOpacity style={styles.copyButton} onPress={() => copyToClipboard(SITE_JSON_PATH, 'Percorso')} testID="publish-copy-path-btn">
              <Ionicons name="copy-outline" size={16} color="#ffffff" />
              <Text style={styles.copyButtonText}>Copia percorso</Text>
            </TouchableOpacity>

            <Text style={styles.inputLabel}>Esempio di lettura (JavaScript)</Text>
            <ScrollView style={styles.codeBoxScroll}>
              <Text style={styles.codeText} selectable testID="publish-js-snippet">{SITE_JS_SNIPPET}</Text>
            </ScrollView>
            <TouchableOpacity style={styles.copyButton} onPress={() => copyToClipboard(SITE_JS_SNIPPET, 'Codice')} testID="publish-copy-snippet-btn">
              <Ionicons name="copy-outline" size={16} color="#ffffff" />
              <Text style={styles.copyButtonText}>Copia codice</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Add Dish Modal */}
      <Modal visible={showAddDishModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Aggiungi al Menu</Text>
              <TouchableOpacity onPress={() => { setShowAddDishModal(false); resetForm(); }}>
                <Ionicons name="close" size={24} color="#2A3547" />
              </TouchableOpacity>
            </View>

            {selectedDish && (
              <>
                <Text style={styles.selectedDishName}>{selectedDish.name}</Text>
                
                <Text style={styles.inputLabel}>Porzioni Disponibili *</Text>
                <TextInput
                  style={styles.textInput}
                  value={portions}
                  onChangeText={setPortions}
                  placeholder="Numero di porzioni"
                  placeholderTextColor="#5A6A85"
                  keyboardType="number-pad"
                  testID="menu-add-portions-input"
                />

                <Text style={styles.inputLabel}>Prezzo Giornaliero *</Text>
                <TextInput
                  style={styles.textInput}
                  value={dailyPrice}
                  onChangeText={setDailyPrice}
                  placeholder="Prezzo in euro"
                  placeholderTextColor="#5A6A85"
                  keyboardType="decimal-pad"
                  testID="menu-add-price-input"
                />

                <Text style={styles.inputLabel}>Note Operative</Text>
                <TextInput
                  style={[styles.textInput, styles.textArea]}
                  value={notes}
                  onChangeText={setNotes}
                  placeholder="Note per la preparazione..."
                  placeholderTextColor="#5A6A85"
                  multiline
                  testID="menu-add-notes-input"
                />

                <TouchableOpacity style={styles.primaryButton} onPress={handleAddDish} testID="menu-add-dish-confirm">
                  <Text style={styles.primaryButtonText}>Aggiungi al Menu</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Edit Item Modal */}
      <Modal visible={showEditItemModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Modifica Piatto</Text>
              <TouchableOpacity onPress={() => { setShowEditItemModal(false); resetForm(); }}>
                <Ionicons name="close" size={24} color="#2A3547" />
              </TouchableOpacity>
            </View>

            {selectedItem && (
              <>
                <Text style={styles.selectedDishName}>{selectedItem.dishName}</Text>
                
                <Text style={styles.inputLabel}>Porzioni Disponibili</Text>
                <TextInput
                  style={styles.textInput}
                  value={portions}
                  onChangeText={setPortions}
                  placeholder="Numero di porzioni"
                  placeholderTextColor="#5A6A85"
                  keyboardType="number-pad"
                  testID="menu-edit-portions-input"
                />

                <Text style={styles.inputLabel}>Prezzo Giornaliero</Text>
                <TextInput
                  style={styles.textInput}
                  value={dailyPrice}
                  onChangeText={setDailyPrice}
                  placeholder="Prezzo in euro"
                  placeholderTextColor="#5A6A85"
                  keyboardType="decimal-pad"
                  testID="menu-edit-price-input"
                />

                <Text style={styles.inputLabel}>Note Operative</Text>
                <TextInput
                  style={[styles.textInput, styles.textArea]}
                  value={notes}
                  onChangeText={setNotes}
                  placeholder="Note per la preparazione..."
                  placeholderTextColor="#5A6A85"
                  multiline
                  testID="menu-edit-notes-input"
                />

                {itemGroups(selectedItem).length > 0 && (
                  <TodayOptionsToggles groups={itemGroups(selectedItem)} unavailable={todayUnavailable} onChange={setTodayUnavailable} />
                )}

                <TouchableOpacity style={styles.primaryButton} onPress={handleUpdateItem} testID="menu-item-save-btn">
                  <Text style={styles.primaryButtonText}>Salva Modifiche</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Missed Sale Modal - Simple quantity input */}
      <Modal visible={showMissedSaleModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Mancata Vendita</Text>
              <TouchableOpacity onPress={() => {
                setShowMissedSaleModal(false);
                setMissedSaleItem(null);
                setMissedSaleQuantity('1');
              }}>
                <Ionicons name="close" size={24} color="#2A3547" />
              </TouchableOpacity>
            </View>

            {missedSaleItem && (
              <>
                <View style={styles.missedSaleDishInfo}>
                  <Ionicons name="alert-circle" size={40} color="#F2545B" />
                  <Text style={styles.missedSaleDishName}>{missedSaleItem.dishName}</Text>
                  <Text style={styles.missedSaleExplanation}>
                    Quante porzioni sono state richieste?
                  </Text>
                </View>

                <View style={styles.quantityInputRow}>
                  <TouchableOpacity
                    style={styles.quantityButton}
                    onPress={() => setMissedSaleQuantity(Math.max(1, parseInt(missedSaleQuantity) - 1).toString())}
                  >
                    <Ionicons name="remove" size={28} color="#fff" />
                  </TouchableOpacity>
                  <TextInput
                    style={styles.quantityInputLarge}
                    value={missedSaleQuantity}
                    onChangeText={setMissedSaleQuantity}
                    keyboardType="number-pad"
                    textAlign="center"
                  />
                  <TouchableOpacity
                    style={styles.quantityButton}
                    onPress={() => setMissedSaleQuantity((parseInt(missedSaleQuantity) + 1).toString())}
                  >
                    <Ionicons name="add" size={28} color="#fff" />
                  </TouchableOpacity>
                </View>

                <TouchableOpacity style={styles.missedSaleButton} onPress={handleMissedSale}>
                  <Ionicons name="add-circle" size={20} color="#fff" />
                  <Text style={styles.missedSaleButtonText}>Registra Richiesta</Text>
                </TouchableOpacity>
                
                <Text style={styles.missedSaleHelpText}>
                  Questo aiuta a capire la domanda reale per aumentare le porzioni da produrre
                </Text>
              </>
            )}
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
  toast: {
    position: 'absolute',
    top: 60,
    left: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    zIndex: 1000,
  },
  toastSuccess: {
    backgroundColor: '#0E9F80',
  },
  toastError: {
    backgroundColor: '#F2545B',
  },
  toastText: {
    fontFamily: FONT,
    color: '#2A3547',
    fontSize: 15,
    fontWeight: '600',
    marginLeft: 12,
    flex: 1,
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
  noMenuContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
  },
  noMenuText: {
    fontFamily: FONT,
    color: '#5A6A85',
    fontSize: 18,
    marginTop: 16,
    marginBottom: 24,
  },
  createMenuButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#00A1FF',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 999,
  },
  createMenuButtonText: {
    fontFamily: FONT,
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  section: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#5A6A85',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E6EB',
  },
  sectionFill: {
    marginBottom: 0,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexShrink: 1,
  },
  sectionIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countPill: {
    minWidth: 26,
    height: 24,
    paddingHorizontal: 8,
    borderRadius: 12,
    backgroundColor: C.sunken,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countPillText: {
    fontFamily: FONT,
    fontSize: 12,
    fontWeight: '800',
    color: C.text2,
  },
  menuColumns: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
  },
  menuColLeft: {
    flex: 1.38,
    minWidth: 0,
  },
  menuColRight: {
    flex: 1,
    minWidth: 0,
  },
  menuTileGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 8,
  },
  menuTileCell: {
    padding: 6,
  },
  menuItemCardLow: {
    backgroundColor: C.warningSoft,
  },
  catalogGroup: {
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  availableCategoryHeaderOpen: {
    backgroundColor: C.hover,
  },
  menuTabs: {
    flexDirection: 'row',
    backgroundColor: C.sunken,
    borderRadius: 999,
    padding: 4,
    marginBottom: 14,
  },
  menuTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minHeight: 44,
    borderRadius: 999,
  },
  menuTabActive: {
    backgroundColor: C.primary,
  },
  menuTabText: {
    fontFamily: FONT,
    fontSize: 14,
    fontWeight: '700',
    color: C.text2,
  },
  menuTabTextActive: {
    color: '#fff',
  },
  menuTabCount: {
    minWidth: 24,
    height: 22,
    borderRadius: 11,
    paddingHorizontal: 7,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuTabCountActive: {
    backgroundColor: '#fff',
  },
  menuTabCountText: {
    fontFamily: FONT,
    fontSize: 12,
    fontWeight: '800',
    color: C.text2,
  },
  sectionTitle: {
    fontFamily: FONT,
    fontSize: 18,
    fontWeight: '600',
    color: '#2A3547',
  },
  emptySection: {
    padding: 24,
    alignItems: 'center',
  },
  emptySectionText: {
    fontFamily: FONT,
    color: '#5A6A85',
    fontSize: 14,
  },
  availableSearchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F4F7FB',
    borderRadius: 14,
    paddingHorizontal: 12,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: '#E0E6EB',
  },
  availableSearchInput: {
    fontFamily: FONT,
    flex: 1,
    color: '#2A3547',
    fontSize: 14,
    paddingVertical: 10,
    ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : null),
  },
  menuItemCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 14,
    borderRadius: 14,
    backgroundColor: C.primarySoft,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  menuItemInfo: {
    flex: 1,
    minWidth: 0,
  },
  menuItemName: {
    fontFamily: FONT,
    fontSize: 16,
    fontWeight: '600',
    color: '#2A3547',
  },
  menuItemComposable: {
    fontFamily: FONT,
    fontSize: 13,
    fontWeight: '700',
    color: '#0E9F80',
    marginTop: 2,
  },
  menuItemNotes: {
    fontFamily: FONT,
    fontSize: 13,
    color: '#5A6A85',
    marginTop: 4,
    fontStyle: 'italic',
  },
  menuItemDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 8,
  },
  menuItemPrice: {
    fontFamily: FONT,
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0E9F80',
    flexShrink: 0,
  },
  portionsBadge: {
    backgroundColor: '#0E9F80',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  portionsBadgeEmpty: {
    backgroundColor: '#F2545B',
  },
  portionsBadgeLow: {
    backgroundColor: '#FFAE1F',
  },
  portionsText: {
    fontFamily: FONT,
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  menuItemActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.85)',
    borderRadius: 999,
  },
  dishCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  dishInfo: {
    flex: 1,
  },
  dishName: {
    fontFamily: FONT,
    fontSize: 15,
    fontWeight: '700',
    color: '#2A3547',
  },
  dishDescription: {
    fontFamily: FONT,
    fontSize: 12,
    color: '#5A6A85',
    marginTop: 2,
  },
  dishPrice: {
    fontFamily: FONT,
    fontSize: 13,
    fontWeight: '600',
    color: '#0E9F80',
    marginTop: 3,
  },
  addDishButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: C.success,
    alignItems: 'center',
    justifyContent: 'center',
  },
  publishBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    gap: 12,
    shadowColor: '#5A6A85',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  publishBarLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  publishBarTitle: {
    fontFamily: FONT,
    fontSize: 15,
    fontWeight: '700',
    color: '#2A3547',
  },
  publishBarSubtitle: {
    fontFamily: FONT,
    fontSize: 12,
    color: '#5A6A85',
    marginTop: 2,
  },
  publishBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  publishInfoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F4F7FB',
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  publishInfoButtonText: {
    fontFamily: FONT,
    fontSize: 13,
    fontWeight: '600',
    color: '#2A3547',
  },
  publishHelpText: {
    fontFamily: FONT,
    fontSize: 14,
    color: '#5A6A85',
    lineHeight: 20,
  },
  codeBox: {
    backgroundColor: '#2A3547',
    borderRadius: 14,
    padding: 12,
  },
  codeBoxScroll: {
    backgroundColor: '#2A3547',
    borderRadius: 10,
    padding: 12,
    maxHeight: 200,
  },
  codeText: {
    color: '#FFAE1F',
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#0E9F80',
    borderRadius: 999,
    paddingVertical: 10,
    marginTop: 8,
  },
  copyButtonText: {
    fontFamily: FONT,
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  confirmOverlay: {
    flex: 1,
    backgroundColor: 'rgba(42, 53, 71, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmDialog: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    width: '85%',
    maxWidth: 400,
  },
  confirmTitle: {
    fontFamily: FONT,
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2A3547',
    marginBottom: 12,
  },
  confirmMessage: {
    fontFamily: FONT,
    fontSize: 16,
    color: '#5A6A85',
    marginBottom: 24,
  },
  confirmButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  confirmButtonCancel: {
    flex: 1,
    backgroundColor: '#E0E6EB',
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  confirmButtonCancelText: {
    fontFamily: FONT,
    color: '#2A3547',
    fontSize: 15,
    fontWeight: '600',
  },
  confirmButtonConfirm: {
    flex: 1,
    backgroundColor: '#00A1FF',
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  confirmButtonConfirmText: {
    fontFamily: FONT,
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
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
    maxHeight: '90%',
    ...Platform.select({ web: { overflowY: 'auto' as any } }),
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
  },
  selectedDishName: {
    fontFamily: FONT,
    fontSize: 18,
    fontWeight: '600',
    color: '#00A1FF',
    marginBottom: 16,
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
  primaryButton: {
    backgroundColor: '#00A1FF',
    padding: 16,
    borderRadius: 999,
    alignItems: 'center',
    marginTop: 24,
  },
  primaryButtonText: {
    fontFamily: FONT,
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  menuItemCardSoldOut: {
    borderColor: '#F9C4C6',
    backgroundColor: '#FDECEC',
  },
  menuItemNameRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  soldOutBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2545B',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    gap: 4,
  },
  soldOutText: {
    fontFamily: FONT,
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '700',
  },
  missedSaleHint: {
    fontFamily: FONT,
    color: '#F2545B',
    fontSize: 12,
    fontStyle: 'italic',
    marginTop: 8,
  },
  missedSaleDishInfo: {
    alignItems: 'center',
    paddingVertical: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E6EB',
    marginBottom: 24,
  },
  missedSaleDishName: {
    fontFamily: FONT,
    color: '#2A3547',
    fontSize: 22,
    fontWeight: '700',
    marginTop: 16,
    textAlign: 'center',
  },
  missedSaleExplanation: {
    fontFamily: FONT,
    color: '#5A6A85',
    fontSize: 15,
    marginTop: 8,
    textAlign: 'center',
  },
  quantityInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 24,
  },
  quantityButton: {
    backgroundColor: '#00A1FF',
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityInputLarge: {
    fontFamily: FONT,
    backgroundColor: '#F4F7FB',
    color: '#2A3547',
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
    width: 100,
    height: 60,
    borderRadius: 12,
  },
  missedSaleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F2545B',
    padding: 16,
    borderRadius: 999,
    gap: 8,
  },
  missedSaleButtonText: {
    fontFamily: FONT,
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  missedSaleHelpText: {
    fontFamily: FONT,
    color: '#98A4B8',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 16,
    fontStyle: 'italic',
  },
  categoryFilter: {
    borderBottomWidth: 1,
    borderBottomColor: '#E0E6EB',
  },
  categoryFilterContent: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 8,
  },
  categoryChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: '#F4F7FB',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#E0E6EB',
  },
  categoryChipActive: {
    backgroundColor: '#00A1FF',
    borderColor: '#00A1FF',
  },
  categoryChipText: {
    fontFamily: FONT,
    color: '#5A6A85',
    fontSize: 13,
    fontWeight: '500',
  },
  categoryChipTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  categoryBadge: {
    backgroundColor: '#E0E6EB',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  categoryBadgeText: {
    fontFamily: FONT,
    color: '#5A6A85',
    fontSize: 10,
    fontWeight: '600',
  },
  printMenuButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0E9F80',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    gap: 6,
  },
  printMenuButtonText: {
    fontFamily: FONT,
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
  },
  availableCategoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    minHeight: 50,
  },
  availableCategoryTitle: {
    fontFamily: FONT,
    color: '#00A1FF',
    fontSize: 14,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  availableCategoryCount: {
    fontFamily: FONT,
    color: '#5A6A85',
    fontSize: 12,
    fontWeight: '500',
  },
  // Share options styles
  shareOptionsPanel: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#0E9F80',
  },
  shareOptionsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  shareOptionsTitle: {
    fontFamily: FONT,
    color: '#2A3547',
    fontSize: 14,
    fontWeight: '600',
  },
  shareCategoriesList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  shareCategoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F4F7FB',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 999,
    gap: 6,
  },
  shareCategoryChipActive: {
    backgroundColor: '#E1F7F1',
    borderWidth: 1,
    borderColor: '#0E9F80',
  },
  shareCategoryText: {
    fontFamily: FONT,
    color: '#5A6A85',
    fontSize: 13,
  },
  shareCategoryTextActive: {
    color: '#2A3547',
  },
  shareConfirmButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0E9F80',
    padding: 12,
    borderRadius: 999,
    gap: 8,
  },
  shareConfirmButtonDisabled: {
    backgroundColor: '#555',
    opacity: 0.6,
  },
  shareConfirmButtonText: {
    fontFamily: FONT,
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
});
