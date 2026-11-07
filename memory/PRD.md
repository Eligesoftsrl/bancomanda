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
- P1: Refactoring backend multi-tenant - aggiungere `tenant_id` a tutte le collezioni (dishes, orders, customers, daily_menus)
- P1: Refactoring frontend Expo - aggiungere autenticazione JWT e tenant context

## Multi-tenant SaaS (In Progress - 2025-12)

### Completato:
- ✅ Sistema autenticazione JWT completo (login, register, refresh, logout, /me)
- ✅ Modelli Pydantic per Tenant, User, DemoRequest  
- ✅ Script creazione superadmin (`scripts/create_superadmin.py`)
- ✅ Route superadmin: gestione tenant (CRUD, status update), richieste demo
- ✅ Route pubbliche: richiesta demo dalla landing page
- ✅ **Landing Page pubblica** (`/api/landing`) - tema chiaro stile Giorgio Bistrot
  - Hero section con scontrino termico simulato
  - Sezione funzionalità (bento grid)
  - Form richiesta demo (invio a `/api/public/demo-request`)
  - Modal registrazione autonoma tenant
  - FAQ accordion
  - Responsive mobile/desktop
- ✅ **Dashboard Superadmin** (`/api/admin/dashboard`) - tema chiaro
  - Login con validazione ruolo superadmin
  - Statistiche: totale tenant, attivi, in attesa, richieste demo
  - Gestione tenant: lista, filtri, attiva/sospendi/riattiva
  - Creazione nuovo tenant con owner
  - Gestione richieste demo: lista, filtri, aggiorna stato

