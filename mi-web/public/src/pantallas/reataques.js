// ============================================================
// Pantalla: Re-Ataques
// ------------------------------------------------------------
// Lista de clientes cuyo estado actual quedó en "Perdido", para
// volver a atacarlos con una estrategia/oferta superadora. Desde
// cada tarjeta se puede iniciar una re-visita (registrar un nuevo
// intento, prellenando el formulario de Registro de Visita).
// ============================================================
import { obtenerTodasLasVisitas } from '../services/visitas.js';
import { selectSingle } from '../utils.js';
import { cambiarSubzonasVisita } from './visitas.js';
import { mostrarSeccion } from '../components/navegacion.js';
import { toastInfo } from '../components/toast.js';
import { zonasData } from '../config/constantes.js';

// Escapa comillas para meter un texto dentro de un onclick="fn('...')"
function escaparJS(s) {
    return String(s || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

// Carga y dibuja la pantalla. Toma TODAS las visitas (no filtra por fecha:
// un cliente perdido lo es hasta que se lo recupere) y se queda con la
// visita más reciente de cada empresa para saber su estado actual.
export async function cargarReataques() {
    const visitas = await obtenerTodasLasVisitas(); // ya viene ordenado por fecha desc
    const vistos = new Set();
    const perdidos = [];
    for (const v of visitas) {
        if (vistos.has(v.nombre)) continue;
        vistos.add(v.nombre);
        if (v.resultado === 'Perdido') perdidos.push(v);
    }
    // Ordenamos por oportunidad: los de más envíos/día primero (más para ganar).
    perdidos.sort((a, b) => (Number(b.envios_diarios) || 0) - (Number(a.envios_diarios) || 0));
    renderReataques(perdidos);
}

function renderReataques(perdidos) {
    const resumen = document.getElementById('reataques-resumen');
    const cont = document.getElementById('reataques-lista');
    const totalEnvios = perdidos.reduce((s, v) => s + (Number(v.envios_diarios) || 0), 0);

    if (resumen) {
        resumen.textContent = perdidos.length === 0
            ? '¡No hay clientes perdidos para recuperar! 🎉'
            : `${perdidos.length} cliente(s) perdido(s) · ${totalEnvios} envíos/día en juego`;
    }

    cont.innerHTML = perdidos.length === 0
        ? '<p class="estado-vacio">Sin clientes perdidos por ahora.</p>'
        : perdidos.map(tarjetaReataque).join('');
}

function tarjetaReataque(v) {
    const fecha = v.created_at ? new Date(v.created_at).toLocaleDateString('es-AR') : '';
    const envios = (v.envios_diarios != null && v.envios_diarios !== '')
        ? `<span class="tag-v">📦 ${v.envios_diarios}/día</span>` : '';
    const motivo = v.motivo_perdida
        ? `<div class="reataque-motivo">💔 Se perdió por: <strong>${v.motivo_perdida}</strong></div>` : '';
    return `<div class="visita-card reataque-card">
        <span class="vendedor-tag">${(v.vendedor || '').toUpperCase()}</span>
        <strong>${v.nombre}</strong> <span class="badge-estado resultado-perdido">Perdido</span><br>
        <span class="tag-v tag-zona">${v.zona || 's/zona'}</span>${envios}
        ${motivo}
        <div style="font-size:0.7rem; color:var(--texto-muted); margin-top:6px;">Última visita: ${fecha}</div>
        <button class="btn-reataque" onclick="iniciarReVisita('${escaparJS(v.nombre)}', '${escaparJS(v.zona)}')">🎯 Marcar re-visita</button>
    </div>`;
}

// Arranca una re-visita: lleva al formulario de Registro de Visita ya
// prellenado con el nombre y la zona del cliente perdido, para que el
// vendedor cargue el nuevo intento. Al guardarlo con un resultado que no
// sea "Perdido", el cliente sale solo de esta lista.
export function iniciarReVisita(nombre, zonaCompleta) {
    const btnNav = document.querySelector('.nav-link[onclick*="visitas"]');
    mostrarSeccion('visitas', btnNav);

    document.getElementById('v-nombre').value = nombre;

    // La zona se guarda como "Zona X - Localidad": la separamos y marcamos
    // el botón de zona macro (que puebla las localidades) y el de localidad.
    const [macro, localidad] = (zonaCompleta || '').split(' - ');
    if (macro && zonasData[macro]) {
        const btnMacro = document.querySelector(`#g-zona-visita .btn-option[data-val="${macro}"]`);
        if (btnMacro) {
            cambiarSubzonasVisita(macro, btnMacro);
            if (localidad) {
                const btnLoc = document.querySelector(`#g-localidad-visita .btn-option[data-val="${localidad}"]`);
                if (btnLoc) selectSingle('g-localidad-visita', btnLoc);
            }
        }
    }

    window.scrollTo(0, 0);
    toastInfo(`Re-visita de ${nombre}: cargá el nuevo intento con tu oferta superadora.`);
}
