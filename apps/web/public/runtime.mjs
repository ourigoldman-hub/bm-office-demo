// Same application code on a local Node server, a static demo or a future API.
const config = globalThis.BM_OFFICE_CONFIG || {};
const root = new URL('../../../', import.meta.url);
export const runtime = Object.freeze({
  mode: config.mode || 'local',
  syncEnabled: config.syncEnabled !== false,
  serviceWorkerEnabled: config.serviceWorkerEnabled !== false,
  serviceWorkerUrl: new URL(config.serviceWorkerUrl || 'sw.js', root).href,
  storageName: config.storageName || 'bm-office-offline-foundation-v1',
  apiBaseUrl: new URL(config.apiBaseUrl || 'api/', root).href,
});
export const apiUrl = path => new URL(path, runtime.apiBaseUrl).href;
