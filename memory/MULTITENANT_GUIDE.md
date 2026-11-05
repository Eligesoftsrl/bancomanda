# Bancó Multi-Locale — Guida per la copia (Fork)

> Leggi questo file PRIMA di toccare qualsiasi cosa. Rispondi SEMPRE in italiano all'utente.

## 0. Situazione
- Esiste un'app **originale** "Bancó" usata ogni giorno dai ragazzi di **Giorgio Bistrot** sugli iPad (Expo Go), pubblicata su `https://bancos-receipt.emergent.host` con centinaia di piatti, ordini e clienti reali.
- Questo progetto è una **COPIA (fork)** dell'originale: serve a creare una **nuova app identica ma multi-locale** (più ristoranti, ognuno con i propri dati).
- L'app originale **NON va toccata**. I dati dei ragazzi verranno eventualmente spostati **più avanti**, solo se l'utente lo decide.

## 1. ⚠️ Cautele OBBLIGATORIE (prima di tutto)
1. **Mai collegarsi ai dati dell'app originale.** `frontend/.env` → `EXPO_PUBLIC_BACKEND_URL` NON deve mai essere `https://bancos-receipt.emergent.host`. Deve puntare al backend di questa copia (URL preview). Nessuno script/curl deve scrivere su `bancos-receipt.emergent.host`.
2. **FTP del sito del bistrot.** `backend/.env` contiene `FTP_HOST=ftp.giorgiobistrot.it`, `FTP_USER`, `FTP_DIR=www.giorgiobistrot.it/menu` e il secret `FTP_PASSWORD`. Nella copia vanno **rimossi/disattivati subito** (chiedere all'utente) perché un "Pubblica" di prova sovrascriverebbe il menu reale su www.giorgiobistrot.it. Nella versione multi-locale l'FTP diventa un'impostazione **per locale** salvata nel DB (password cifrata), non nelle variabili d'ambiente.
3. **Pubblicazione:** quando la copia verrà pubblicata, usare un **deploy NUOVO**, MAI "Replace" del deployment `bancos-receipt` (lo cancellerebbe).

## 2. Stack attuale
- Frontend: Expo **SDK 58** (React Native 0.88, React 19.3), TypeScript, Expo Router, Zustand (`src/store/appStore.ts`), axios (`src/services/api.ts`).
- Backend: FastAPI monolitico `backend/server.py` (~2250 righe), MongoDB (Motor). Tutte le rotte sotto `/api`.
- Nessun login. Unica protezione: password pannello impostazioni Report `eligesoft` (hardcoded in `app/(tabs)/reports.tsx`).

## 3. Schermate (frontend/app)
- `(tabs)/index.tsx` Ordini (~4600 righe: creazione/modifica ordini, stati, stampa 62mm, vista cucina)
- `(tabs)/menu.tsx` Menu giornaliero + "Pubblica sul sito" (FTP) + condivisione
- `(tabs)/dishes.tsx` Piatti e categorie
- `(tabs)/customers.tsx` Clienti
- `(tabs)/reports.tsx` Report, Cucina, Porzionatura, impostazioni (password)
- `unpaid-orders.tsx` Ordini non pagati

## 4. Collezioni MongoDB (tutte oggi SENZA locale)
| Collezione | Contenuto | Note multi-locale |
|---|---|---|
| `categories` | name, order | aggiungere `tenantId` |
| `dishes` | name, basePrice, categoryId/Name, isFavorite, active, tags[], allergens[] | `tenantId` |
| `daily_menus` | date (YYYY-MM-DD), items[] (dishId, dishName, categoryName, portions, initialPortions, dailyPrice, notes), isPublished, publishedAt | `tenantId`; unicità (tenantId, date) |
| `orders` | orderNumber (progressivo = max+1), customer, items[] con status e portionStatuses[], serviceType, channel, payment, receipt | `tenantId`; **numerazione per locale** |
| `customers` | anagrafica | `tenantId` |
| `missed_sales` | mancate vendite | `tenantId` |

Logiche sensibili al locale: `orderNumber` (oggi `max+1` globale, ~riga 808), categorie "del giorno" fisse `{"Primi","Secondi","Contorni"}` (`_DAILY_CATEGORIES`), fuso orario `Europe/Rome`, messaggi pubblici ("Siamo chiusi la domenica…"), `/setup` (seed iniziale).

## 5. Piano multi-locale suggerito (da confermare con l'utente)
1. **Collezione `tenants`**: nome, slug, fuso orario, giorni di chiusura, messaggi sito, impostazioni FTP (host, utente, cartella, password cifrata), categorie "del giorno".
2. **Login personale** (passare da `integration_expert` per l'auth): utenti legati a un `tenantId`, ruoli (admin locale / staff). Super-admin per creare locali.
3. **`tenantId` su ogni documento** e su **ogni query** backend (dipendenza FastAPI che ricava il tenant dal token). Indici `(tenantId, date)`, `(tenantId, orderNumber)`.
4. **Numerazione ordini per locale** (contatore atomico per tenant).
5. **Pubblicazione sito per locale**: FTP preso dalle impostazioni del tenant; endpoint pubblico `/api/public/{slug}/menu/today`.
6. **Pannello impostazioni locale** al posto della password hardcoded.
7. **Script di migrazione** (da usare SOLO quando l'utente decide): importa i dati esportati dall'app originale e assegna tutto a un tenant "Giorgio Bistrot" (incluso ricalcolo contatore ordini). Mai lanciarlo contro il DB dell'originale.

## 6. Regole imparate sul campo (non violare)
- **Mai Modal annidati** (rompono il touch su iPad/Expo Go): usare viste inline/ScrollView.
- **SDK 58**: nessun testo o spazio (`{' '}`) fuori da `<Text>` → crash.
- **Mai `react-native-paper`** (problemi font su Expo Go).
- Colori brand: Rosso `#DB0007`, Giallo `#FFBC0D`, Verde `#00754A`, ombra viola `#5423E7`. Tema chiaro.
- **Stampa termica 62mm** (`handlePrintOrder` in `index.tsx`): `@page 60mm auto`, margini `1.5mm 2mm`, contenuto 56mm, Courier New, titolo 9pt, box ORA 11pt, NOTE 7.5pt tratteggiato, items 8.5pt, totale 11pt, nessun footer, split automatico oltre 10 piatti. Layout validato dall'utente: non cambiarlo.
- Sync multi-iPad senza websocket: polling silenzioso ogni 30s + refresh al focus/riconnessione, indicatore freschezza in header.
- La preview web non carica il bundle JS (HTML SSR senza `<script>`, SDK 58); per screenshot iniettare `entry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.routerRoot=app` con `page.add_script_tag`. Expo Go non è impattato.

## 7. Formato JSON pubblico del menu (da mantenere)
Esempio reale: `/app/memory/menu-reale-2026-11-03.json`; esempio con allergeni: `/app/memory/menu-esempio.json`.
`{date, weekday, published, updated_at, message, sections:[{name, type:"daily"|"fixed", items:[{name, price(number), tags[], allergens[], notes}]}]}` — piatti esauriti esclusi.

## 8. Ancora da fare (ereditato dall'originale)
- UI tag + 14 allergeni UE nella scheda piatto (campi già nel DB).
- Animazione fade-in logo all'avvio.
- Spezzare `index.tsx` in componenti.
