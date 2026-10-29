import { readFile, access } from 'node:fs/promises';
import { constants } from 'node:fs';

const required = [
  'compose.yaml',
  '.env.example',
  'install.sh',
  'scripts/configure-nginx.sh',
  'scripts/update.sh',
  'deploy/nginx/container.conf',
  'deploy/web/index.html'
];

for (const file of required) await access(file, constants.R_OK);

const compose = await readFile('compose.yaml', 'utf8');
const installer = await readFile('install.sh', 'utf8');
const nginx = await readFile('deploy/nginx/container.conf', 'utf8');

if (!compose.includes('127.0.0.1:${WEB_PORT:-3100}:8080')) throw new Error('Web port must bind to loopback only.');
if (!compose.includes('no-new-privileges:true')) throw new Error('Container hardening is missing.');
if (!installer.includes('merge --ff-only')) throw new Error('Installer updates must be fast-forward only.');
if (!nginx.includes('location /haftsoo/')) throw new Error('Base path route is missing.');

const forbidden = [/BEGIN (RSA |OPENSSH )?PRIVATE KEY/, /sAccessToken=/, /password\s*[:=]\s*[^$\s]/i];
for (const file of required) {
  const content = await readFile(file, 'utf8');
  for (const pattern of forbidden) if (pattern.test(content)) throw new Error(`Possible secret in ${file}`);
}

console.log(`Install assets verified: ${required.length} files, loopback binding, hardening and secret scan passed.`);

