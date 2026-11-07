// Build Vercel: sposta l'export web in dist/app (l'app vive su bancomanda.com/app) e adatta il manifest PWA
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const exported = path.join(root, 'dist-export');
const out = path.join(root, 'dist');

fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });
fs.renameSync(exported, path.join(out, 'app'));

const manifestPath = path.join(out, 'app', 'manifest.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
manifest.start_url = '/app/';
manifest.scope = '/app/';
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

console.log('Vercel: app pronta in dist/app');
