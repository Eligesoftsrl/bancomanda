// 14 allergeni Reg. UE 1169/2011 — gli id sono quelli usati nel menu.json del sito
export const ALLERGENS: { id: string; label: string }[] = [
  { id: 'glutine', label: 'Glutine' },
  { id: 'crostacei', label: 'Crostacei' },
  { id: 'uova', label: 'Uova' },
  { id: 'pesce', label: 'Pesce' },
  { id: 'arachidi', label: 'Arachidi' },
  { id: 'soia', label: 'Soia' },
  { id: 'latte', label: 'Latte' },
  { id: 'frutta_a_guscio', label: 'Frutta a guscio' },
  { id: 'sedano', label: 'Sedano' },
  { id: 'senape', label: 'Senape' },
  { id: 'sesamo', label: 'Sesamo' },
  { id: 'solfiti', label: 'Anidride solforosa e solfiti' },
  { id: 'lupini', label: 'Lupini' },
  { id: 'molluschi', label: 'Molluschi' },
];

export const PRESET_TAGS: { id: string; label: string }[] = [
  { id: 'vegetariano', label: 'Vegetariano' },
  { id: 'vegano', label: 'Vegano' },
  { id: 'senza_glutine', label: 'Senza glutine' },
  { id: 'senza_lattosio', label: 'Senza lattosio' },
  { id: 'piccante', label: 'Piccante' },
  { id: 'novita', label: 'Novità' },
];

const LABELS: Record<string, string> = Object.fromEntries(
  [...ALLERGENS, ...PRESET_TAGS].map((x) => [x.id, x.label])
);

export const labelFor = (id: string) => LABELS[id] || id;
