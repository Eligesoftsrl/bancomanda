# Test Credentials — Bancó Multi-Tenant

## Superadmin Account
- **Email**: admin@banco.app
- **Password**: BancoAdmin2024!
- **Role**: superadmin
- **Access**: Dashboard at `/api/admin/dashboard`

## Test Tenant Account (Pizzeria Napoli)
- **Email**: titolare@pizzeria-napoli.it
- **Password**: Password123!
- **Role**: tenant_admin
- **Tenant**: Pizzeria Napoli (slug: pizzeria-napoli)
- **Status**: attivo

## Legacy App Access
- **Reports Tab → Gear Icon Password**: eligesoft

## API Endpoints
- Landing page: `/api/landing`
- Admin dashboard: `/api/admin/dashboard`
- Login: `POST /api/auth/login` with `{"email": "...", "password": "..."}`
- Register tenant: `POST /api/auth/register`
- Demo request: `POST /api/public/demo-request`
