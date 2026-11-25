import { CompositionEntry, Dish, OptionGroup, Selections } from '../types';

export const euro = (v: number) => `${v.toFixed(2).replace('.', ',')} €`;

// Gruppi del piatto nell'ordine scelto in anagrafica
export const groupsForDish = (dish: Dish | undefined, all: OptionGroup[]): OptionGroup[] => {
  if (!dish?.isComposable) return [];
  return (dish.optionGroupIds || [])
    .map((id) => all.find((g) => g.id === id))
    .filter((g): g is OptionGroup => !!g);
};

// "Insalata mista + Pollo ×2, Uova"
export const compositionText = (c?: CompositionEntry[]) => {
  if (!c?.length) return '';
  const order: string[] = [];
  const byGroup: Record<string, string[]> = {};
  c.forEach((e) => {
    if (!byGroup[e.groupId]) {
      byGroup[e.groupId] = [];
      order.push(e.groupId);
    }
    byGroup[e.groupId].push(e.quantity > 1 ? `${e.name} ×${e.quantity}` : e.name);
  });
  return order.map((g) => byGroup[g].join(', ')).join(' + ');
};

export const selectionsFrom = (c?: CompositionEntry[]): Selections =>
  Object.fromEntries((c || []).map((e) => [e.optionId, e.quantity]));

export const toSelectionList = (s: Selections) =>
  Object.entries(s)
    .filter(([, q]) => q > 0)
    .map(([optionId, quantity]) => ({ optionId, quantity }));

const groupTotal = (g: OptionGroup, s: Selections) =>
  g.options.reduce((acc, o) => acc + (o.id ? s[o.id] || 0 : 0), 0);

export const selectionExtra = (groups: OptionGroup[], s: Selections) =>
  groups.reduce((acc, g) => acc + g.options.reduce((a, o) => a + (o.id ? (s[o.id] || 0) * o.price : 0), 0), 0);

// Stesse regole del server, per guidare chi prende l'ordine
export const selectionError = (groups: OptionGroup[], s: Selections): string | null => {
  for (const g of groups) {
    const total = groupTotal(g, s);
    if (total < g.minSelect) return g.minSelect === 1 ? `Scegli ${g.name}` : `${g.name}: scegline almeno ${g.minSelect}`;
    if (g.maxSelect !== null && total > g.maxSelect) return `${g.name}: massimo ${g.maxSelect}`;
  }
  return null;
};

export const canAddMore = (g: OptionGroup, s: Selections, optionId: string) => {
  if (g.maxSelect !== null && groupTotal(g, s) >= g.maxSelect) return false;
  return g.allowRepeat || !(s[optionId] > 0);
};

export const ruleLabel = (g: OptionGroup) => {
  if (g.maxSelect === 1) return g.minSelect >= 1 ? 'Scegline 1 · obbligatorio' : 'Al massimo 1 · facoltativo';
  const min = g.minSelect > 0 ? `almeno ${g.minSelect}` : 'facoltativo';
  const max = g.maxSelect === null ? 'nessun limite' : `massimo ${g.maxSelect}`;
  return `${min} · ${max}${g.allowRepeat ? ' · doppie ammesse' : ''}`;
};

// Prezzo "da": prezzo del piatto + scelta più economica dei gruppi obbligatori
export const fromPrice = (basePrice: number, groups: OptionGroup[], unavailable: string[] = []) =>
  groups.reduce((acc, g) => {
    const prices = g.options.filter((o) => o.active && o.id && !unavailable.includes(o.id)).map((o) => o.price);
    return acc + (g.minSelect > 0 && prices.length ? Math.min(...prices) * g.minSelect : 0);
  }, basePrice);

// Testo dei gruppi per il menu stampato
export const optionsSummary = (groups: OptionGroup[], unavailable: string[] = []) =>
  groups
    .map((g) => {
      const names = g.options.filter((o) => o.active && o.id && !unavailable.includes(o.id)).map((o) => o.name);
      return names.length ? `${g.name}: ${names.join(', ')}` : '';
    })
    .filter(Boolean)
    .join(' · ');
