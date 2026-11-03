# Bancó — Sistema Gestione Ordini Ristorazione

## Problem Statement (originale)
Sistema di gestione ordini completo per ristorante/catering ("Bancó"), pensato per tablet e mobile.
Funzionalità core: gestione piatti, menu giornaliero, profili cliente, stati ordini, ordini non pagati,
porzioni disponibili. Tema chiaro con colori brand (Rosso McDonald's `#DB0007`, Giallo `#FFBC0D`,
Verde Starbucks `#00754A`, ombra viola `#5423E7`). Native date/time picker, editing ordini,
e supporto stampa termica 62mm. iPad-compatibile, no nested modal bugs.

## Stack
- Frontend: Expo (React Native) + TypeScript + Expo Router
- Backend: FastAPI (Python)
- Database: MongoDB (Motor async)

## Funzionalità implementate
- Gestione categorie, piatti, menu giornaliero
- Gestione clienti con ricerca (limit 5000)
- Creazione/modifica/eliminazione ordini con stati
- Tipi servizio: `da_consegnare` / `da_ritirare` / `in_sede`
- Canali: persona / telefono / whatsapp
- Editing inline `customerName` e `deliveryTime` dal modale ordine
- **Editing inline di singoli item (solo ordini di OGGI)**:
  - Piatti da menu: modificabili `quantity` e `notes`
  - Piatti liberi: tutti i campi (`dishName`, `quantity`, `unitPrice`, `notes`)
  - Tasto **Duplica** sui piatti liberi → crea copia identica + apre subito modifica
  - Badge "LIBERO" per distinguere piatti custom dai piatti da menu
- **Vista Cucina** (in Reports, modalità Giornaliera):
  - Icona 👨‍🍳 person accanto ai bottoni status di ogni item → toggle `sendToKitchen`
  - Aggregazione automatica per nome piatto (es. "5 riso" in 3 ordini diversi → 1 gruppo con 3 righe)
  - Ogni riga mostra: quantità · Ordine# · Cliente · badge servizio colorato · ora consegna · note
  - Tap sul checkmark → cambia stato in "ready" (barrato, verde tenue), mostra progress "N/T"
  - Ordinamento entries per orario consegna crescente
  - Refresh button + pull-to-refresh
  - **Badge live sull'icona Report nella tab bar**: mostra il totale dei piatti pending in cucina per oggi, si aggiorna ogni 15s automaticamente
- Ricerca testuale ordini (cliente, piatto, numero ordine)
- Vista "Ordini non pagati" con range calendario nativo
- Vista "Piatti disponibili" filtrabili
- Tema chiaro con colori brand
- Time/date picker nativi (`@react-native-community/datetimepicker`)
- **Live silent sync (multi-utente)**:
  - Auto-refresh silenzioso ogni **30s** di ordini/menu/clienti (nessuno spinner, no toast)
  - **Indicatore freshness** in header: pallino 🟢 verde (<45s) / 🟡 giallo (>45s) / 🔴 rosso (errore)
  - Testo dinamico: "Aggiornato ora" / "Aggiornato Ns fa" / "Aggiornato N min fa"
  - Auto-refresh su **window focus** e **online reconnect** (utente riapre l'iPad)
  - Tap sull'indicatore = refresh immediato manuale
- **Stampa termica 62mm ottimizzata** con split multi-etichetta automatico oltre 10 piatti

## Stampa termica 62mm (`handlePrintOrder` in `app/(tabs)/index.tsx`)
Layout finale validato dall'utente per stampante a rotolo adesivo 62mm:
- `@page`: `60mm auto`, margini `1.5mm 2mm 1.5mm 2mm`
- Larghezza contenuto: `56mm`
- Font: Courier New monospace
- Titolo `ORDINE #N` a 9pt + subtitle "Canale · Servizio" a 6.5pt su una riga
- Box `ORA: HH:MM` 11pt con bordo solido
- Box `NOTE:` 7.5pt con bordo tratteggiato
- Items 8.5pt (quantità + nome + prezzo), note item 7pt corsivo
- Totale 11pt destra
- **No footer** (data/ora rimossi su richiesta utente)
- Altezza tipica ordine 5 piatti: ~86mm di carta

## Note tecniche importanti
- **Mai modali nidificati** (rompono touch su iPad Safari/Expo Go)
- **Mai `react-native-paper`** (problemi font loading Expo Go)
- Non sovrascrivere i colori brand
- Lingua interfaccia: Italiano


## Pubblicazione menu sul sito (FTP) — 2026-06
- Toggle "Pubblica sul sito" nel tab Menu → backend genera `menu.json` e lo invia via FTP/FTPS (Aruba) in `www.giorgiobistrot.it/menu/menu.json` (upload su .tmp + rinomina)
- Disattivando il toggle viene inviato un JSON con `published:false` e `message`
- Pulsante "Aggiorna" (quando pubblicato) re-invia il file dopo modifiche; pulsante "Codice" mostra percorso + snippet JS da copiare
- Endpoint: `PATCH /api/menus/{id}/publish` (503 se FTP non configurato, 502 se invio fallito: stato NON cambia)
- Env backend: FTP_HOST, FTP_USER, FTP_PORT, FTP_DIR in .env; FTP_PASSWORD come secret
- Formato JSON di esempio: `/app/memory/menu-esempio.json` (caricato anche online come file di prova)
- Endpoint pubblico JSON `/api/public/menu/today` resta disponibile (NON ancora deployato in produzione: 404)
- Generato JSON reale dal DB di produzione (lettura via API GET di bancos-receipt.emergent.host) per il 2026-11-03: 64 piatti, 7 sezioni → `/app/memory/menu-reale-2026-11-03.json`, caricato online su www.giorgiobistrot.it/menu/menu.json
- NOTA: la preview web non carica il bundle JS (HTML SSR senza script tag, SDK 58) — Expo Go non è impattato

## Backlog / Future
- P1: UI tag/allergeni (14 allergeni UE) nella scheda Piatto — oggi i campi esistono nel DB ma non sono modificabili
- P2: Animazione fade-in del logo (effetto Apple/Stripe) al caricamento app
- P2: Refactoring `index.tsx` (>4000 righe) in componenti separati
- P3: Fix lint warnings pre-esistenti (apostrofi non escaped, chiave duplicata `orderItemsList` linee 2524/3164, import non usati)

## Credenziali test
- Reports Tab → Gear Icon Password: `eligesoft`
