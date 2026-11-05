# Test Credentials — Bancomanda Multi-Tenant

## Locale storico (dati esistenti) — Giorgio Bistrot
- **Email**: titolare@giorgiobistrot.it
- **Password**: Giorgio-2XA9-ZSWF
- **Role**: tenant_admin (tenant con `legacy_data: true`)
- Vede i documenti SENZA campo `tenant_id` (dati storici). NON MODIFICARE questi dati nei test: il personale lavora sul DB reale.
- Creato in automatico all'avvio dal backend (env LEGACY_TENANT_*), solo se mancante.

## Superadmin Account
- **Email**: admin@banco.app
- **Password**: BancoAdmin2024!
- **Role**: superadmin (nessun tenant: le API dati rispondono 401)
- **Access**: Dashboard at `/api/admin/dashboard`

## Test Tenant Account (Pizzeria Napoli) — usare QUESTO per i test di scrittura
- **Email**: titolare@pizzeria-napoli.it
- **Password**: Password123!
- **Role**: tenant_admin
- **Tenant**: Pizzeria Napoli (slug: pizzeria-napoli), status attivo

## Legacy App Access
- **Reports Tab → Gear Icon Password**: eligesoft

## API Endpoints
- Landing page: `/api/landing` (asset: `/api/landing/assets/{file}`)
- Admin dashboard: `/api/admin/dashboard`
- Login: `POST /api/auth/login` with `{"email": "...", "password": "..."}` → access_token (60 min) + refresh_token (365 gg, rotante)
- Refresh: `POST /api/auth/refresh` `{"refresh_token": "..."}`; Logout: `POST /api/auth/logout`
- Tutte le API dati (/api/orders, /api/dishes, /api/menus, ...) richiedono `Authorization: Bearer <access_token>`
- Pubbliche senza login: `/api/public/menu/today`, `/api/public/menu/{date}` (dati del locale storico)
