// Types for the Restaurant POS System

export interface Category {
  id: string;
  name: string;
  order: number;
  createdAt: string;
}

export interface Dish {
  id: string;
  name: string;
  description: string;
  basePrice: number;
  categoryId?: string;
  categoryName?: string;
  active: boolean;
  isFavorite: boolean;
  tags?: string[];
  allergens?: string[];
  isComposable?: boolean;
  optionGroupIds?: string[];
  createdAt: string;
}

// Piatti componibili: gruppi di scelta (es. Base, Proteine)
export interface OptionItem {
  id?: string;
  name: string;
  price: number;
  allergens: string[];
  active: boolean;
}

export interface OptionGroup {
  id: string;
  name: string;
  minSelect: number;
  maxSelect: number | null;  // null = nessun limite
  allowRepeat: boolean;
  options: OptionItem[];
  order: number;
}

export interface CompositionEntry {
  groupId: string;
  groupName: string;
  optionId: string;
  name: string;
  price: number;
  quantity: number;
}

// optionId -> quantità scelta
export type Selections = Record<string, number>;

export interface MenuItem {
  dishId: string;
  dishName: string;
  categoryId?: string;
  categoryName?: string;
  portions: number;
  initialPortions?: number;  // Porzioni iniziali per tracciamento
  dailyPrice: number;
  notes: string;
  unavailableOptionIds?: string[];  // ingredienti esauriti oggi
}

export interface DailyMenu {
  id: string;
  date: string;
  items: MenuItem[];
  createdAt: string;
  isPublished?: boolean;
  publishedAt?: string | null;
}

export interface OrderItem {
  dishId: string;
  dishName: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  itemStatus: 'pending' | 'ready' | 'problem';
  isCustomItem?: boolean;
  sendToKitchen?: boolean;
  notes?: string;
  composition?: CompositionEntry[];
}

export interface Order {
  id: string;
  orderNumber: number;
  menuDate: string;
  channel: string;
  serviceType: 'in_sede' | 'da_ritirare' | 'da_consegnare';
  items: OrderItem[];
  total: number;
  status: 'in_attesa' | 'in_preparazione' | 'pronto' | 'sospeso' | 'consegnato' | 'annullato' | 'completato';
  isPaid: boolean;
  receiptImage?: string;
  customerId?: string;
  customerName?: string;
  notes: string;
  deliveryTime?: string;
  createdAt: string;
}

export interface MissedSale {
  id: string;
  dishName: string;
  date: string;
  timeSlot: string;
  channel: string;
  quantity: number;
  customerId?: string;
  customerName?: string;
  reason: 'esaurito' | 'non_nel_menu';
  createdAt: string;
}

export interface Customer {
  id: string;
  name: string;
  customerType: 'persona' | 'societa';
  partitaIva: string;
  phone: string;
  email: string;
  address: string;
  requiresInvoice: boolean;
  notes: string;
  createdAt: string;
}

export interface DailySummary {
  date: string;
  totalOrders: number;
  totalRevenue: number;
  dishSales: {
    dishName: string;
    quantity: number;
    revenue: number;
  }[];
  channelBreakdown: Record<string, number>;
  menuItems: MenuItem[];
}
