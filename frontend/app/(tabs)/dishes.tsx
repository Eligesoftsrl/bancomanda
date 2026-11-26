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
} from 'react-native';
import { ChipScroller } from '../../src/components/ChipScroller';
import { notify } from '../../src/store/toastStore';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAppStore } from '../../src/store/appStore';
import { dishesApi, categoriesApi , optionGroupsApi } from '../../src/services/api';
import { Dish, Category } from '../../src/types';
import { sortCategoriesByFixedOrder, sortDishesByCategory } from '../../src/utils/categoryOrder';
import { DishLabelsPicker } from '../../src/components/DishLabelsPicker';
import { DishLabelsSummary } from '../../src/components/DishLabelsSummary';


import { OptionGroupsManager } from '../../src/components/composable/OptionGroupsManager';
import { ComposableDishFields } from '../../src/components/composable/ComposableDishFields';
import { OptionGroup } from '../../src/types';
import { fromPrice, groupsForDish, euro } from '../../src/utils/composition';
import { C, FONT } from '../../src/theme/tokens';
import { Appear } from '../../src/components/motion/Appear';
import { PageHeader } from '../../src/components/ui2/PageHeader';
import { HeaderButton } from '../../src/components/ui2/HeaderButton';
import { useWideLayout } from '../../src/theme/layout';

