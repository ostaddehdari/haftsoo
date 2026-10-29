import { readFileSync, existsSync } from 'node:fs';

const required = [
  'design-system/tokens.json','design-system/tokens.css','design-system/route-manifest.json','design-system/component-manifest.json',
  'docs/stage-02/ui-audit.md','docs/stage-02/routes-overlays.md','docs/stage-02/tokens.md','docs/stage-02/typography-rtl-icons.md',
  'docs/stage-02/components.md','docs/stage-02/responsive.md','docs/stage-02/motion.md','docs/stage-02/accessibility.md',
  'docs/stage-02/prototype.md','docs/stage-02/acceptance.md','deploy/web/index.html','deploy/web/app.css','deploy/web/app.js','deploy/web/tokens.css'
];

const fail = message => { throw new Error(`[stage-02] ${message}`); };
const read = path => readFileSync(path,'utf8');
for (const path of required) if (!existsSync(path)) fail(`missing ${path}`);

const routes = JSON.parse(read('design-system/route-manifest.json'));
const components = JSON.parse(read('design-system/component-manifest.json'));
const tokens = JSON.parse(read('design-system/tokens.json'));
const state = JSON.parse(read('project.state.json'));

if (routes.routes.length !== 15) fail('route manifest must contain 15 route families');
if (routes.overlays.length !== 10) fail('overlay manifest must contain 10 overlays');
if (new Set(routes.routes.map(route => route.id)).size !== routes.routes.length) fail('route ids must be unique');
if (components.components.length < 12) fail('component library must contain at least 12 components');
if (!['color','space','radius','shadow','typography','breakpoint','motion','layer'].every(key => key in tokens)) fail('token groups are incomplete');
if (state.currentStage !== 'S02' || state.stageStatus !== 'complete') fail('project state must close S02');
if (state.works.length !== 10 || state.works.some(work => work.status !== 'complete')) fail('S02 must have exactly 10 completed works');
if (state.works.some((work,index) => work.id !== `S02-W${String(index + 1).padStart(2,'0')}`)) fail('S02 work identifiers are not sequential');

const html = read('deploy/web/index.html');
const css = read('deploy/web/app.css');
const js = read('deploy/web/app.js');
for (const marker of ['lang="fa"','dir="rtl"','class="skip-link"','role="dialog"','aria-modal="true"','aria-live="polite"','id="main"']) if (!html.includes(marker)) fail(`prototype accessibility marker absent: ${marker}`);
for (const marker of ['prefers-reduced-motion',':focus-visible','@media(max-width:700px)']) if (!css.includes(marker)) fail(`prototype CSS marker absent: ${marker}`);
for (const marker of ['focusable','localStorage','hashchange','Escape']) if (!js.includes(marker)) fail(`prototype interaction marker absent: ${marker}`);

const corpus = required.map(read).join('\n');
const secretPatterns = [
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  /gh[pousr]_[A-Za-z0-9_]{30,}/,
  /(?:password|secret|api[_-]?key)\s*[:=]\s*["'][^"']{8,}["']/i
];
for (const pattern of secretPatterns) if (pattern.test(corpus)) fail(`possible secret detected by ${pattern}`);

console.log(`Stage 02 verified: ${state.works.length} works, ${routes.routes.length} routes, ${routes.overlays.length} overlays, ${components.components.length} components.`);
