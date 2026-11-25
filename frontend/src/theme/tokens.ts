import { Platform } from 'react-native';

// Palette Bancomanda rinfrescata: stessi colori di marca, contrasti più puliti
export const C = {
  brand: '#DB0007',
  brandDark: '#B80006',
  brandSoft: '#FFF1F1',
  navy: '#0F172A',
  canvas: '#F4F6FA',
  surface: '#FFFFFF',
  sunken: '#F1F5F9',
  border: '#E2E8F0',
  borderStrong: '#CBD5E1',
  text: '#0F172A',
  text2: '#475569',
  muted: '#94A3B8',
  green: '#00754A',
  greenSoft: '#E8F6EF',
  yellow: '#FFBC0D',
  yellowSoft: '#FFF7DF',
  amber: '#B45309',
  blue: '#2563EB',
  blueSoft: '#EEF4FF',
  violet: '#5423E7',
  violetSoft: '#F3EFFE',
};

export type StatusKey = 'in_attesa' | 'in_preparazione' | 'pronto' | 'sospeso' | 'consegnato';

// fg = testo/icone, bg = sfondo tenue, bd = bordo, solid = colore pieno (barre, punti)
export const STATUS: Record<StatusKey, { fg: string; bg: string; bd: string; solid: string }> = {
  in_attesa: { fg: '#B45309', bg: '#FFF7DF', bd: '#FDE68A', solid: '#FFBC0D' },
  in_preparazione: { fg: '#1D4ED8', bg: '#EEF4FF', bd: '#BFDBFE', solid: '#2563EB' },
  pronto: { fg: '#00754A', bg: '#E8F6EF', bd: '#A7E3C6', solid: '#00754A' },
  sospeso: { fg: '#B80006', bg: '#FFF1F1', bd: '#FECACA', solid: '#DB0007' },
  consegnato: { fg: '#475569', bg: '#F1F5F9', bd: '#CBD5E1', solid: '#94A3B8' },
};

export const statusOf = (s: string) => STATUS[s as StatusKey] || STATUS.consegnato;

// Font locale (vedi src/theme/fonts.web.ts); su app native resta il font di sistema
export const FONT = Platform.OS === 'web' ? "'Plus Jakarta Sans', system-ui, -apple-system, 'Segoe UI', sans-serif" : undefined;

export const R = { sm: 10, md: 12, lg: 16, xl: 22, pill: 999 };

export const elevation = (level: 1 | 2 | 3) => ({
  shadowColor: '#0F172A',
  shadowOffset: { width: 0, height: level === 1 ? 1 : level === 2 ? 6 : 16 },
  shadowOpacity: level === 1 ? 0.06 : level === 2 ? 0.08 : 0.16,
  shadowRadius: level === 1 ? 3 : level === 2 ? 14 : 32,
  elevation: level * 2,
});

export const SPRING = { damping: 16, stiffness: 220, mass: 0.9 };
export const SPRING_SOFT = { damping: 20, stiffness: 160 };
