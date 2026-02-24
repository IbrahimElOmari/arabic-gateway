// Blocking cache purge: app scripts only load AFTER SW + cache cleanup completes
(async function() {
  try {
    if ('serviceWorker' in navigator) {
      var regs = await navigator.serviceWorker.getRegistrations();
      for (var i = 0; i < regs.length; i++) {
        await regs[i].unregister();
      }
    }
    if ('caches' in window) {
      var names = await caches.keys();
      for (var j = 0; j < names.length; j++) {
        await names[j] && caches.delete(names[j]);
      }
    }
  } catch(e) { /* ignore cleanup errors */ }
  // NOW load the app - SW is guaranteed to be gone
  var s = document.createElement('script');
  s.type = 'module';
  s.src = '/src/main.tsx';
  document.body.appendChild(s);
})();
