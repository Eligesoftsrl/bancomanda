// Etichette condivise della schermata Ordini
export const CHANNELS = [
  { id: 'persona', label: 'Di Persona', icon: 'person' },
  { id: 'telefono', label: 'Telefono', icon: 'call' },
  { id: 'whatsapp', label: 'WhatsApp', icon: 'logo-whatsapp' },
];

export const STATUS_LABELS: Record<string, string> = {
  in_attesa: 'Attesa',
  in_preparazione: 'Preparazione',
  pronto: 'Pronto',
  sospeso: 'Sospeso',
  consegnato: 'Consegnato',
};

export const SERVICE_TYPES = [
  { id: 'in_sede', label: 'In Sede', icon: 'restaurant' },
  { id: 'da_ritirare', label: 'Da Ritirare', icon: 'walk' },
  { id: 'da_consegnare', label: 'Da Consegnare', icon: 'bicycle' },
];

export const serviceOf = (id?: string) => SERVICE_TYPES.find((s) => s.id === id) || SERVICE_TYPES[0];

export const STATUS_ICONS: Record<string, string> = {
  in_attesa: 'hourglass-outline',
  in_preparazione: 'flame-outline',
  pronto: 'checkmark-done-outline',
  sospeso: 'pause-circle-outline',
  consegnato: 'bag-check-outline',
};
