import { Platform } from 'react-native';

// Palette ispirata a MaterialM: azzurro principale, viola secondario, toni pastello per i riquadri
export const C = {
  primary: '#00A1FF',
  primaryDark: '#0085D6',
  primarySoft: '#E5F5FF',
  secondary: '#8965E5',
  secondarySoft: '#F0EBFC',
  success: '#0E9F80',
  successSoft: '#E1F7F1',
  warning: '#FFAE1F',
  warningFg: '#B76E00',
  warningSoft: '#FFF4E0',
  error: '#F2545B',
  errorFg: '#C8323A',
  errorSoft: '#FDECEC',
  pink: '#FF6692',
  pinkSoft: '#FDEBF1',
  navy: '#2A3547',
  canvas: '#F4F7FB',
  surface: '#FFFFFF',
  sunken: '#EFF4FA',
  hover: '#F6F9FC',
  border: '#E0E6EB',
  borderStrong: '#CFD6DB',
  text: '#2A3547',
  text2: '#5A6A85',
  muted: '#98A4B8',
};

export type StatusKey = 'in_attesa' | 'in_preparazione' | 'pronto' | 'sospeso' | 'consegnato';

// fg = testo/icone, bg = sfondo tenue, bd = bordo, solid = colore pieno (barre, punti)
export const STATUS: Record<StatusKey, { fg: string; bg: string; bd: string; solid: string }> = {
  in_attesa: { fg: C.warningFg, bg: C.warningSoft, bd: '#FFDDA0', solid: C.warning },
  in_preparazione: { fg: C.primaryDark, bg: C.primarySoft, bd: '#B3E2FF', solid: C.primary },
  pronto: { fg: C.success, bg: C.successSoft, bd: '#A9E6D6', solid: '#13C9A1' },
  sospeso: { fg: C.errorFg, bg: C.errorSoft, bd: '#F9C4C6', solid: C.error },
  consegnato: { fg: C.text2, bg: C.sunken, bd: C.borderStrong, solid: C.muted },
};

export const statusOf = (s: string) => STATUS[s as StatusKey] || STATUS.consegnato;

// Font locale (vedi src/theme/fonts.web.ts); su app native resta il font di sistema
export const FONT = Platform.OS === 'web' ? "'Plus Jakarta Sans', system-ui, -apple-system, 'Segoe UI', sans-serif" : undefined;

export const R = { sm: 10, md: 12, lg: 14, xl: 20, pill: 999 };

// Ombre morbide come MaterialM (azzurro-grigie, mai nere)
export const elevation = (level: 1 | 2 | 3) => ({
  shadowColor: '#5A6A85',
  shadowOffset: { width: 0, height: level === 1 ? 1 : level === 2 ? 8 : 18 },
  shadowOpacity: level === 1 ? 0.14 : level === 2 ? 0.12 : 0.2,
  shadowRadius: level === 1 ? 4 : level === 2 ? 20 : 36,
  elevation: level * 2,
});

export const SPRING = { damping: 16, stiffness: 220, mass: 0.9 };
export const SPRING_SOFT = { damping: 20, stiffness: 160 };
