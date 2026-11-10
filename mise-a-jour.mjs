// Recover from the original cache-first demo without touching user data.
const root = new URL('./', import.meta.url);
const target = new URL('apps/web/public/index.html', root);
const status = document.getElementById('update-status');
try {
  if (!navigator.onLine) throw new Error('Connexion nécessaire pour récupérer la version française. Revenir sur cette page une fois en ligne.');
  const response = await fetch(new URL('demo-manifest.json', root), {cache: 'no-store'});
  if (!response.ok) throw new Error('La mise à jour est momentanément indisponible. Réessayer une fois connecté.');
  const manifest = await response.json();
  if ('serviceWorker' in navigator) {
    for (const registration of await navigator.serviceWorker.getRegistrations()) {
      if (registration.scope === root.href) await registration.unregister();
    }
  }
  if ('caches' in globalThis) {
    const prefix = `bm-office-demo:${root.pathname}:`;
    for (const name of await caches.keys()) if (name.startsWith(prefix)) await caches.delete(name);
  }
  target.searchParams.set('version', manifest.buildId);
  document.getElementById('continue').href = target.href;
  status.textContent = 'Ancien cache remplacé. Ouverture des fiches en français…';
  location.replace(target.href);
} catch (error) {status.textContent = error.message;}
