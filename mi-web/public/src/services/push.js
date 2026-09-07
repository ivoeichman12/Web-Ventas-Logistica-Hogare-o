// ============================================================
// Servicio de notificaciones push (Web Push)
// ------------------------------------------------------------
// Pide permiso al navegador, se suscribe con la clave pública VAPID
// y guarda la suscripción en Supabase para que la Edge Function
// pueda enviarle avisos a este dispositivo más adelante.
// ============================================================
import { supabase } from '../config/supabase.js';
import { VAPID_PUBLIC_KEY } from '../config/constantes.js';
import { getUsuarioActual } from './auth.js';

// Convierte la clave VAPID (base64 url-safe) al formato que pide PushManager
function convertirClaveVapid(claveBase64) {
    const padding = '='.repeat((4 - (claveBase64.length % 4)) % 4);
    const base64 = (claveBase64 + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = atob(base64);
    return Uint8Array.from([...rawData].map(char => char.charCodeAt(0)));
}

// true si el navegador soporta notificaciones push
export function soportaPush() {
    return 'serviceWorker' in navigator && 'PushManager' in window;
}

// true si ya hay una suscripción activa en este dispositivo
export async function yaEstaSuscripto() {
    if (!soportaPush()) return false;
    const registro = await navigator.serviceWorker.ready;
    const sub = await registro.pushManager.getSubscription();
    return !!sub;
}

// Pide permiso y suscribe este dispositivo a las notificaciones push
export async function activarNotificaciones() {
    if (!soportaPush()) throw new Error('Este navegador no soporta notificaciones push.');

    const permiso = await Notification.requestPermission();
    if (permiso !== 'granted') throw new Error('No se otorgó permiso para notificaciones.');

    const registro = await navigator.serviceWorker.ready;

    // Si ya había una suscripción (quizás atada a una clave VAPID vieja),
    // la damos de baja antes de crear una nueva con la clave actual.
    const previa = await registro.pushManager.getSubscription();
    if (previa) await previa.unsubscribe();

    const suscripcion = await registro.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertirClaveVapid(VAPID_PUBLIC_KEY)
    });

    const usuario = await getUsuarioActual();
    // upsert: si este mismo dispositivo ya estaba guardado, no duplica.
    const { error } = await supabase.from('push_subscriptions').upsert({
        user_email: usuario.email,
        subscription: suscripcion.toJSON()
    }, { onConflict: 'user_email,subscription', ignoreDuplicates: true });

    if (error) throw error;
    return suscripcion;
}
