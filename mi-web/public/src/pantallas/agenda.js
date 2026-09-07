// ============================================================
// Pantalla: Mi Agenda (visitas asignadas al vendedor logueado)
// ============================================================
import { getUsuarioActual } from '../services/auth.js';
import { obtenerAgenda } from '../services/itinerarios.js';
import { mostrarSeccion } from '../components/navegacion.js';
import { soportaPush, yaEstaSuscripto, activarNotificaciones } from '../services/push.js';
import { toastExito, toastError } from '../components/toast.js';
import { conEstadoDeCarga } from '../utils.js';

// Muestra u oculta el botón de "Activar notificaciones" según corresponda
async function actualizarUINotificaciones() {
    const boton = document.getElementById('btn-activar-notificaciones');
    const notaIOS = document.getElementById('nota-notificaciones-ios');

    if (!soportaPush()) {
        boton.style.display = 'none';
        notaIOS.style.display = 'none';
        return;
    }

    // En iPhone, Web Push solo funciona si la app está agregada a la pantalla de inicio
    const esIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const esStandalone = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
    if (esIOS && !esStandalone) {
        boton.style.display = 'none';
        notaIOS.style.display = 'block';
        return;
    }
    notaIOS.style.display = 'none';

    // Siempre mostramos el botón: permite (re)activar en este dispositivo.
    // Si ya está suscripto, lo indicamos en el texto.
    const suscripto = await yaEstaSuscripto();
    boton.style.display = 'block';
    boton.textContent = suscripto
        ? '🔔 Notificaciones activadas (tocá para reactivar)'
        : '🔔 Activar notificaciones de rutas nuevas';
}

// Handler del botón "Activar notificaciones"
export async function activarNotificacionesUI() {
    await conEstadoDeCarga(document.getElementById('btn-activar-notificaciones'), async () => {
        try {
            await activarNotificaciones();
            toastExito('¡Notificaciones activadas!');
            await actualizarUINotificaciones();
        } catch (e) {
            toastError(e.message);
        }
    });
}

// Carga la agenda del vendedor para la fecha seleccionada
export async function cargarAgendaVendedor() {
    actualizarUINotificaciones();
    const fecha = document.getElementById('filtro-fecha-agenda').value;
    const usuario = await getUsuarioActual();
    const email = (usuario?.email || '').toLowerCase();

    // Deducir el nombre del vendedor a partir del email
    let vendedor = 'Ivo';
    if (email.includes('d.lizarraga')) vendedor = 'Dante';
    else if (email.includes('n.avanzini')) vendedor = 'Nahuel';
    else if (email.includes('i.eichman') || email.includes('ivo')) vendedor = 'Ivo';

    const itinerarios = await obtenerAgenda(vendedor, fecha);
    const cont = document.getElementById('lista-agenda');
    cont.innerHTML = '';

    const totalClientes = (itinerarios || []).reduce((acc, it) => acc + (it.clientes || []).length, 0);
    if (totalClientes === 0) {
        cont.innerHTML = '<p class="estado-vacio">No hay visitas para este día.</p>';
        return;
    }

    itinerarios.forEach(it => {
        (it.clientes || []).forEach(c => {
            cont.innerHTML += `<div class="agenda-card">
                <strong>${c.nombre}</strong><br>📍 ${c.dir}
                <div style="margin-top:10px; display:flex; gap:10px;">
                    <button class="btn-sec" onclick="window.open('https://www.google.com/maps/search/${encodeURIComponent(c.dir)}', '_blank')">🗺️ Mapa</button>
                    <button class="btn-sec" onclick="mandarReporte('${c.nombre}')">📝 Reportar</button>
                </div>
            </div>`;
        });
    });
}

// Salta al formulario de visita con el nombre precargado
export function mandarReporte(nombre) {
    mostrarSeccion('visitas', document.querySelector('button[onclick*="visitas"]'));
    document.getElementById('v-nombre').value = nombre;
    window.scrollTo(0, 0);
}