### Landing sul dominio principale bancomanda.com (2026-11-05)
- Architettura scelta: `bancomanda.com` (+www) = progetto Vercel **landing-site** (solo `vercel.json` con rewrite proxy: `/`→`https://api.bancomanda.com/api/landing`, `/admin`→`/api/admin/dashboard`, `/api/:path*`→server; redirect `/login` e `/accedi` → app); `app.bancomanda.com` = progetto Vercel `frontend`; `api.bancomanda.com` = Railway `backend`
- Superadmin su `bancomanda.com/admin` (scelta utente); robots.txt esclude /admin
- Backend: `GET /` (app, non /api) serve la landing → api.bancomanda.com/ mostra la landing (in anteprima Emergent "/" resta l'app)
- Logo landing → `#top`; favicon `/api/landing/assets/favicon.png`
- `.env.example` aggiornati (CORS_ORIGINS/BANCOMANDA_APP_URL = https://app.bancomanda.com, EXPO_PUBLIC_BACKEND_URL = https://api.bancomanda.com); guida `/app/DEPLOY_VERCEL_RAILWAY.md` riscritta con tabella DNS
- Il proxy Vercel si può verificare solo dopo il deploy reale
- AGGIORNAMENTO: l'utente NON vuole il sottodominio `api.` → server sull'indirizzo gratuito Railway (`xxx.up.railway.app`). In `landing-site/vercel.json` c'è il segnaposto `INDIRIZZO-RAILWAY.up.railway.app` da sostituire quando l'utente comunica l'indirizzo; stesso valore in `EXPO_PUBLIC_BACKEND_URL` del progetto Vercel app. DNS: solo @, www, app
- **AGGIORNAMENTO FINALE: l'utente NON vuole NESSUN sottodominio** (né app. né api.). Tutto su `bancomanda.com` con UN SOLO progetto Vercel (`frontend`):
  - `/` → rewrite proxy a Railway `/api/landing`; `/admin` → `/api/admin/dashboard`; `/api/:path*` → Railway (stessa origine, niente CORS); `/accedi` e `/login` → redirect a `/app`, `/app/login`
  - App sotto `/app`: `app.config.js` imposta `experiments.baseUrl` SOLO se `EXPO_WEB_BASE_URL` (build Vercel); `scripts/vercel-postbuild.js` sposta l'export in `dist/app` e mette start_url/scope `/app/` nel manifest; rewrite di manifest/icone dalla radice a `/app/`
  - `src/services/config.ts`: `EXPO_PUBLIC_SAME_ORIGIN_API=1` → API relative `/api`
  - Landing: link Accedi fissi a `/accedi` (rotta Expo `app/accedi.tsx` → Redirect "/" per l'anteprima). Rimossi `BANCOMANDA_APP_URL`, cartella `landing-site`, `frontend/.env.example`; CORS_ORIGINS non più da impostare
  - Segnaposto `INDIRIZZO-RAILWAY.up.railway.app` in `frontend/vercel.json` (3 righe) da sostituire quando l'utente manda l'indirizzo Railway
  - Verificato in locale con simulatore regole Vercel (`/app/memory/landing-screenshots/vercel_sim.py` + `vercel_flow_test.py`): landing → Accedi → /app/login → login → /app/, reload, deep link /app/menu, logout, root resta landing
- Avvio server: crea indice unico `users.email` e, se non esiste nessun superadmin, lo crea da env `SUPERADMIN_EMAIL`/`SUPERADMIN_PASSWORD` (serve su DB nuovo Railway). Testato su DB temporaneo poi eliminato
- LEGACY_TENANT_* su Railway = locale di Giorgio (account vuoto finché non si copiano i suoi dati). MAI usarlo per un locale demo: i dati copiati finirebbero lì

### Landing "wow" + Accedi + fix /api/admin (2026-11-05)
- Foto reali (Unsplash/Pexels, scaricate in `backend/static/landing/photo-*.webp`): bento Stampa 62mm (cuochi, overlay verde), Anagrafica Clienti (tavolo), Multi-tablet (cuoco), Menu del Giorno (impiattamento); Report con mini grafico a barre animato
- Nuova fascia fotografica "Niente più foglietti volanti." (sfondo cucina statico + foto pasta inclinata); sezione Demo con sfondo foto interno bistrot
- Effetto scelto dall'utente: SOLO "sezioni che compaiono scorrendo" (IntersectionObserver, classe `reveal`, attivo solo con JS `html.reveal-ready`, rispetta prefers-reduced-motion). NO galleria scorrevole/parallax/sfondo animato
- Pulsanti "Accedi": header, hero ("Hai già un account? Accedi al tuo locale"), footer → `__APP_URL__` sostituito da env `BANCOMANDA_APP_URL` (default "/" = stessa origine in anteprima). ATTENZIONE: la variabile `APP_URL` è già usata dalla piattaforma, non usarla
- `/api/admin` e `/api/admin/` → redirect 307 a `/api/admin/dashboard`; brand admin "Bancomanda", testid login admin
- Mobile: niente overflow (footer-links a capo, logo-text nascosto ≤480px, "Richiedi Demo" nascosto ≤640px); hero iPad centrato ≤1024px; Esc chiude modale registrazione
- Test: iteration_12 + iteration_13 (frontend 100%)

### Anteprima web, cambio password, file Vercel + Railway (2026-11-05)
- **Fix anteprima bianca**: SDK 58 richiede `useServerDocumentContext()` in `app/+html.tsx` (`headNodes`/`bodyNodes` = script dell'app). Ora preview ed export web caricano l'app (vale anche per Vercel)
- **Cambio password** (`POST /api/auth/change-password`): verifica password attuale, min 8, diversa; incrementa `users.password_version`, revoca TUTTI i refresh token e restituisce nuova sessione per il dispositivo corrente. Claim JWT `pv` verificato sia nel middleware dati sia in `get_current_user` (cache 30 s per processo, `auth/dependencies.py`) → gli altri tablet vengono scollegati subito
- UI: pulsante "Password" + `ChangePasswordModal` nell'header Report (accanto a nome locale ed Esci)
- Testi "iPad" → "tablet" (login, landing): l'app si usa da browser su iPad e Android, aggiunta alla Home
- **Deploy esterno preparato** (guida `/app/DEPLOY_VERCEL_RAILWAY.md`): `frontend/vercel.json`, `frontend/.env.example`, `backend/Dockerfile.railway` (+ `.dockerignore`, serve `RAILWAY_DOCKERFILE_PATH=Dockerfile.railway` perché railway.json è deprecato per i nuovi servizi), `backend/.env.example`; CORS da env `CORS_ORIGINS` (default `*`)
- Copia dati verso il nuovo DB: NON fatta, solo con conferma esplicita dell'utente
- Test: iteration_11 (frontend 100%, backend 43/44 → fix stale token su /auth/me) + rerun 12/12 change password e 32/32 isolamento

### Login iPad + dati separati per locale + allergeni + nome Bancomanda (2026-11-05)
- **Isolamento dati** (`/app/backend/tenancy.py`): middleware ASGI legge il JWT e imposta il locale; `ScopedDatabase` filtra in automatico categories/dishes/daily_menus/orders/customers/missed_sales
  - Locale storico **Giorgio Bistrot** (`tenants.legacy_data: true`) = documenti SENZA `tenant_id` → nessuna migrazione, dati esistenti intatti; i suoi nuovi documenti restano senza tenant_id
  - Altri locali: `tenant_id` scritto su ogni insert; accesso cross-tenant → 404
  - API dati senza token → 401; pubbliche: /api/auth, /api/superadmin (auth propria), /api/public (menu = locale storico), /api/landing, /api/admin. /api/debug ora richiede login
  - Pubblicazione FTP sul sito solo per il locale storico (altri → 503)
  - Seed all'avvio (idempotente, mai reset password): env LEGACY_TENANT_NAME/EMAIL/PASSWORD
  - Brute force: 5 errori = blocco 15 min (IP da X-Forwarded-For + email), TTL 24h su login_attempts
  - JWT claim `legacy`; refresh token rotante 365 giorni (REFRESH_DAYS)
  - InvalidId → 404, DuplicateKeyError → 409; HTML /public/menu con escape
- **Indice daily_menus**: utente ha autorizzato SOLO il DB di prova → in preview `date_1` sostituito da unique `(tenant_id, date)`. **In produzione resta `date_1`**: un nuovo locale non può creare il menu in una data già usata da Giorgio Bistrot (409). Chiedere di nuovo il permesso prima di attivare altri locali in produzione.
- **Frontend**: `app/login.tsx` (split brand/form), `src/store/authStore.ts` (zustand), `src/services/authStorage.ts` (SecureStore native / localStorage web), interceptor axios Bearer + refresh single-flight (esce solo se server rifiuta, non offline), `Stack.Protected` in `app/_layout.tsx`, `AccountButton` (nome locale + Esci a doppio tocco) nell'header Report
- **Allergeni/tag**: `src/utils/dishLabels.ts` (14 allergeni UE + 6 tag pronti, id = slug del menu.json), `DishLabelsPicker` nella scheda piatto (+ tag personalizzati testo libero), `DishLabelsSummary` nella lista piatti. Già inclusi nel menu.json/endpoint pubblico (slug; tag personalizzati come testo)
- **Nome**: Bancomanda in header Ordini, app.json (name/web), +html.tsx, manifest.json. Icona "B" invariata
- **Landing**: aggiunto screenshot Vista Cucina (sezione "L'app" wide + card bento). Screenshot rigenerati con login su DB demo separato (script in `/app/memory/landing-screenshots/`)
- Test: testing agent iteration_10 backend 32/32 (`backend/tests/test_tenant_isolation.py`), verifica md5 dati storici invariati; UI verificata con Playwright locale (export web + script iniettati)

### Da completare:
- ⏳ Refactoring backend esistente per filtrare per `tenant_id` — **NON toccare il DB attuale (catering-dashboard-3): il personale ci lavora. Nessuna migrazione/inserimento senza conferma esplicita dell'utente.**
- ⏳ Integrazione auth nel frontend Expo esistente — ✅ FATTO 2026-11-05
- ⏳ Indice daily_menus in produzione (serve ok utente) prima di attivare un secondo locale
- P1: Cambio password dall'app — ✅ FATTO 2026-11-05
- P1: Copia dati dal DB Emergent al nuovo DB (Atlas/Railway) al momento del passaggio — solo con ok utente
- ⏳ Configurazioni tenant-specific (FTP, timezone, numerazione ordini)

### Landing con screenshot reali + nome "Bancomanda" (2026-11-05)
- Nome landing: "Bancó" → **"Bancomanda"** (solo landing; l'app Expo mostra ancora "Bancó")
- Rimosse tutte le immagini stock Unsplash. Ora: hero con screenshot Ordini in cornice iPad, card bento con crop Ordini, sezione "L'app" con Ordini del giorno + Menu del giorno
- Screenshot in `/app/backend/static/landing/app-orders.webp`, `app-menu.webp`, serviti da `GET /api/landing/assets/{name}` (anti path-traversal)
- Generati con DATI DEMO su DB separato temporaneo (`bancomanda_demo_screens`, poi eliminato) + backend temporaneo porta 8002 + export web Expo; script per rigenerarli in `/app/memory/landing-screenshots/` (seed_demo.py, shot.py)
- NOTA: il blank della preview web NON dipende dall'auth (le API dati non richiedono JWT): è il bug SDK 58 dello static export senza `<script>`; per gli screenshot si iniettano a mano i tag script nell'index.html esportato

### File creati:
- `/app/backend/auth/` - Package autenticazione JWT
- `/app/backend/models/` - Modelli Pydantic (tenant.py, user.py, demo_request.py)
- `/app/backend/routes/auth.py` - Route autenticazione
- `/app/backend/routes/superadmin.py` - Route gestione tenant/demo
- `/app/backend/routes/public.py` - Route pubbliche (demo request)
- `/app/backend/routes/landing.py` - Landing page HTML
- `/app/backend/routes/admin_dashboard.py` - Dashboard superadmin HTML
- `/app/backend/scripts/create_superadmin.py` - Script setup

### URL disponibili:
- Landing page: `/api/landing`
- Dashboard superadmin: `/api/admin/dashboard`
- API auth: `/api/auth/login`, `/api/auth/register`, `/api/auth/refresh`, `/api/auth/me`
- API superadmin: `/api/superadmin/stats`, `/api/superadmin/tenants`, `/api/superadmin/demo-requests`
- API pubbliche: `/api/public/demo-request`

## Credenziali test
- Reports Tab → Gear Icon Password: `eligesoft`
- **Superadmin**: email `admin@banco.app`, password `BancoAdmin2024!`
- **Tenant test**: email `titolare@pizzeria-napoli.it`, password `Password123!` (Pizzeria Napoli)