export default function DishesScreen() {
  const { contentWidth } = useWideLayout();
  const cols = contentWidth >= 1180 ? 3 : contentWidth >= 700 ? 2 : 1;
  const cellW = `${100 / cols}%` as const;
  const { dishes, setDishes } = useAppStore();
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showDishModal, setShowDishModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingDish, setEditingDish] = useState<Dish | null>(null);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [showInactive, setShowInactive] = useState(false);
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string | null>(null);
  
  // Sort categories by fixed order: Primi, Secondi, Contorni, Piatti Freddi, Fuori Menù, then rest
  const sortedCategories = useMemo(() => sortCategoriesByFixedOrder(categories), [categories]);
  
  // Sort dishes by category order
  const sortedDishes = useMemo(() => sortDishesByCategory(dishes, categories), [dishes, categories]);
  
  // Toast state
  // Avviso globale: visibile anche sopra le finestre aperte
  const showToast = (message: string, type: 'success' | 'error' = 'success') => notify(message, type);
  
  // Dish form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [basePrice, setBasePrice] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [tags, setTags] = useState<string[]>([]);
  const [allergens, setAllergens] = useState<string[]>([]);
  const [isComposable, setIsComposable] = useState(false);
  const [optionGroupIds, setOptionGroupIds] = useState<string[]>([]);
  const [optionGroups, setOptionGroups] = useState<OptionGroup[]>([]);
  const [showGroupsModal, setShowGroupsModal] = useState(false);
  
  // Category form state
  const [categoryName, setCategoryName] = useState('');
  const [categoryOrder, setCategoryOrder] = useState('');

  // Search state (OP07)
  const [searchQuery, setSearchQuery] = useState('');

  // Confirm dialog state
  const [confirmDialog, setConfirmDialog] = useState<{ visible: boolean; title: string; message: string; onConfirm: () => void } | null>(null);

  const [loadedOnce, setLoadedOnce] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [dishesData, categoriesData, groupsData] = await Promise.all([
        dishesApi.getAll(!showInactive, selectedCategoryFilter || undefined),
        categoriesApi.getAll(),
        optionGroupsApi.getAll(),
      ]);
      setDishes(dishesData);
      setCategories(categoriesData);
      setOptionGroups(groupsData);
    } catch (error) {
      console.error('Error loading data:', error);
      showToast('Impossibile caricare i dati', 'error');
    } finally {
      setIsLoading(false);
      setLoadedOnce(true);
    }
  }, [showInactive, selectedCategoryFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const resetDishForm = () => {
    setName('');
    setDescription('');
    setBasePrice('');
    setSelectedCategoryId(null);
    setIsFavorite(false);
    setTags([]);
    setAllergens([]);
    setIsComposable(false);
    setOptionGroupIds([]);
    setEditingDish(null);
  };

  const resetCategoryForm = () => {
    setCategoryName('');
    setCategoryOrder('');
    setEditingCategory(null);
  };

  const openCreateDishModal = () => {
    resetDishForm();
    setShowDishModal(true);
  };

  const openEditDishModal = (dish: Dish) => {
    setEditingDish(dish);
    setName(dish.name);
    setDescription(dish.description || '');
    setBasePrice(dish.basePrice.toString());
    setSelectedCategoryId(dish.categoryId || null);
    setIsFavorite(dish.isFavorite || false);
    setTags(dish.tags || []);
    setAllergens(dish.allergens || []);
    setIsComposable(!!dish.isComposable);
    setOptionGroupIds(dish.optionGroupIds || []);
    setShowDishModal(true);
  };

  const openCreateCategoryModal = () => {
    resetCategoryForm();
    setCategoryOrder((categories.length + 1).toString());
    setShowCategoryModal(true);
  };

  const openEditCategoryModal = (category: Category) => {
    setEditingCategory(category);
    setCategoryName(category.name);
    setCategoryOrder(category.order.toString());
    setShowCategoryModal(true);
  };

  const handleSaveDish = async () => {
    if (!name.trim()) {
      showToast('Inserisci il nome del piatto', 'error');
      return;
    }

    // Piatto componibile: il prezzo di partenza può essere 0 (lo danno le scelte)
    const price = parseFloat((basePrice || (isComposable ? '0' : '')).replace(',', '.'));
    if (isNaN(price) || price < 0 || (price === 0 && !isComposable)) {
      showToast('Inserisci un prezzo valido', 'error');
      return;
    }
    if (isComposable && optionGroupIds.length === 0) {
      showToast('Scegli almeno un gruppo di scelta', 'error');
      return;
    }

    try {
      if (editingDish) {
        const updated = await dishesApi.update(editingDish.id, {
          name: name.trim(),
          description: description.trim(),
          basePrice: price,
          categoryId: selectedCategoryId || undefined,
          isFavorite,
          tags,
          allergens,
          isComposable,
          optionGroupIds,
        });
        setDishes(dishes.map(d => d.id === updated.id ? updated : d));
        showToast('Piatto aggiornato');
      } else {
        const newDish = await dishesApi.create({
          name: name.trim(),
          description: description.trim(),
          basePrice: price,
          categoryId: selectedCategoryId || undefined,
          isFavorite,
          tags,
          allergens,
          isComposable,
          optionGroupIds,
        });
        setDishes([newDish, ...dishes]);
        showToast('Piatto creato');
      }
      
      setShowDishModal(false);
      resetDishForm();
    } catch (error: any) {
      showToast(error.response?.data?.detail || 'Impossibile salvare il piatto', 'error');
    }
  };

  const handleSaveCategory = async () => {
    if (!categoryName.trim()) {
      showToast('Inserisci il nome della categoria', 'error');
      return;
    }

    const order = parseInt(categoryOrder) || 0;

    try {
      if (editingCategory) {
        const updated = await categoriesApi.update(editingCategory.id, {
          name: categoryName.trim(),
          order,
        });
        setCategories(categories.map(c => c.id === updated.id ? updated : c));
        showToast('Categoria aggiornata');
      } else {
        const newCategory = await categoriesApi.create({
          name: categoryName.trim(),
          order,
        });
        setCategories([...categories, newCategory].sort((a, b) => a.order - b.order));
        showToast('Categoria creata');
      }
      
      setShowCategoryModal(false);
      resetCategoryForm();
    } catch (error: any) {
      showToast(error.response?.data?.detail || 'Impossibile salvare la categoria', 'error');
    }
  };

  const handleDeleteCategory = async (category: Category) => {
    setConfirmDialog({
      visible: true,
      title: 'Elimina Categoria',
      message: `Vuoi eliminare la categoria "${category.name}"?`,
      onConfirm: async () => {
        try {
          await categoriesApi.delete(category.id);
          setCategories(categories.filter(c => c.id !== category.id));
          if (selectedCategoryFilter === category.id) {
            setSelectedCategoryFilter(null);
          }
          showToast('Categoria eliminata');
        } catch (error: any) {
          showToast(error.response?.data?.detail || 'Impossibile eliminare la categoria', 'error');
        }
        setConfirmDialog(null);
      },
    });
  };

  const handleDeactivateDish = (dish: Dish) => {
    setConfirmDialog({
      visible: true,
      title: 'Disattiva Piatto',
      message: `Vuoi disattivare il piatto "${dish.name}"?`,
      onConfirm: async () => {
        try {
          await dishesApi.deactivate(dish.id);
          setDishes(dishes.filter(d => d.id !== dish.id));
          showToast('Piatto disattivato');
        } catch (error: any) {
          showToast(error.response?.data?.detail || 'Impossibile disattivare il piatto', 'error');
        }
        setConfirmDialog(null);
      },
    });
  };

  const handleReactivateDish = async (dish: Dish) => {
    try {
      const updated = await dishesApi.update(dish.id, { active: true });
      setDishes(dishes.map(d => d.id === updated.id ? updated : d));
      showToast('Piatto riattivato');
    } catch (error: any) {
      showToast(error.response?.data?.detail || 'Impossibile riattivare il piatto', 'error');
    }
  };

  // Group dishes by category (with search filter - OP07)
  // Use sortedDishes for proper category ordering
  const filteredBySearch = searchQuery.trim() 
    ? sortedDishes.filter(d => d.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : sortedDishes;
    
  const groupedDishes = filteredBySearch.reduce((acc, dish) => {
    const categoryName = dish.categoryName || 'Senza categoria';
    if (!acc[categoryName]) {
      acc[categoryName] = [];
    }
    acc[categoryName].push(dish);
    return acc;
  }, {} as Record<string, Dish[]>);
  
  // Get sorted category names based on fixed order
  const sortedCategoryNames = sortedCategories
    .map(c => c.name)
    .filter(name => groupedDishes[name]);
  
  // Add "Senza categoria" at the end if present
  if (groupedDishes['Senza categoria']) {
    sortedCategoryNames.push('Senza categoria');
  }

  // Caricamento a tutta pagina solo la prima volta: cambiando filtro la riga delle categorie resta dov'era
  if (isLoading && !loadedOnce) {
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
        title="Piatti"
        subtitle="Anagrafica, categorie e gruppi di scelta"
        testID="dishes-header"
        right={
          <>
            <HeaderButton icon={showInactive ? 'eye' : 'eye-off-outline'} label={showInactive ? 'Tutti' : 'Attivi'} onPress={() => setShowInactive(!showInactive)} active={showInactive} testID="dishes-show-inactive-button" />
            <HeaderButton icon="pricetag-outline" label="Categorie" tone="secondary" onPress={openCreateCategoryModal} testID="dishes-categories-button" />
            <HeaderButton icon="layers-outline" label="Gruppi" tone="success" onPress={() => setShowGroupsModal(true)} testID="dishes-option-groups-button" />
            <HeaderButton icon="add" label="Nuovo piatto" tone="primary" onPress={openCreateDishModal} testID="dishes-new-button" />
          </>
        }
      />

      {/* Search Bar (OP07) */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={18} color="#5A6A85" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Cerca piatto..."
          placeholderTextColor="#98A4B8"
          value={searchQuery}
          onChangeText={setSearchQuery}
          testID="dishes-search-input"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.searchClear}>
            <Ionicons name="close-circle" size={18} color="#5A6A85" />
          </TouchableOpacity>
        )}
      </View>

      {/* Category Filter - Fixed height chips */}
      <View style={styles.categoryFilterWrapper}>
        <ChipScroller contentContainerStyle={styles.categoryFilterContent} testID="dishes-category-filter">
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
              onLongPress={() => openEditCategoryModal(category)}
            >
              <Text style={[styles.categoryChipText, selectedCategoryFilter === category.id && styles.categoryChipTextActive]}>
                {category.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ChipScroller>
      </View>

      {/* Content */}
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentInner}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#00A1FF" />
        }
      >
        {dishes.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="fast-food-outline" size={64} color="#5A6A85" />
            <Text style={styles.emptyStateText}>Nessun piatto trovato</Text>
            <Text style={styles.emptyStateSubtext}>Crea il tuo primo piatto</Text>
          </View>
        ) : (
          sortedCategoryNames.map((categoryName) => {
            const categoryDishes = groupedDishes[categoryName];
            return (
            <View key={categoryName} style={styles.categorySection}>
              <Text style={styles.categorySectionTitle}>{categoryName}</Text>
              <View style={styles.dishGrid}>
              {categoryDishes.map((dish, dishIdx) => (
                <Appear index={dishIdx} key={dish.id} style={[styles.gridCell, { width: cellW }]}>
                <View style={[styles.dishCard, !dish.active && styles.dishCardInactive]} testID={`dish-card-${dish.id}`}>
                  <View style={styles.dishHeader}>
                    <View style={styles.dishNameRow}>
                      <Text style={styles.dishName}>{dish.name}</Text>
                      {dish.isFavorite && (
                        <Ionicons name="heart" size={18} color="#00A1FF" style={styles.favoriteIcon} />
                      )}
                    </View>
                    {!dish.active && (
                      <View style={styles.inactiveBadge}>
                        <Text style={styles.inactiveBadgeText}>Disattivo</Text>
                      </View>
                    )}
                  </View>
                  
                  {!!dish.description && (
                    <Text style={styles.dishDescription}>{dish.description}</Text>
                  )}

                  <DishLabelsSummary tags={dish.tags} allergens={dish.allergens} dishId={dish.id} />

                  {dish.isComposable && (
                    <View style={styles.composableBadge} testID={`dish-composable-badge-${dish.id}`}>
                      <Ionicons name="layers" size={14} color="#0E9F80" />
                      <Text style={styles.composableBadgeText}>
                        Componibile · {groupsForDish(dish, optionGroups).map(g => g.name).join(' + ') || 'nessun gruppo'}
                      </Text>
                    </View>
                  )}
                  
                  <View style={styles.dishPriceRow}>
                    <Text style={styles.dishPrice}>
                      {dish.isComposable ? `da ${euro(fromPrice(dish.basePrice, groupsForDish(dish, optionGroups)))}` : `${dish.basePrice.toFixed(2)} €`}
                    </Text>
                    {dish.isFavorite && (
                      <Text style={styles.favoriteText}>Auto Menu</Text>
                    )}
                  </View>
                  
                  <View style={styles.dishActions}>
                    <TouchableOpacity
                      style={[styles.dishActionButton, styles.editButton]}
                      onPress={() => openEditDishModal(dish)}
                      testID={`dish-edit-${dish.id}`}
                    >
                      <Ionicons name="create-outline" size={18} color={C.primaryDark} />
                      <Text style={[styles.dishActionText, { color: C.primaryDark }]}>Modifica</Text>
                    </TouchableOpacity>
                    
                    {dish.active ? (
                      <TouchableOpacity
                        style={[styles.dishActionButton, styles.deactivateButton]}
                        onPress={() => handleDeactivateDish(dish)}
                        testID={`dish-deactivate-${dish.id}`}
                      >
                        <Ionicons name="eye-off-outline" size={18} color={C.errorFg} />
                        <Text style={[styles.dishActionText, { color: C.errorFg }]}>Disattiva</Text>
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity
                        style={[styles.dishActionButton, styles.activateButton]}
                        onPress={() => handleReactivateDish(dish)}
                        testID={`dish-reactivate-${dish.id}`}
                      >
                        <Ionicons name="eye-outline" size={18} color={C.success} />
                        <Text style={[styles.dishActionText, { color: C.success }]}>Riattiva</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
                </Appear>
              ))}
              </View>
            </View>
          )})
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

      {/* Dish Modal */}
      <Modal visible={showDishModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingDish ? 'Modifica Piatto' : 'Nuovo Piatto'}
              </Text>
              <TouchableOpacity onPress={() => { setShowDishModal(false); resetDishForm(); }}>
                <Ionicons name="close" size={24} color="#2A3547" />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.modalScroll}
              showsVerticalScrollIndicator={Platform.OS === 'web'}
              testID="dish-modal-scroll"
            >
              <Text style={styles.inputLabel}>Nome Piatto *</Text>
              <TextInput
                style={styles.textInput}
                value={name}
                onChangeText={setName}
                placeholder="Es: Pasta al pomodoro"
                placeholderTextColor="#5A6A85"
                testID="dish-name-input"
              />

              <Text style={styles.inputLabel}>Categoria</Text>
              <View style={styles.categorySelector} testID="dish-category-selector">
                <TouchableOpacity
                  style={[styles.categorySelectorChip, !selectedCategoryId && styles.categorySelectorChipActive]}
                  onPress={() => setSelectedCategoryId(null)}
                  testID="dish-category-chip-none"
                >
                  <Text style={[styles.categorySelectorChipText, !selectedCategoryId && styles.categorySelectorChipTextActive]}>
                    Nessuna
                  </Text>
                </TouchableOpacity>
                {sortedCategories.map((category) => (
                  <TouchableOpacity
                    key={category.id}
                    style={[styles.categorySelectorChip, selectedCategoryId === category.id && styles.categorySelectorChipActive]}
                    onPress={() => setSelectedCategoryId(category.id)}
                    testID={`dish-category-chip-${category.id}`}
                  >
                    <Text style={[styles.categorySelectorChipText, selectedCategoryId === category.id && styles.categorySelectorChipTextActive]}>
                      {category.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.inputLabel}>Descrizione</Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                value={description}
                onChangeText={setDescription}
                placeholder="Descrizione del piatto..."
                placeholderTextColor="#5A6A85"
                multiline
              />

              <Text style={styles.inputLabel}>{isComposable ? 'Prezzo di partenza (€) · 0 se lo danno le scelte' : 'Prezzo Base (€) *'}</Text>
              <TextInput
                style={styles.textInput}
                value={basePrice}
                onChangeText={setBasePrice}
                placeholder="Es: 8.50"
                placeholderTextColor="#5A6A85"
                keyboardType="decimal-pad"
                testID="dish-price-input"
              />

              {/* Favorite Toggle */}
              <TouchableOpacity 
                style={[styles.favoriteToggle, isFavorite && styles.favoriteToggleActive]}
                onPress={() => setIsFavorite(!isFavorite)}
              >
                <Ionicons 
                  name={isFavorite ? "heart" : "heart-outline"} 
                  size={24} 
                  color={isFavorite ? "#00A1FF" : "#5A6A85"} 
                />
                <View style={styles.favoriteToggleText}>
                  <Text style={[styles.favoriteToggleLabel, isFavorite && styles.favoriteToggleLabelActive]}>
                    Piatto Preferito
                  </Text>
                  <Text style={styles.favoriteToggleHint}>
                    Aggiunto automaticamente al menu del giorno
                  </Text>
                </View>
              </TouchableOpacity>

              <ComposableDishFields
                enabled={isComposable}
                groupIds={optionGroupIds}
                groups={optionGroups}
                onToggle={() => setIsComposable(!isComposable)}
                onChangeGroups={setOptionGroupIds}
              />

              <DishLabelsPicker
                tags={tags}
                allergens={allergens}
                onChangeTags={setTags}
                onChangeAllergens={setAllergens}
              />
            </ScrollView>

            {/* Fuori dallo scroll: il salvataggio resta sempre visibile */}
            <TouchableOpacity style={[styles.primaryButton, styles.modalFooterButton]} onPress={handleSaveDish} testID="dish-save-button">
              <Text style={styles.primaryButtonText}>
                {editingDish ? 'Salva Modifiche' : 'Crea Piatto'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <OptionGroupsManager
        visible={showGroupsModal}
        groups={optionGroups}
        onClose={() => setShowGroupsModal(false)}
        onChanged={setOptionGroups}
      />

      {/* Category Modal */}
      <Modal visible={showCategoryModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingCategory ? 'Modifica Categoria' : 'Nuova Categoria'}
              </Text>
              <TouchableOpacity onPress={() => { setShowCategoryModal(false); resetCategoryForm(); }}>
                <Ionicons name="close" size={24} color="#2A3547" />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Nome Categoria *</Text>
            <TextInput
              style={styles.textInput}
              value={categoryName}
              onChangeText={setCategoryName}
              placeholder="Es: Primi, Secondi, Dolci..."
              placeholderTextColor="#5A6A85"
            />

            <Text style={styles.inputLabel}>Ordine</Text>
            <TextInput
              style={styles.textInput}
              value={categoryOrder}
              onChangeText={setCategoryOrder}
              placeholder="1"
              placeholderTextColor="#5A6A85"
              keyboardType="number-pad"
            />

            <TouchableOpacity style={styles.primaryButton} onPress={handleSaveCategory}>
              <Text style={styles.primaryButtonText}>
                {editingCategory ? 'Salva Modifiche' : 'Crea Categoria'}
              </Text>
            </TouchableOpacity>

            {editingCategory && (
              <TouchableOpacity 
                style={styles.deleteButton} 
                onPress={() => {
                  setShowCategoryModal(false);
                  handleDeleteCategory(editingCategory);
                }}
              >
                <Ionicons name="trash-outline" size={18} color="#fff" />
                <Text style={styles.deleteButtonText}>Elimina Categoria</Text>
              </TouchableOpacity>
            )}

            {/* Categories List */}
            <Text style={[styles.inputLabel, { marginTop: 24 }]}>Categorie Esistenti</Text>
            <ScrollView style={styles.categoriesList}>
              {sortedCategories.map((category) => (
                <TouchableOpacity
                  key={category.id}
                  style={styles.categoryListItem}
                  onPress={() => openEditCategoryModal(category)}
                >
                  <View style={styles.categoryOrderBadge}>
                    <Text style={styles.categoryOrderText}>{category.order}</Text>
                  </View>
                  <Text style={styles.categoryListItemText}>{category.name}</Text>
                  <Ionicons name="chevron-forward" size={20} color="#5A6A85" />
                </TouchableOpacity>
              ))}
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
    marginBottom: 12,
  },
  headerActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E0E6EB',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  filterButtonActive: {
    backgroundColor: '#00A1FF',
  },
  filterButtonText: {
    fontFamily: FONT,
    color: '#ffffff',
    marginLeft: 6,
    fontWeight: '500',
    fontSize: 13,
  },
  categoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#8965E5',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  categoryButtonText: {
    fontFamily: FONT,
    color: '#ffffff',
    marginLeft: 6,
    fontWeight: '500',
    fontSize: 13,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#00A1FF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  addButtonText: {
    fontFamily: FONT,
    color: '#ffffff',
    fontWeight: '600',
    marginLeft: 6,
    fontSize: 13,
  },
  categoryFilterWrapper: {
    height: 60,
  },
  categoryFilterContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'center',
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 999,
    marginRight: 8,
    height: 38,
    justifyContent: 'center',
  },
  categoryChipActive: {
    backgroundColor: '#00A1FF',
    borderColor: '#00A1FF',
  },
  categoryChipText: {
    fontFamily: FONT,
    color: '#5A6A85',
    fontSize: 14,
    fontWeight: '500',
  },
  categoryChipTextActive: {
    color: '#ffffff',
    fontWeight: '700',
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
  emptyStateSubtext: {
    fontFamily: FONT,
    color: '#98A4B8',
    fontSize: 14,
    marginTop: 8,
  },
  categorySection: {
    marginBottom: 20,
  },
  categorySectionTitle: {
    fontFamily: FONT,
    fontSize: 18,
    fontWeight: '600',
    color: '#00A1FF',
    marginBottom: 12,
    paddingLeft: 4,
  },
  dishGrid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -6 },
  gridCell: { paddingHorizontal: 6, marginBottom: 12 },
  dishCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: C.border,
    shadowColor: '#5A6A85',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 2,
  },
  dishCardInactive: {
    opacity: 0.6,
  },
  dishHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  dishName: {
    fontFamily: FONT,
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2A3547',
    flex: 1,
  },
  inactiveBadge: {
    backgroundColor: '#F2545B',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  inactiveBadgeText: {
    fontFamily: FONT,
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '600',
  },
  dishDescription: {
    fontFamily: FONT,
    fontSize: 13,
    color: '#5A6A85',
    marginBottom: 8,
  },
  dishPrice: {
    fontFamily: FONT,
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0E9F80',
    marginBottom: 12,
  },
  dishActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 'auto',
  },
  dishActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    borderRadius: 999,
  },
  editButton: {
    backgroundColor: C.primarySoft,
  },
  deactivateButton: {
    backgroundColor: C.errorSoft,
  },
  activateButton: {
    backgroundColor: C.successSoft,
  },
  dishActionText: {
    fontFamily: FONT,
    color: '#ffffff',
    fontWeight: '700',
    marginLeft: 6,
    fontSize: 13,
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
  categorySelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  categorySelectorChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: '#F4F7FB',
    borderRadius: 999,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  categorySelectorChipActive: {
    borderColor: '#00A1FF',
    backgroundColor: '#00A1FF',
  },
  categorySelectorChipText: {
    fontFamily: FONT,
    color: '#5A6A85',
    fontSize: 14,
  },
  categorySelectorChipTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  primaryButton: {
    backgroundColor: '#00A1FF',
    padding: 16,
    borderRadius: 999,
    alignItems: 'center',
    marginTop: 24,
  },
  modalScroll: {
    flexShrink: 1,
    paddingRight: Platform.OS === 'web' ? 8 : 0,
  },
  modalFooterButton: {
    marginTop: 16,
  },
  primaryButtonText: {
    fontFamily: FONT,
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F2545B',
    padding: 14,
    borderRadius: 999,
    marginTop: 12,
  },
  deleteButtonText: {
    fontFamily: FONT,
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  categoriesList: {
    maxHeight: 200,
    marginTop: 8,
  },
  categoryListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F4F7FB',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  categoryOrderBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#00A1FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  categoryOrderText: {
    fontFamily: FONT,
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 12,
  },
  categoryListItemText: {
    fontFamily: FONT,
    flex: 1,
    color: '#2A3547',
    fontSize: 15,
  },
  dishNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  favoriteIcon: {
    marginLeft: 8,
  },
  composableBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: '#EAF6F0',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    marginTop: 6,
  },
  composableBadgeText: {
    fontFamily: FONT,
    fontSize: 12,
    fontWeight: '700',
    color: '#0E9F80',
  },
  dishPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  favoriteText: {
    fontFamily: FONT,
    color: '#00A1FF',
    fontSize: 12,
    fontWeight: '600',
    backgroundColor: 'rgba(233, 69, 96, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  favoriteToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F4F7FB',
    padding: 14,
    borderRadius: 10,
    marginTop: 16,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  favoriteToggleActive: {
    borderColor: '#00A1FF',
    backgroundColor: 'rgba(233, 69, 96, 0.1)',
  },
  favoriteToggleText: {
    marginLeft: 12,
    flex: 1,
  },
  favoriteToggleLabel: {
    fontFamily: FONT,
    color: '#5A6A85',
    fontSize: 16,
    fontWeight: '600',
  },
  favoriteToggleLabelActive: {
    color: '#2A3547',
  },
  favoriteToggleHint: {
    fontFamily: FONT,
    color: '#98A4B8',
    fontSize: 12,
    marginTop: 2,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    marginTop: 14,
    marginBottom: 4,
    borderRadius: 999,
    paddingHorizontal: 16,
    minHeight: 46,
    borderWidth: 1,
    borderColor: '#E0E6EB',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    fontFamily: FONT,
    flex: 1,
    color: '#2A3547',
    fontSize: 14,
    paddingVertical: 10,
  },
  searchClear: {
    padding: 4,
  },
});
