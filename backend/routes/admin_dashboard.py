"""
Superadmin Dashboard HTML page.
"""
from fastapi import APIRouter, Request, Depends, HTTPException
from fastapi.responses import HTMLResponse, RedirectResponse
from auth.dependencies import get_current_user, CurrentUser

router = APIRouter(prefix="/admin", tags=["Admin Dashboard"])


def get_dashboard_html() -> str:
    """Generate the superadmin dashboard HTML."""
    return '''<!DOCTYPE html>
<html lang="it">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Bancomanda Admin — Dashboard Superadmin</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@500;600;700&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <style>
        :root {
            /* Palette Bancomanda: rosso corallo del logo + blu notte della login */
            --bg-main: #faf9f6;
            --bg-surface: #f2f0eb;
            --bg-elevated: #ffffff;
            --bg-card: #ffffff;
            --bg-dark: #141d2c;
            --primary: #f5595a;
            --primary-hover: #e04849;
            --primary-light: rgba(245, 89, 90, 0.12);
            --accent: #141d2c;
            --accent-light: rgba(20, 29, 44, 0.08);
            --text-primary: #0f172a;
            --text-secondary: #475569;
            --text-muted: #8896ab;
            --text-on-dark: #f8fafc;
            --border-subtle: #e2e8f0;
            --border-dark: #cbd5e1;
            --success: #059669;
            --warning: #d97706;
            --danger: #dc2626;
        }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
            font-family: 'Inter', system-ui, sans-serif;
            background: var(--bg-main);
            color: var(--text-secondary);
            line-height: 1.6;
            min-height: 100vh;
        }
        .serif { font-family: 'Playfair Display', Georgia, serif; }

        /* Layout */
        .app-container { display: flex; min-height: 100vh; }
        .sidebar {
            width: 260px;
            background: var(--bg-elevated);
            border-right: 1px solid var(--border-subtle);
            padding: 1.5rem;
            position: fixed;
            top: 0;
            left: 0;
            bottom: 0;
            overflow-y: auto;
        }
        .main-content {
            flex: 1;
            margin-left: 260px;
            padding: 2rem;
        }
        .logo {
            display: flex;
            align-items: center;
            gap: 0.75rem;
            margin-bottom: 2rem;
            text-decoration: none;
        }
        .logo-icon {
            width: 40px;
            height: 40px;
            flex-shrink: 0;
            display: block;
            border-radius: 10px;
            object-fit: cover;
            box-shadow: 0 6px 16px -6px rgba(20, 29, 44, 0.45);
        }
        .logo-text { font-size: 1.25rem; color: var(--text-primary); font-weight: 600; }
        .sidebar .logo { gap: 0.6rem; flex-wrap: wrap; }
        .sidebar .logo-text { font-size: 1.05rem; }
        .logo-badge {
            font-size: 0.65rem;
            background: var(--primary-light);
            color: var(--primary);
            padding: 0.2rem 0.5rem;
            border-radius: 4px;
        }

        /* Sidebar Nav */
        .nav-section { margin-bottom: 1.5rem; }
        .nav-section-title {
            font-size: 0.7rem;
            text-transform: uppercase;
            letter-spacing: 1px;
            color: var(--text-muted);
            margin-bottom: 0.75rem;
        }
        .nav-item {
            display: flex;
            align-items: center;
            gap: 0.75rem;
            padding: 0.75rem 1rem;
            border-radius: 8px;
            color: var(--text-secondary);
            text-decoration: none;
            cursor: pointer;
            transition: all 0.2s;
            margin-bottom: 0.25rem;
        }
        .nav-item:hover { background: var(--bg-surface); color: var(--text-primary); }
        .nav-item.active { background: var(--primary-light); color: var(--primary); }
        .nav-item i { width: 20px; text-align: center; }
        .nav-badge {
            margin-left: auto;
            background: var(--accent);
            color: white;
            padding: 0.15rem 0.5rem;
            border-radius: 10px;
            font-size: 0.75rem;
            font-weight: 600;
        }

        /* Stats Cards */
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 1.5rem;
            margin-bottom: 2rem;
        }
        .stat-card {
            background: var(--bg-card);
            border: 1px solid var(--border-subtle);
            border-radius: 12px;
            padding: 1.5rem;
        }
        .stat-card-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 0.5rem;
        }
        .stat-card-title { color: var(--text-muted); font-size: 0.875rem; }
        .stat-card-icon {
            width: 36px;
            height: 36px;
            border-radius: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 1rem;
        }
        .stat-card-icon.gold { background: var(--primary-light); color: var(--primary); }
        .stat-card-icon.green { background: rgba(5, 150, 105, 0.1); color: var(--success); }
        .stat-card-icon.orange { background: rgba(217, 119, 6, 0.1); color: var(--warning); }
        .stat-card-icon.red { background: rgba(220, 38, 38, 0.1); color: var(--danger); }
        .stat-card-value {
            font-size: 2rem;
            font-weight: 700;
            color: var(--text-primary);
            line-height: 1;
        }

        /* Page Header */
        .page-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 2rem;
        }
        .page-title {
            font-size: 1.75rem;
            color: var(--text-primary);
            font-weight: 600;
        }

        /* Table */
        .table-container {
            background: var(--bg-card);
            border: 1px solid var(--border-subtle);
            border-radius: 12px;
            overflow: hidden;
            margin-bottom: 2rem;
        }
        .table-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 1rem 1.5rem;
            border-bottom: 1px solid var(--border-subtle);
        }
        .table-title { color: var(--text-primary); font-weight: 600; }
        table { width: 100%; border-collapse: collapse; }
        th, td { padding: 1rem 1.5rem; text-align: left; }
        th {
            background: var(--bg-surface);
            color: var(--text-muted);
            font-size: 0.75rem;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            font-weight: 600;
        }
        td { border-bottom: 1px solid var(--border-subtle); }
        tr:last-child td { border-bottom: none; }
        tr:hover td { background: var(--bg-surface); }

        /* Badges */
        .badge {
            display: inline-flex;
            align-items: center;
            padding: 0.25rem 0.75rem;
            border-radius: 9999px;
            font-size: 0.75rem;
            font-weight: 500;
        }
        .badge-active { background: rgba(5, 150, 105, 0.1); color: var(--success); }
        .badge-pending { background: rgba(217, 119, 6, 0.1); color: var(--warning); }
        .badge-suspended { background: rgba(220, 38, 38, 0.1); color: var(--danger); }
        .badge-new { background: var(--primary-light); color: var(--primary); }

        /* Buttons */
        .btn {
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
            padding: 0.5rem 1rem;
            border-radius: 8px;
            font-size: 0.875rem;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s;
            border: none;
            text-decoration: none;
        }
        .btn-sm { padding: 0.35rem 0.75rem; font-size: 0.8rem; }
        .btn-primary { background: var(--primary); color: white; }
        .btn-primary:hover { background: var(--primary-hover); }
        .btn-success { background: rgba(5, 150, 105, 0.1); color: var(--success); border: 1px solid rgba(5, 150, 105, 0.3); }
        .btn-success:hover { background: rgba(5, 150, 105, 0.2); }
        .btn-danger { background: rgba(220, 38, 38, 0.1); color: var(--danger); border: 1px solid rgba(220, 38, 38, 0.3); }
        .btn-danger:hover { background: rgba(220, 38, 38, 0.2); }
        .btn-outline { background: transparent; border: 1px solid var(--border-subtle); color: var(--text-secondary); }
        .btn-outline:hover { background: var(--bg-surface); border-color: var(--primary); color: var(--text-primary); }

        /* Modal */
        .modal-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.5);
            display: none;
            align-items: center;
            justify-content: center;
            z-index: 200;
            padding: 2rem;
        }
        .modal-overlay.active { display: flex; }
        .modal-content {
            background: var(--bg-card);
            border: 1px solid var(--border-subtle);
            border-radius: 16px;
            padding: 2rem;
            width: 100%;
            max-width: 500px;
            box-shadow: 0 25px 50px -12px rgba(0,0,0,0.15);
        }
        .modal-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 1.5rem;
        }
        .modal-header h2 { color: var(--text-primary); font-size: 1.25rem; }
        .modal-close {
            background: none;
            border: none;
            color: var(--text-muted);
            font-size: 1.25rem;
            cursor: pointer;
        }
        .modal-close:hover { color: var(--text-primary); }
        .form-group { margin-bottom: 1rem; }
        .form-group label {
            display: block;
            font-size: 0.875rem;
            color: var(--text-secondary);
            margin-bottom: 0.5rem;
        }
        .form-group input, .form-group select, .form-group textarea {
            width: 100%;
            background: var(--bg-surface);
            border: 1px solid var(--border-subtle);
            border-radius: 8px;
            padding: 0.75rem 1rem;
            color: var(--text-primary);
            font-family: inherit;
            font-size: 1rem;
        }
        .form-group input:focus, .form-group select:focus, .form-group textarea:focus {
            outline: none;
            border-color: var(--primary);
        }

        /* Tabs */
        .tabs { display: flex; gap: 0.5rem; margin-bottom: 1.5rem; }
        .tab {
            padding: 0.5rem 1rem;
            border-radius: 6px;
            cursor: pointer;
            color: var(--text-secondary);
            font-size: 0.9rem;
            transition: all 0.2s;
        }
        .tab:hover { background: var(--bg-surface); }
        .tab.active { background: var(--primary-light); color: var(--primary); }

        /* Login Screen */
        .login-container {
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 2rem;
            background: var(--bg-surface);
        }
        .login-card {
            background: var(--bg-card);
            border: 1px solid var(--border-subtle);
            border-radius: 20px;
            padding: 3rem;
            width: 100%;
            max-width: 400px;
            text-align: center;
            box-shadow: 0 10px 40px -10px rgba(0,0,0,0.1);
        }
        .login-card .logo { justify-content: center; margin-bottom: 2rem; }
        .login-card h1 {
            color: var(--text-primary);
            font-size: 1.5rem;
            margin-bottom: 0.5rem;
        }
        .login-card p { color: var(--text-muted); margin-bottom: 2rem; }
        .login-alert {
            padding: 0.75rem;
            border-radius: 8px;
            margin-bottom: 1rem;
            font-size: 0.875rem;
            display: none;
        }
        .login-alert.error {
            background: rgba(220, 38, 38, 0.1);
            border: 1px solid rgba(220, 38, 38, 0.3);
            color: var(--danger);
        }

        /* Impostazioni locale */
        .modal-wide { max-width: 780px; max-height: 90vh; overflow-y: auto; }
        .settings-section { border-top: 1px solid var(--border-subtle); padding-top: 1.25rem; margin-top: 1.25rem; }
        .settings-section:first-of-type { border-top: none; padding-top: 0; margin-top: 0; }
        .settings-section h3 { color: var(--text-primary); font-size: 1rem; margin-bottom: 0.25rem; display: flex; align-items: center; gap: 0.5rem; }
        .settings-section h3 i { color: var(--primary); }
        .settings-hint { color: var(--text-muted); font-size: 0.8rem; margin-bottom: 1rem; }
        .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 0 1rem; }
        .form-row.ftp { grid-template-columns: 3fr 1fr; }
        .day-chips { display: flex; flex-wrap: wrap; gap: 0.5rem; }
        .day-chip { position: relative; }
        .day-chip input { position: absolute; opacity: 0; pointer-events: none; }
        .day-chip span { display: inline-block; padding: 0.4rem 0.85rem; border-radius: 9999px; border: 1px solid var(--border-dark); font-size: 0.85rem; cursor: pointer; transition: background-color 0.2s, color 0.2s, border-color 0.2s; text-transform: capitalize; }
        .day-chip input:checked + span { background: var(--primary); border-color: var(--primary); color: #fff; }
        .logo-box { display: flex; align-items: center; gap: 1.25rem; }
        .logo-preview { width: 180px; height: 90px; border: 1px dashed var(--border-dark); border-radius: 10px; display: flex; align-items: center; justify-content: center; background: var(--bg-surface); overflow: hidden; color: var(--text-muted); font-size: 0.8rem; }
        .logo-preview img { max-width: 100%; max-height: 100%; object-fit: contain; }
        .logo-actions { display: flex; flex-direction: column; gap: 0.5rem; align-items: flex-start; }
        .inline-alert { margin-top: 0.75rem; padding: 0.6rem 0.9rem; border-radius: 8px; font-size: 0.85rem; display: none; }
        .inline-alert.ok { display: block; background: rgba(5, 150, 105, 0.1); color: var(--success); }
        .inline-alert.err { display: block; background: rgba(220, 38, 38, 0.08); color: var(--danger); }
        .settings-footer { display: flex; justify-content: flex-end; gap: 0.75rem; margin-top: 1.5rem; position: sticky; bottom: -2rem; background: var(--bg-card); padding: 1rem 0; border-top: 1px solid var(--border-subtle); }
        @media (max-width: 640px) { .form-row, .form-row.ftp { grid-template-columns: 1fr; } }

        /* Hidden */
        .hidden { display: none !important; }

        /* User info in sidebar */
        .user-info {
            padding: 1rem;
            background: var(--bg-surface);
            border-radius: 8px;
            margin-top: auto;
        }
        .user-info-name { color: var(--text-primary); font-weight: 500; }
        .user-info-role { color: var(--text-muted); font-size: 0.8rem; }
        .user-info-logout {
            margin-top: 0.75rem;
            width: 100%;
            justify-content: center;
        }

        /* Empty state */
        .empty-state {
            text-align: center;
            padding: 3rem;
            color: var(--text-muted);
        }
        .empty-state i { font-size: 3rem; margin-bottom: 1rem; opacity: 0.5; }
    </style>
</head>
<body>
    <!-- Login Screen -->
    <div id="loginScreen" class="login-container">
        <div class="login-card">
            <div class="logo">
                <img class="logo-icon" src="/api/landing/assets/favicon.png" alt="Bancomanda">
                <span class="logo-text">Bancomanda</span>
                <span class="logo-badge">Admin</span>
            </div>
            <h1 class="serif">Area Superadmin</h1>
            <p>Accedi per gestire i ristoranti</p>
            <div id="loginAlert" class="login-alert error"></div>
            <form id="loginForm">
                <div class="form-group">
                    <label for="email">Email</label>
                    <input type="email" id="email" required placeholder="admin@banco.app" data-testid="admin-login-email">
                </div>
                <div class="form-group">
                    <label for="password">Password</label>
                    <input type="password" id="password" required placeholder="••••••••" data-testid="admin-login-password">
                </div>
                <button type="submit" class="btn btn-primary" style="width: 100%; justify-content: center; margin-top: 1rem;" data-testid="admin-login-submit">
                    <i class="fas fa-sign-in-alt"></i> Accedi
                </button>
            </form>
        </div>
    </div>

    <!-- Dashboard -->
    <div id="dashboardScreen" class="app-container hidden">
        <!-- Sidebar -->
        <aside class="sidebar">
            <div class="logo">
                <img class="logo-icon" src="/api/landing/assets/favicon.png" alt="Bancomanda">
                <span class="logo-text">Bancomanda</span>
                <span class="logo-badge">Admin</span>
            </div>

            <nav>
                <div class="nav-section">
                    <div class="nav-section-title">Dashboard</div>
                    <div class="nav-item active" data-view="dashboard">
                        <i class="fas fa-chart-pie"></i>
                        <span>Panoramica</span>
                    </div>
                </div>

                <div class="nav-section">
                    <div class="nav-section-title">Gestione</div>
                    <div class="nav-item" data-view="tenants">
                        <i class="fas fa-store"></i>
                        <span>Ristoranti</span>
                        <span class="nav-badge" id="pendingBadge" style="display: none;">0</span>
                    </div>
                    <div class="nav-item" data-view="demo-requests">
                        <i class="fas fa-envelope"></i>
                        <span>Richieste Demo</span>
                        <span class="nav-badge" id="demoBadge" style="display: none;">0</span>
                    </div>
                </div>
            </nav>

            <div class="user-info">
                <div class="user-info-name" id="userName">Super Admin</div>
                <div class="user-info-role">Superadmin</div>
                <button class="btn btn-outline btn-sm user-info-logout" onclick="logout()">
                    <i class="fas fa-sign-out-alt"></i> Esci
                </button>
            </div>
        </aside>

        <!-- Main Content -->
        <main class="main-content">
            <!-- Dashboard View -->
            <div id="view-dashboard">
                <div class="page-header">
                    <h1 class="page-title serif">Panoramica</h1>
                </div>

                <div class="stats-grid">
                    <div class="stat-card">
                        <div class="stat-card-header">
                            <span class="stat-card-title">Totale Ristoranti</span>
                            <div class="stat-card-icon gold"><i class="fas fa-store"></i></div>
                        </div>
                        <div class="stat-card-value" id="statTotal">0</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-card-header">
                            <span class="stat-card-title">Attivi</span>
                            <div class="stat-card-icon green"><i class="fas fa-check-circle"></i></div>
                        </div>
                        <div class="stat-card-value" id="statActive">0</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-card-header">
                            <span class="stat-card-title">In Attesa</span>
                            <div class="stat-card-icon orange"><i class="fas fa-clock"></i></div>
                        </div>
                        <div class="stat-card-value" id="statPending">0</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-card-header">
                            <span class="stat-card-title">Richieste Demo</span>
                            <div class="stat-card-icon red"><i class="fas fa-envelope"></i></div>
                        </div>
                        <div class="stat-card-value" id="statDemoNew">0</div>
                    </div>
                </div>
            </div>

            <!-- Tenants View -->
            <div id="view-tenants" class="hidden">
                <div class="page-header">
                    <h1 class="page-title serif">Ristoranti</h1>
                    <button class="btn btn-primary" onclick="openCreateTenantModal()">
                        <i class="fas fa-plus"></i> Nuovo Ristorante
                    </button>
                </div>

                <div class="tabs">
                    <div class="tab active" data-filter="all">Tutti</div>
                    <div class="tab" data-filter="attivo">Attivi</div>
                    <div class="tab" data-filter="in_attesa">In Attesa</div>
                    <div class="tab" data-filter="sospeso">Sospesi</div>
                </div>

                <div class="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Ristorante</th>
                                <th>Titolare</th>
                                <th>Stato</th>
                                <th>Creato</th>
                                <th>Azioni</th>
                            </tr>
                        </thead>
                        <tbody id="tenantsTableBody">
                        </tbody>
                    </table>
                </div>
            </div>

            <!-- Demo Requests View -->
            <div id="view-demo-requests" class="hidden">
                <div class="page-header">
                    <h1 class="page-title serif">Richieste Demo</h1>
                </div>

                <div class="tabs">
                    <div class="tab active" data-demo-filter="all">Tutte</div>
                    <div class="tab" data-demo-filter="nuova">Nuove</div>
                    <div class="tab" data-demo-filter="contattata">Contattate</div>
                    <div class="tab" data-demo-filter="archiviata">Archiviate</div>
                </div>

                <div class="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Locale</th>
                                <th>Contatto</th>
                                <th>Email</th>
                                <th>Telefono</th>
                                <th>Stato</th>
                                <th>Data</th>
                                <th>Azioni</th>
                            </tr>
                        </thead>
                        <tbody id="demoRequestsTableBody">
                        </tbody>
                    </table>
                </div>
            </div>
        </main>
    </div>

    <!-- Create Tenant Modal -->
    <div class="modal-overlay" id="createTenantModal">
        <div class="modal-content">
            <div class="modal-header">
                <h2 class="serif">Nuovo Ristorante</h2>
                <button class="modal-close" onclick="closeModal('createTenantModal')">&times;</button>
            </div>
            <form id="createTenantForm">
                <div class="form-group">
                    <label>Nome Locale *</label>
                    <input type="text" name="name" required placeholder="Es. Trattoria da Mario">
                </div>
                <div class="form-group">
                    <label>Slug *</label>
                    <input type="text" name="slug" required placeholder="trattoria-mario" pattern="[a-z0-9-]+">
                </div>
                <div class="form-group">
                    <label>Nome Titolare *</label>
                    <input type="text" name="owner_name" required placeholder="Mario Rossi">
                </div>
                <div class="form-group">
                    <label>Email Titolare *</label>
                    <input type="email" name="owner_email" required placeholder="mario@trattoria.it">
                </div>
                <div class="form-group">
                    <label>Password Iniziale *</label>
                    <input type="password" name="owner_password" required minlength="8" placeholder="Minimo 8 caratteri">
                </div>
                <div class="form-group">
                    <label>Stato Iniziale</label>
                    <select name="status">
                        <option value="attivo">Attivo</option>
                        <option value="in_attesa">In Attesa</option>
                    </select>
                </div>
                <button type="submit" class="btn btn-primary" style="width: 100%; justify-content: center;">
                    <i class="fas fa-plus"></i> Crea Ristorante
                </button>
            </form>
        </div>
    </div>

    <!-- Tenant Settings Modal -->
    <div class="modal-overlay" id="tenantSettingsModal" data-testid="tenant-settings-modal">
        <div class="modal-content modal-wide">
            <div class="modal-header">
                <h2 class="serif" id="tsTitle">Impostazioni locale</h2>
                <button class="modal-close" onclick="closeModal('tenantSettingsModal')" data-testid="tenant-settings-close">&times;</button>
            </div>
            <form id="tenantSettingsForm">
                <div class="settings-section">
                    <h3><i class="fas fa-image"></i> Logo del locale</h3>
                    <p class="settings-hint">Compare sul menu del giorno stampato. PNG, JPG o WEBP, massimo 5 MB.</p>
                    <div class="logo-box">
                        <div class="logo-preview" id="tsLogoPreview" data-testid="tenant-logo-preview">Nessun logo</div>
                        <div class="logo-actions">
                            <input type="file" id="tsLogoInput" accept="image/png,image/jpeg,image/webp" class="hidden" data-testid="tenant-logo-input">
                            <button type="button" class="btn btn-primary btn-sm" onclick="document.getElementById('tsLogoInput').click()" data-testid="tenant-logo-upload-btn"><i class="fas fa-upload"></i> Carica logo</button>
                            <button type="button" class="btn btn-danger btn-sm hidden" id="tsLogoRemove" onclick="removeTenantLogo()" data-testid="tenant-logo-remove-btn"><i class="fas fa-trash"></i> Rimuovi</button>
                        </div>
                    </div>
                    <div class="inline-alert" id="tsLogoAlert" data-testid="tenant-logo-alert"></div>
                </div>

                <div class="settings-section">
                    <h3><i class="fas fa-building"></i> Dati aziendali</h3>
                    <p class="settings-hint">Per la tua anagrafica, non compaiono nell'app.</p>
                    <div class="form-row">
                        <div class="form-group"><label>Ragione sociale</label><input name="legal_name" maxlength="160" data-testid="ts-legal-name"></div>
                        <div class="form-group"><label>Partita IVA</label><input name="vat_number" maxlength="32" data-testid="ts-vat-number"></div>
                    </div>
                    <div class="form-group"><label>Indirizzo</label><input name="address" maxlength="240" data-testid="ts-address"></div>
                    <div class="form-row">
                        <div class="form-group"><label>Telefono</label><input name="phone" maxlength="40" data-testid="ts-phone"></div>
                        <div class="form-group"><label>Email</label><input name="company_email" type="email" maxlength="160" data-testid="ts-email"></div>
                    </div>
                </div>

                <div class="settings-section">
                    <h3><i class="fas fa-message"></i> Messaggi del menu sul sito</h3>
                    <p class="settings-hint">Testi mostrati sul sito quando il menu del giorno non è pubblicato.</p>
                    <div class="form-group">
                        <label>Giorni di chiusura</label>
                        <div class="day-chips" id="tsDays" data-testid="ts-closing-days"></div>
                    </div>
                    <div class="form-group"><label>Messaggio nei giorni di chiusura</label><input name="closing_message" maxlength="300" placeholder="Oggi siamo chiusi. Torna domani per il menu." data-testid="ts-closing-message"></div>
                    <div class="form-group"><label>Messaggio quando il menu non è ancora pubblicato</label><input name="pending_message" maxlength="300" placeholder="Il menu del giorno non è ancora disponibile." data-testid="ts-pending-message"></div>
                </div>

                <div class="settings-section">
                    <h3><i class="fas fa-server"></i> Pubblicazione menu sul sito (FTP)</h3>
                    <p class="settings-hint">Servono per il tasto "Pubblica sul sito" dell'app: il file menu.json viene inviato in questa cartella.</p>
                    <div class="form-row ftp">
                        <div class="form-group"><label>Indirizzo FTP</label><input name="ftp_host" maxlength="200" placeholder="ftp.miosito.it" data-testid="ts-ftp-host"></div>
                        <div class="form-group"><label>Porta</label><input name="ftp_port" type="number" min="1" max="65535" value="21" data-testid="ts-ftp-port"></div>
                    </div>
                    <div class="form-row">
                        <div class="form-group"><label>Utente</label><input name="ftp_user" maxlength="200" autocomplete="off" data-testid="ts-ftp-user"></div>
                        <div class="form-group"><label>Password</label><input name="ftp_password" type="password" maxlength="200" autocomplete="new-password" id="tsFtpPassword" data-testid="ts-ftp-password"></div>
                    </div>
                    <div class="form-group"><label>Cartella sul sito</label><input name="ftp_directory" maxlength="300" placeholder="www.miosito.it/menu" data-testid="ts-ftp-directory"></div>
                    <button type="button" class="btn btn-outline btn-sm" onclick="testTenantFtp()" id="tsFtpTestBtn" data-testid="ts-ftp-test-btn"><i class="fas fa-plug"></i> Prova collegamento</button>
                    <div class="inline-alert" id="tsFtpAlert" data-testid="ts-ftp-alert"></div>
                </div>

                <div class="inline-alert" id="tsSaveAlert" data-testid="ts-save-alert"></div>
                <div class="settings-footer">
                    <button type="button" class="btn btn-outline" onclick="closeModal('tenantSettingsModal')" data-testid="ts-cancel-btn">Annulla</button>
                    <button type="submit" class="btn btn-primary" id="tsSaveBtn" data-testid="ts-save-btn"><i class="fas fa-check"></i> Salva impostazioni</button>
                </div>
            </form>
        </div>
    </div>

    <script>
        let accessToken = null;
        let currentUser = null;
        let currentTenantFilter = 'all';
        let currentDemoFilter = 'all';

        // Check for stored token
        const storedToken = localStorage.getItem('banco_admin_token');
        if (storedToken) {
            accessToken = storedToken;
            checkAuth();
        }

        // Login form
        document.getElementById('loginForm').addEventListener('submit', async function(e) {
            e.preventDefault();
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const alert = document.getElementById('loginAlert');

            try {
                const resp = await fetch('/api/auth/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password })
                });

                const data = await resp.json();

                if (!resp.ok) {
                    alert.textContent = data.detail || 'Credenziali non valide';
                    alert.style.display = 'block';
                    return;
                }

                if (data.user.role !== 'superadmin') {
                    alert.textContent = 'Accesso riservato ai superadmin';
                    alert.style.display = 'block';
                    return;
                }

                accessToken = data.access_token;
                currentUser = data.user;
                localStorage.setItem('banco_admin_token', accessToken);
                showDashboard();
            } catch (err) {
                alert.textContent = 'Errore di connessione';
                alert.style.display = 'block';
            }
        });

        async function checkAuth() {
            try {
                const resp = await fetch('/api/auth/me', {
                    headers: { 'Authorization': `Bearer ${accessToken}` }
                });

                if (!resp.ok) {
                    logout();
                    return;
                }

                currentUser = await resp.json();
                if (currentUser.role !== 'superadmin') {
                    logout();
                    return;
                }

                showDashboard();
            } catch (err) {
                logout();
            }
        }

        function showDashboard() {
            document.getElementById('loginScreen').classList.add('hidden');
            document.getElementById('dashboardScreen').classList.remove('hidden');
            document.getElementById('userName').textContent = currentUser.name;
            loadStats();
            loadTenants();
            loadDemoRequests();
        }

        function logout() {
            accessToken = null;
            currentUser = null;
            localStorage.removeItem('banco_admin_token');
            document.getElementById('dashboardScreen').classList.add('hidden');
            document.getElementById('loginScreen').classList.remove('hidden');
        }

        // Navigation
        document.querySelectorAll('.nav-item[data-view]').forEach(item => {
            item.addEventListener('click', function() {
                const view = this.dataset.view;
                document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
                this.classList.add('active');
                document.querySelectorAll('[id^="view-"]').forEach(v => v.classList.add('hidden'));
                document.getElementById(`view-${view}`).classList.remove('hidden');
            });
        });

        // Load Stats
        async function loadStats() {
            try {
                const resp = await fetch('/api/superadmin/stats', {
                    headers: { 'Authorization': `Bearer ${accessToken}` }
                });
                if (!resp.ok) {
                    if (resp.status === 401) { logout(); return; }
                    throw new Error('Stats load failed');
                }
                const data = await resp.json();

                document.getElementById('statTotal').textContent = data.total_tenants;
                document.getElementById('statActive').textContent = data.active_tenants;
                document.getElementById('statPending').textContent = data.pending_tenants;
                document.getElementById('statDemoNew').textContent = data.new_demo_requests;

                // Show/hide badges based on count
                const pendingBadge = document.getElementById('pendingBadge');
                const demoBadge = document.getElementById('demoBadge');
                
                if (data.pending_tenants > 0) {
                    pendingBadge.textContent = data.pending_tenants;
                    pendingBadge.style.display = 'block';
                } else {
                    pendingBadge.style.display = 'none';
                }
                
                if (data.new_demo_requests > 0) {
                    demoBadge.textContent = data.new_demo_requests;
                    demoBadge.style.display = 'block';
                } else {
                    demoBadge.style.display = 'none';
                }
            } catch (err) {
                console.error('Failed to load stats:', err);
            }
        }

        // XSS protection - escape HTML special characters
        function escapeHtml(text) {
            if (!text) return '';
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }

        // Load Tenants
        async function loadTenants() {
            try {
                const url = currentTenantFilter === 'all' 
                    ? '/api/superadmin/tenants'
                    : `/api/superadmin/tenants?status=${currentTenantFilter}`;

                const resp = await fetch(url, {
                    headers: { 'Authorization': `Bearer ${accessToken}` }
                });
                if (!resp.ok) {
                    if (resp.status === 401) { logout(); return; }
                    throw new Error('Tenants load failed');
                }
                const data = await resp.json();

                const tbody = document.getElementById('tenantsTableBody');
                if (data.tenants.length === 0) {
                    tbody.innerHTML = `
                        <tr>
                            <td colspan="5" class="empty-state">
                                <i class="fas fa-store"></i>
                                <p>Nessun ristorante trovato</p>
                            </td>
                        </tr>
                    `;
                    return;
                }

                tbody.innerHTML = data.tenants.map(t => `
                    <tr>
                        <td>
                            <strong style="color: var(--text-primary)">${escapeHtml(t.name)}</strong>
                            <div style="color: var(--text-muted); font-size: 0.8rem;">${escapeHtml(t.slug)}</div>
                        </td>
                        <td>
                            ${escapeHtml(t.owner_name) || '-'}
                            <div style="color: var(--text-muted); font-size: 0.8rem;">${escapeHtml(t.owner_email) || ''}</div>
                        </td>
                        <td>
                            <span class="badge badge-${t.status === 'attivo' ? 'active' : t.status === 'in_attesa' ? 'pending' : 'suspended'}">
                                ${t.status === 'attivo' ? 'Attivo' : t.status === 'in_attesa' ? 'In Attesa' : 'Sospeso'}
                            </span>
                        </td>
                        <td>${new Date(t.created_at).toLocaleDateString('it-IT')}</td>
                        <td>
                            ${t.status === 'in_attesa' ? `<button class="btn btn-success btn-sm" onclick="updateTenantStatus('${escapeHtml(t.id)}', 'attivo')"><i class="fas fa-check"></i> Attiva</button>` : ''}
                            ${t.status === 'attivo' ? `<button class="btn btn-danger btn-sm" onclick="updateTenantStatus('${escapeHtml(t.id)}', 'sospeso')"><i class="fas fa-ban"></i> Sospendi</button>` : ''}
                            ${t.status === 'sospeso' ? `<button class="btn btn-success btn-sm" onclick="updateTenantStatus('${escapeHtml(t.id)}', 'attivo')"><i class="fas fa-redo"></i> Riattiva</button>` : ''}
                            <button class="btn btn-outline btn-sm" onclick="openTenantSettings('${escapeHtml(t.id)}')" data-testid="tenant-settings-btn-${escapeHtml(t.slug)}"><i class="fas fa-gear"></i> Impostazioni</button>
                        </td>
                    </tr>
                `).join('');
            } catch (err) {
                console.error('Failed to load tenants:', err);
            }
        }

        // Tenant filters
        document.querySelectorAll('.tab[data-filter]').forEach(tab => {
            tab.addEventListener('click', function() {
                document.querySelectorAll('.tab[data-filter]').forEach(t => t.classList.remove('active'));
                this.classList.add('active');
                currentTenantFilter = this.dataset.filter;
                loadTenants();
            });
        });

        // Update Tenant Status
        async function updateTenantStatus(id, status) {
            try {
                await fetch(`/api/superadmin/tenants/${id}/status`, {
                    method: 'PATCH',
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ status })
                });
                loadStats();
                loadTenants();
            } catch (err) {
                alert('Errore durante l\\'aggiornamento');
            }
        }

        // Load Demo Requests
        async function loadDemoRequests() {
            try {
                const url = currentDemoFilter === 'all'
                    ? '/api/superadmin/demo-requests'
                    : `/api/superadmin/demo-requests?status=${currentDemoFilter}`;

                const resp = await fetch(url, {
                    headers: { 'Authorization': `Bearer ${accessToken}` }
                });
                if (!resp.ok) {
                    if (resp.status === 401) { logout(); return; }
                    throw new Error('Demo requests load failed');
                }
                const data = await resp.json();

                const tbody = document.getElementById('demoRequestsTableBody');
                if (data.requests.length === 0) {
                    tbody.innerHTML = `
                        <tr>
                            <td colspan="7" class="empty-state">
                                <i class="fas fa-envelope"></i>
                                <p>Nessuna richiesta trovata</p>
                            </td>
                        </tr>
                    `;
                    return;
                }

                tbody.innerHTML = data.requests.map(r => `
                    <tr>
                        <td style="color: var(--text-primary)">${escapeHtml(r.restaurant_name)}</td>
                        <td>${escapeHtml(r.contact_name)}</td>
                        <td>${escapeHtml(r.email)}</td>
                        <td>${escapeHtml(r.phone) || '-'}</td>
                        <td>
                            <span class="badge badge-${r.status === 'nuova' ? 'new' : r.status === 'contattata' ? 'active' : 'suspended'}">
                                ${r.status === 'nuova' ? 'Nuova' : r.status === 'contattata' ? 'Contattata' : 'Archiviata'}
                            </span>
                        </td>
                        <td>${new Date(r.created_at).toLocaleDateString('it-IT')}</td>
                        <td>
                            ${r.status === 'nuova' ? `<button class="btn btn-success btn-sm" onclick="updateDemoStatus('${escapeHtml(r.id)}', 'contattata')"><i class="fas fa-phone"></i></button>` : ''}
                            ${r.status !== 'archiviata' ? `<button class="btn btn-outline btn-sm" onclick="updateDemoStatus('${escapeHtml(r.id)}', 'archiviata')"><i class="fas fa-archive"></i></button>` : ''}
                        </td>
                    </tr>
                `).join('');
            } catch (err) {
                console.error('Failed to load demo requests:', err);
            }
        }

        // Demo request filters
        document.querySelectorAll('.tab[data-demo-filter]').forEach(tab => {
            tab.addEventListener('click', function() {
                document.querySelectorAll('.tab[data-demo-filter]').forEach(t => t.classList.remove('active'));
                this.classList.add('active');
                currentDemoFilter = this.dataset.demoFilter;
                loadDemoRequests();
            });
        });

        async function updateDemoStatus(id, status) {
            try {
                await fetch(`/api/superadmin/demo-requests/${id}`, {
                    method: 'PATCH',
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ status })
                });
                loadStats();
                loadDemoRequests();
            } catch (err) {
                alert('Errore durante l\\'aggiornamento');
            }
        }

        // Create Tenant Modal
        function openCreateTenantModal() {
            document.getElementById('createTenantModal').classList.add('active');
        }

        function closeModal(id) {
            document.getElementById(id).classList.remove('active');
        }

        document.getElementById('createTenantForm').addEventListener('submit', async function(e) {
            e.preventDefault();
            const formData = new FormData(this);
            const data = Object.fromEntries(formData);

            try {
                const resp = await fetch('/api/superadmin/tenants', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(data)
                });

                if (!resp.ok) {
                    const err = await resp.json();
                    alert(err.detail || 'Errore durante la creazione');
                    return;
                }

                closeModal('createTenantModal');
                this.reset();
                loadStats();
                loadTenants();
            } catch (err) {
                alert('Errore di connessione');
            }
        });

        // ===== Impostazioni locale =====
        const WEEKDAYS = ['lunedì', 'martedì', 'mercoledì', 'giovedì', 'venerdì', 'sabato', 'domenica'];
        let tsTenantId = null;

        function tsAlert(id, msg, ok) {
            const el = document.getElementById(id);
            el.textContent = msg || '';
            el.className = 'inline-alert' + (msg ? (ok ? ' ok' : ' err') : '');
        }

        function tsErr(data, fallback) {
            if (data && typeof data.detail === 'string') return data.detail;
            if (data && Array.isArray(data.detail)) return data.detail.map(d => d.msg).join(' · ');
            return fallback;
        }

        function renderLogo(url) {
            const box = document.getElementById('tsLogoPreview');
            box.innerHTML = url ? `<img src="${escapeHtml(url)}" alt="Logo" data-testid="tenant-logo-img">` : 'Nessun logo';
            document.getElementById('tsLogoRemove').classList.toggle('hidden', !url);
        }

        function fillTenantSettings(d) {
            const f = document.getElementById('tenantSettingsForm');
            document.getElementById('tsTitle').textContent = 'Impostazioni · ' + d.name;
            f.legal_name.value = d.company.legal_name || '';
            f.vat_number.value = d.company.vat_number || '';
            f.address.value = d.company.address || '';
            f.phone.value = d.company.phone || '';
            f.company_email.value = d.company.email || '';
            f.closing_message.value = d.menu.closing_message || '';
            f.pending_message.value = d.menu.pending_message || '';
            f.ftp_host.value = d.ftp.host || '';
            f.ftp_port.value = d.ftp.port || 21;
            f.ftp_user.value = d.ftp.user || '';
            f.ftp_directory.value = d.ftp.directory || '';
            f.ftp_password.value = '';
            f.ftp_password.placeholder = d.ftp.has_password ? 'Salvata · lascia vuoto per non cambiarla' : 'Non impostata';
            document.getElementById('tsDays').innerHTML = WEEKDAYS.map(day => `
                <label class="day-chip"><input type="checkbox" value="${day}" ${d.menu.closing_days.includes(day) ? 'checked' : ''} data-testid="ts-day-${day.slice(0, 3)}"><span>${day}</span></label>
            `).join('');
            renderLogo(d.logo_url);
        }

        async function openTenantSettings(id) {
            tsTenantId = id;
            ['tsLogoAlert', 'tsFtpAlert', 'tsSaveAlert'].forEach(a => tsAlert(a, ''));
            try {
                const resp = await fetch(`/api/superadmin/tenants/${id}/settings`, { headers: { 'Authorization': `Bearer ${accessToken}` } });
                if (resp.status === 401) { logout(); return; }
                const data = await resp.json();
                if (!resp.ok) { alert(tsErr(data, 'Impossibile caricare le impostazioni')); return; }
                fillTenantSettings(data);
                document.getElementById('tenantSettingsModal').classList.add('active');
            } catch (err) {
                alert('Errore di connessione');
            }
        }

        function ftpFormData() {
            const f = document.getElementById('tenantSettingsForm');
            return {
                host: f.ftp_host.value.trim(),
                port: parseInt(f.ftp_port.value, 10) || 21,
                user: f.ftp_user.value.trim(),
                directory: f.ftp_directory.value.trim(),
                password: f.ftp_password.value || null,
            };
        }

        document.getElementById('tenantSettingsForm').addEventListener('submit', async function(e) {
            e.preventDefault();
            const f = this;
            const body = {
                company: {
                    legal_name: f.legal_name.value.trim(), vat_number: f.vat_number.value.trim(),
                    address: f.address.value.trim(), phone: f.phone.value.trim(), email: f.company_email.value.trim(),
                },
                menu: {
                    closing_days: [...document.querySelectorAll('#tsDays input:checked')].map(i => i.value),
                    closing_message: f.closing_message.value.trim(),
                    pending_message: f.pending_message.value.trim(),
                },
                ftp: ftpFormData(),
            };
            const btn = document.getElementById('tsSaveBtn');
            btn.disabled = true;
            try {
                const resp = await fetch(`/api/superadmin/tenants/${tsTenantId}/settings`, {
                    method: 'PUT',
                    headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify(body),
                });
                const data = await resp.json();
                if (!resp.ok) { tsAlert('tsSaveAlert', tsErr(data, 'Salvataggio non riuscito'), false); return; }
                fillTenantSettings(data);
                tsAlert('tsSaveAlert', 'Impostazioni salvate', true);
            } catch (err) {
                tsAlert('tsSaveAlert', 'Errore di connessione', false);
            } finally {
                btn.disabled = false;
            }
        });

        async function testTenantFtp() {
            const btn = document.getElementById('tsFtpTestBtn');
            btn.disabled = true;
            tsAlert('tsFtpAlert', 'Collegamento in corso...', true);
            try {
                const resp = await fetch(`/api/superadmin/tenants/${tsTenantId}/ftp-test`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify(ftpFormData()),
                });
                const data = await resp.json();
                tsAlert('tsFtpAlert', resp.ok ? data.message : tsErr(data, 'Collegamento non riuscito'), resp.ok);
            } catch (err) {
                tsAlert('tsFtpAlert', 'Errore di connessione', false);
            } finally {
                btn.disabled = false;
            }
        }

        document.getElementById('tsLogoInput').addEventListener('change', async function() {
            const file = this.files[0];
            this.value = '';
            if (!file) return;
            if (file.size > 5 * 1024 * 1024) { tsAlert('tsLogoAlert', 'Logo troppo grande (massimo 5 MB)', false); return; }
            const fd = new FormData();
            fd.append('file', file);
            tsAlert('tsLogoAlert', 'Caricamento...', true);
            try {
                const resp = await fetch(`/api/superadmin/tenants/${tsTenantId}/logo`, {
                    method: 'POST', headers: { 'Authorization': `Bearer ${accessToken}` }, body: fd,
                });
                const data = await resp.json();
                if (!resp.ok) { tsAlert('tsLogoAlert', tsErr(data, 'Caricamento non riuscito'), false); return; }
                renderLogo(data.logo_url);
                tsAlert('tsLogoAlert', 'Logo caricato', true);
            } catch (err) {
                tsAlert('tsLogoAlert', 'Errore di connessione', false);
            }
        });

        async function removeTenantLogo() {
            if (!confirm('Rimuovere il logo di questo locale?')) return;
            try {
                const resp = await fetch(`/api/superadmin/tenants/${tsTenantId}/logo`, {
                    method: 'DELETE', headers: { 'Authorization': `Bearer ${accessToken}` },
                });
                const data = await resp.json();
                if (!resp.ok) { tsAlert('tsLogoAlert', tsErr(data, 'Rimozione non riuscita'), false); return; }
                renderLogo(null);
                tsAlert('tsLogoAlert', 'Logo rimosso', true);
            } catch (err) {
                tsAlert('tsLogoAlert', 'Errore di connessione', false);
            }
        }

        // Close modal on overlay click
        document.querySelectorAll('.modal-overlay').forEach(overlay => {
            overlay.addEventListener('click', function(e) {
                if (e.target === this) {
                    this.classList.remove('active');
                }
            });
        });
    </script>
</body>
</html>'''


@router.get("/dashboard", response_class=HTMLResponse)
async def admin_dashboard():
    """Serve the superadmin dashboard (authentication handled client-side)."""
    return HTMLResponse(content=get_dashboard_html())


@router.get("", include_in_schema=False)
@router.get("/", include_in_schema=False)
async def admin_root():
    return RedirectResponse(url="/api/admin/dashboard", status_code=307)
