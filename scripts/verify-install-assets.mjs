import { readFile, access } from 'node:fs/promises';
import { constants } from 'node:fs';

const required = [
  'compose.yaml',
  '.env.example',
  'install.sh',
  'scripts/configure-nginx.sh',
  'scripts/update.sh',
  'deploy/nginx/container.conf',
  'deploy/web/index.html',
  'deploy/web/vendor/maplibre-gl-5.14.0.js',
  'deploy/web/vendor/maplibre-gl-5.14.0.css',
  'deploy/web/vendor/LICENSE.maplibre-gl.txt'
];

for (const file of required) await access(file, constants.R_OK);

const compose = await readFile('compose.yaml', 'utf8');
const installer = await readFile('install.sh', 'utf8');
const nginx = await readFile('deploy/nginx/container.conf', 'utf8');
const web = await readFile('deploy/web/index.html', 'utf8');

if (!compose.includes('127.0.0.1:${WEB_PORT:-3100}:8080')) throw new Error('Web port must bind to loopback only.');
if (!compose.includes('no-new-privileges:true')) throw new Error('Container hardening is missing.');
if (!installer.includes('merge --ff-only')) throw new Error('Installer updates must be fast-forward only.');
if (!nginx.includes('location /haftsoo/')) throw new Error('Base path route is missing.');
if (!nginx.includes('max-age=0, must-revalidate')) throw new Error('Static release cache revalidation is missing.');
if (!web.includes('maplibre-gl-5.14.0.js') || !/app\.js\?v=stage(?:14-map-3|15-media-1)/.test(web)) throw new Error('Installable map assets are missing or stale.');

const forbidden = [/BEGIN (RSA |OPENSSH )?PRIVATE KEY/, /sAccessToken=/, /password\s*[:=]\s*[^$\s]/i];
for (const file of required) {
  const content = await readFile(file, 'utf8');
  for (const pattern of forbidden) if (pattern.test(content)) throw new Error(`Possible secret in ${file}`);
}

console.log(`Install assets verified: ${required.length} files, loopback binding, hardening and secret scan passed.`);

