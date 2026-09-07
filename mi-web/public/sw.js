// ============================================================
// Service Worker — minimalista
// ------------------------------------------------------------
// Solo se encarga de: permitir instalar la app (PWA) y mostrar
// notificaciones push. A propósito NO cachea archivos (evita
// que queden versiones viejas "pegadas" en el celular).
// ============================================================

self.addEventListener('install', () => {
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(self.clients.claim());
});

// Llega una notificación push desde el servidor (Supabase Edge Function)
self.addEventListener('push', (event) => {
    let datos = { title: 'Logística Hogareño', body: 'Tenés una novedad.' };
    try { datos = event.data.json(); } catch (e) { /* usa el default de arriba */ }

    event.waitUntil(
        self.registration.showNotification(datos.title, {
            body: datos.body,
            icon: 'data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 100 100\'%3E%3Ctext y=\'.9em\' font-size=\'90\'%3E%F0%9F%9A%9A%3C/text%3E%3C/svg%3E',
            badge: undefined,
            data: { url: datos.url || '/' }
        })
    );
});

// El usuario toca la notificación: abre (o enfoca) la app en Mi Agenda
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    const url = event.notification.data?.url || '/';
    const destino = event.notification.data?.destino || 'agenda-view';
    event.waitUntil((async () => {
        const clientes = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
        for (const client of clientes) {
            if (client.url.includes(self.location.origin) && 'focus' in client) {
                await client.focus();
                // La app ya estaba abierta: le pedimos que navegue a la sección
                client.postMessage({ tipo: 'navegar', destino });
                return;
            }
        }
        // La app estaba cerrada: la abrimos directo en la agenda
        if (self.clients.openWindow) return self.clients.openWindow(url);
    })());
});
