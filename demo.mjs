const status = document.getElementById('offline-status');
if ('serviceWorker' in navigator) {
  try {
    const registration = await navigator.serviceWorker.register(new URL('./service-worker.js', import.meta.url), {updateViaCache: 'none'});
    registration.update().catch(() => {});
    await navigator.serviceWorker.ready;
    status.textContent = 'Accès hors connexion prêt sur ce navigateur après ce premier chargement.';
  } catch {
    status.textContent = 'Accès en ligne disponible. La préparation hors connexion n’a pas abouti sur ce navigateur.';
  }
} else status.textContent = 'Ce navigateur ne prend pas en charge la préparation hors connexion.';
