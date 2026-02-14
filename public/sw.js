// Self-destructing service worker
// When the browser checks for SW updates, it finds this file,
// installs it, and this SW immediately unregisters itself and clears all caches.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then(names => Promise.all(names.map(name => caches.delete(name))))
      .then(() => self.registration.unregister())
      .then(() => self.clients.matchAll())
      .then(clients => clients.forEach(c => c.navigate(c.url)))
  );
});
