import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ENV_PREFIX = 'QORTIUM_EXPLORE';
const DEFAULT_NODE_API_URL = 'http://127.0.0.1:24891';
const DEFAULT_NAME = 'Explore';
const DEFAULT_IDENTIFIER = 'Explore';
const DEFAULT_TITLE = 'Explore';
const DEFAULT_DESCRIPTION = 'Browse, search, inspect, and open public Qortium QDN resources.';
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const env = (name) => process.env[`${ENV_PREFIX}_${name}`];
const nodeApiUrl = (env('NODE_API_URL') || DEFAULT_NODE_API_URL).replace(/\/+$/, '');
const publishName = env('QDN_NAME') || DEFAULT_NAME;
const identifier = env('QDN_IDENTIFIER') || DEFAULT_IDENTIFIER;
const title = env('QDN_TITLE') || DEFAULT_TITLE;
const service = env('QDN_SERVICE') || 'APP';
const distPath = path.resolve(repoRoot, env('DIST_PATH') || 'dist');
const apiKeyPath = (env('NODE_API_KEY_PATH') || '~/.config/qortium-core/runtime/apikey.txt').replace(/^~(?=\/|$)/, homedir());
const apiKey = env('NODE_API_KEY') || readFileSync(apiKeyPath, 'utf8').trim();
const privateKey = env('ACCOUNT_PRIVATE_KEY');
const pollInterval = 5_000;
const timeout = 180_000;

function headers(contentType) { return { 'X-API-KEY': apiKey, ...(contentType ? { 'Content-Type': contentType } : {}) }; }
async function request(pathname, options = {}) { const response = await fetch(`${nodeApiUrl}${pathname}`, { ...options, headers: { ...headers(), ...(options.headers || {}) } }); const text = await response.text(); if (!response.ok) throw new Error(text || `${options.method || 'GET'} ${pathname} failed with HTTP ${response.status}.`); return text; }
async function json(pathname, options) { const text = await request(pathname, options); return text ? JSON.parse(text) : null; }
async function waitForReady() { const start = Date.now(); while (Date.now() - start < timeout) { const status = await json(`/arbitrary/resource/status/${service}/${encodeURIComponent(publishName)}/${encodeURIComponent(identifier)}?build=true`); if (status?.status === 'READY') return status; if (status?.status === 'BLOCKED' || status?.status === 'BUILD_FAILED') throw new Error(`Resource status is ${status.status}.`); await new Promise(resolve => setTimeout(resolve, pollInterval)); } throw new Error('Timed out waiting for resource READY status.'); }

const packageVersion = JSON.parse(readFileSync(path.join(repoRoot, 'package.json'), 'utf8')).version;
const assets = path.join(distPath, 'assets');
if (!existsSync(path.join(distPath, 'index.html')) || !existsSync(assets)) throw new Error(`No build found at ${distPath} — run \`npm run build\` first.`);
if (!readdirSync(assets).filter(file => file.endsWith('.js')).some(file => readFileSync(path.join(assets, file), 'utf8').includes(`v${packageVersion}`))) throw new Error('dist does not contain the current package version — run `npm run build` first.');
if (!privateKey) throw new Error(`${ENV_PREFIX}_ACCOUNT_PRIVATE_KEY is required. This helper deliberately accepts no stored private key.`);
if (!/^https:\/\//.test(nodeApiUrl) && !/^http:\/\/(localhost|127(?:\.\d{1,3}){3}|\[::1\])(?::\d+)?$/i.test(nodeApiUrl) && env('ALLOW_REMOTE_SIGN') !== '1') throw new Error(`Refusing to send a private key to non-loopback HTTP node ${nodeApiUrl}. Set ${ENV_PREFIX}_ALLOW_REMOTE_SIGN=1 only after explicit review.`);
const status = await json('/admin/status');
if (!status || status.syncPercent !== 100 || status.isSynchronizing) throw new Error(`Node is not synced: ${JSON.stringify(status)}`);
const pathname = `/arbitrary/${service}/${encodeURIComponent(publishName)}/${encodeURIComponent(identifier)}`;
const raw = await request(`${pathname}?${new URLSearchParams({ title, description: DEFAULT_DESCRIPTION, fee: '0' })}`, { method: 'POST', headers: headers('text/plain'), body: distPath });
const nonce = await request('/arbitrary/compute', { method: 'POST', headers: headers('text/plain'), body: raw });
const signed = await request('/transactions/sign', { method: 'POST', headers: headers('application/json'), body: JSON.stringify({ privateKey, transactionBytes: nonce }) });
await request('/transactions/process', { method: 'POST', headers: headers('text/plain'), body: signed });
console.log(`Publishing qdn://${service}/${publishName}/${identifier} from ${distPath}`);
const ready = await waitForReady();
console.log(`Ready: qdn://${service}/${publishName}/${identifier}`);
console.log(`Status: ${ready.status}${ready.description ? ` - ${ready.description}` : ''}`);
