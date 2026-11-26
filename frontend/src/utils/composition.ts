import { CompositionEntry, Dish, OptionGroup, PresetChanges, Selections } from '../types';

export const euro = (v: number) => `${v.toFixed(2)} €`;

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

export const round2 = (v: number) => Math.round(v * 100) / 100;

// Piatto già composto: componibile con una ricetta di partenza
export const isPreset = (dish?: Dish) => !!dish?.isComposable && !!dish.presetSelections?.length;

export const presetOf = (dish?: Dish): Selections =>
  Object.fromEntries((isPreset(dish) ? dish!.presetSelections! : []).map((s) => [s.optionId, s.quantity]));

export const presetExtra = (dish: Dish | undefined, groups: OptionGroup[]) => selectionExtra(groups, presetOf(dish));

// Da dove parte l'ordine: la ricetta senza gli ingredienti esauriti oggi
export const presetStart = (dish: Dish | undefined, groups: OptionGroup[], unavailable: string[] = []): Selections => {
  const ok = new Set(groups.flatMap((g) => g.options.filter((o) => o.active && o.id && !unavailable.includes(o.id)).map((o) => o.id as string)));
  return Object.fromEntries(Object.entries(presetOf(dish)).filter(([id]) => ok.has(id)));
};

const label = (name: string, qty: number) => (qty === 1 ? name : `${name} ×${qty}`);

// Stessa logica del server: cosa è stato tolto o aggiunto alla ricetta
export const presetDiff = (groups: OptionGroup[], preset: Selections, s: Selections): PresetChanges => {
  const out: PresetChanges = { removed: [], added: [] };
  groups.forEach((g) => g.options.forEach((o) => {
    const diff = (o.id ? s[o.id] || 0 : 0) - (o.id ? preset[o.id] || 0 : 0);
    if (diff > 0) out.added.push(label(o.name, diff));
    if (diff < 0) out.removed.push(label(o.name, -diff));
  }));
  return out;
};

// "SENZA Cipolla · + Bacon"
export const presetChangesText = (pc?: PresetChanges | null) =>
  pc ? [...pc.removed.map((n) => `SENZA ${n}`), ...pc.added.map((n) => `+ ${n}`)].join(' · ') : '';

export const itemCompositionText = (item: { composition?: CompositionEntry[]; presetChanges?: PresetChanges | null }) =>
  item.presetChanges ? presetChangesText(item.presetChanges) : compositionText(item.composition);

// "Pane al sesamo, Hamburger ×2"
export const selectionNames = (groups: OptionGroup[], s: Selections) =>
  groups.flatMap((g) => g.options.filter((o) => o.id && s[o.id] > 0).map((o) => label(o.name, s[o.id as string]))).join(', ');

// Prezzo da mostrare: fisso per i piatti già composti, "da" per i componibili
export const priceText = (base: number, dish: Dish | undefined, groups: OptionGroup[], unavailable: string[] = []) => {
  if (isPreset(dish)) return euro(base + selectionExtra(groups, presetStart(dish, groups, unavailable)));
  return groups.length ? `da ${euro(fromPrice(base, groups, unavailable))}` : euro(base);
};
