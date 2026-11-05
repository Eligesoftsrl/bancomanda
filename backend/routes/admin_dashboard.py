"""
Superadmin Dashboard HTML page.
"""
from fastapi import APIRouter, Request, Depends, HTTPException
from fastapi.responses import HTMLResponse
from auth.dependencies import get_current_user, CurrentUser

router = APIRouter(prefix="/admin", tags=["Admin Dashboard"])


def get_dashboard_html() -> str:
    """Generate the superadmin dashboard HTML."""
    return '''<!DOCTYPE html>
<html lang="it">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Bancó Admin — Dashboard Superadmin</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@500;600;700&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <style>
        :root {
            /* Light warm theme inspired by giorgiobistrot.it */
            --bg-main: #faf9f6;
            --bg-surface: #f5f3ef;
            --bg-elevated: #ffffff;
            --bg-card: #ffffff;
            --primary: #2d5a27;
            --primary-hover: #3d7a37;
            --primary-light: rgba(45, 90, 39, 0.1);
            --accent: #c4501c;
            --accent-light: rgba(196, 80, 28, 0.1);
            --text-primary: #1a1a1a;
            --text-secondary: #555555;
            --text-muted: #888888;
            --border-subtle: #e5e2dc;
            --border-dark: #d1cdc4;
            --success: #2d5a27;
            --warning: #c4501c;
            --danger: #b91c1c;
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
            background: linear-gradient(135deg, var(--primary) 0%, var(--primary-hover) 100%);
            border-radius: 10px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: bold;
            font-size: 1.25rem;
        }
        .logo-text { font-size: 1.25rem; color: var(--text-primary); font-weight: 600; }
        .logo-badge {
            font-size: 0.65rem;
            background: var(--primary-light);
            color: var(--primary);
            padding: 0.2rem 0.5rem;
            border-radius: 4px;
            margin-left: 0.5rem;
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
        .stat-card-icon.green { background: rgba(45, 90, 39, 0.1); color: var(--success); }
        .stat-card-icon.orange { background: rgba(196, 80, 28, 0.1); color: var(--warning); }
        .stat-card-icon.red { background: rgba(185, 28, 28, 0.1); color: var(--danger); }
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
        .badge-active { background: rgba(45, 90, 39, 0.1); color: var(--success); }
        .badge-pending { background: rgba(196, 80, 28, 0.1); color: var(--warning); }
        .badge-suspended { background: rgba(185, 28, 28, 0.1); color: var(--danger); }
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
        .btn-success { background: rgba(45, 90, 39, 0.1); color: var(--success); border: 1px solid rgba(45, 90, 39, 0.3); }
        .btn-success:hover { background: rgba(45, 90, 39, 0.2); }
        .btn-danger { background: rgba(185, 28, 28, 0.1); color: var(--danger); border: 1px solid rgba(185, 28, 28, 0.3); }
        .btn-danger:hover { background: rgba(185, 28, 28, 0.2); }
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
            background: rgba(185, 28, 28, 0.1);
            border: 1px solid rgba(185, 28, 28, 0.3);
            color: var(--danger);
        }

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
                <div class="logo-icon">B</div>
                <span class="logo-text">Bancó</span>
                <span class="logo-badge">Admin</span>
            </div>
            <h1 class="serif">Area Superadmin</h1>
            <p>Accedi per gestire i ristoranti</p>
            <div id="loginAlert" class="login-alert error"></div>
            <form id="loginForm">
                <div class="form-group">
                    <label for="email">Email</label>
                    <input type="email" id="email" required placeholder="admin@banco.app">
                </div>
                <div class="form-group">
                    <label for="password">Password</label>
                    <input type="password" id="password" required placeholder="••••••••">
                </div>
                <button type="submit" class="btn btn-primary" style="width: 100%; justify-content: center; margin-top: 1rem;">
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
                <div class="logo-icon">B</div>
                <span class="logo-text">Bancó</span>
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
