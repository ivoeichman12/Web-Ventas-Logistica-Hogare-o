// ============================================================
// main.js — Punto de entrada de la aplicación
// ------------------------------------------------------------
// - Escucha la sesión de Supabase Auth.
// - Al loguear, carga los datos y se suscribe a cambios en vivo.
// - Expone en `window` las funciones que usa el HTML (onclick).
// ============================================================
import { estado } from './estado.js';
import { selectSingle } from './utils.js';

// Servicios de datos
import { login } from './services/auth.js';
import { onAuthChange } from './services/auth.js';
import { obtenerProspectos, suscribirProspectos } from './services/prospectos.js';
import { obtenerVisitasRecientes, suscribirVisitas, obtenerClientesCerrados } from './services/visitas.js';

// Pantallas
import { renderProspectos, vaciarProspectos, importarProspectosDesdeExcel } from './pantallas/prospectos.js';
import { filtrarRuteo, actualizarFiltroRubros, dispararNotificacion } from './pantallas/ruteo.js';
import { cambiarSubzonasVisita, renderHistorial, guardarVisitaFormulario, descargarExcelVisitas, elegirResultadoVisita } from './pantallas/visitas.js';
import { cargarAgendaVendedor, mandarReporte, activarNotificacionesUI } from './pantallas/agenda.js';
import { iniciarReVisita } from './pantallas/reataques.js';
import { cargarFacturacion, recalcularFacturacion, factHistorico, toggleFilaFacturacion } from './pantallas/facturacion.js';
import { descargarPresentacion } from './pantallas/presentacion.js';
import { renderClientes } from './pantallas/clientes.js';
import { verVisitasDeZona, verVisitasPorResultado, verVisitasPorVendedor, verVisitasPorInteres, verVisitasPorCorte, verVisitasPorMotivo, verEnviosDe, verDesglosePorVendedor, verClientesCerrados, verClientesPerdidos, verClientesPendientes, verPendientesPorEtapa, verVisitasInteresados, cerrarModalZona, cargarDashboard, renderInteresDashboard, renderResultadoDashboard, renderZonaDashboard, dashEsteMes, dashHistorico } from './pantallas/dashboard.js';

// Componentes
import { mostrarSeccion, confirmarSalida, irASeccion, alternarSidebar, cerrarSidebar } from './components/navegacion.js';
import { verDetalleP, activarEdicionP, guardarEdicionP, eliminarP, cerrarModalP, cambiarEstadoProspecto } from './components/modalProspecto.js';
import { verDetalleVisita, activarEdicionVisita, guardarEdicionVisita, eliminarVisitaActiva, cerrarModalVisita, cambiarResultadoVisita, cambiarMotivoPerdida, cambiarEtapaPendiente } from './components/modalVisita.js';
import { toastError } from './components/toast.js';
import { iniciarTema, alternarTema } from './components/tema.js';
import { conEstadoDeCarga } from './utils.js';

// Aplica el tema guardado (claro/oscuro) apenas carga, antes de mostrar nada
iniciarTema();

// ------------------------------------------------------------
// Login desde la pantalla inicial
// ------------------------------------------------------------
async function accederConPassword() {
    const email = document.getElementById('email-login').value;
    const pass = document.getElementById('pass-login').value;
    await conEstadoDeCarga(document.getElementById('btn-login'), async () => {
        const { error } = await login(email, pass);
        if (error) toastError('Error de acceso: revisá tu email y contraseña.');
    });
}

// ------------------------------------------------------------
// Carga de datos (se reutiliza como callback de realtime)
// ------------------------------------------------------------
async function cargarProspectos() {
    estado.prospectos = await obtenerProspectos();
    renderProspectos();
    actualizarFiltroRubros();
    filtrarRuteo();
}

async function cargarVisitas() {
    estado.visitas = await obtenerVisitasRecientes();
    renderHistorial(estado.visitas);
}

async function cargarClientes() {
    renderClientes(await obtenerClientesCerrados());
}

// Si la app se abrió desde una notificación (URL con ?ir=agenda),
// recordamos el destino para saltar ahí una vez logueado.
const paramsURL = new URLSearchParams(location.search);
let destinoInicial = paramsURL.get('ir') === 'agenda' ? 'agenda-view' : null;

// Si la app YA estaba abierta y el usuario toca la notificación, el
// service worker nos manda un mensaje para navegar a la sección.
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('message', (e) => {
        if (e.data?.tipo === 'navegar' && e.data.destino) irASeccion(e.data.destino);
    });
}

// Evita suscribirse dos veces si el evento de auth se repite
let datosIniciados = false;

async function iniciarDatos() {
    if (datosIniciados) return;
    datosIniciados = true;

    // Carga inicial: esperamos a que termine para recién ahí ocultar la
    // pantalla de carga y mostrar la app con los datos ya cargados.
    await Promise.all([cargarProspectos(), cargarVisitas(), cargarClientes()]);

    // Suscripciones en vivo (equivalente a onSnapshot de Firebase).
    // Al cambiar una visita también refrescamos los clientes cerrados,
    // porque ahora se derivan de las visitas con resultado 'Cerrado'.
    suscribirProspectos(cargarProspectos);
    suscribirVisitas(() => { cargarVisitas(); cargarClientes(); });
}

// ------------------------------------------------------------
// Reacción a los cambios de sesión
// ------------------------------------------------------------
onAuthChange(async user => {
    if (!user) return; // sin sesión: se queda en la pantalla de login

    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('app-interface').style.display = 'block';

    const email = user.email.toLowerCase();
    estado.esAdmin = email.includes('ivo') || email.includes('eichman');
    if (estado.esAdmin) document.getElementById('nav-ruteo').style.display = 'block';

    document.getElementById('filtro-fecha-agenda').valueAsDate = new Date();
    document.getElementById('mes-reporte').value = new Date().toISOString().slice(0, 7); // reporte Excel: mes actual
    // Dashboard: arranca mostrando el mes actual (del 1ro a hoy)
    const hoy = new Date();
    const iso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    document.getElementById('dash-desde').value = iso(new Date(hoy.getFullYear(), hoy.getMonth(), 1));
    document.getElementById('dash-hasta').value = iso(hoy);

    // Solo la primera vez (recién iniciada la sesión) mostramos la pantalla
    // de carga y elegimos la sección inicial. En refrescos de token no.
    const esPrimera = !datosIniciados;
    if (esPrimera) document.getElementById('loading-screen').style.display = 'flex';

    const t0 = Date.now();
    await iniciarDatos();

    if (esPrimera) {
        // 1) si vino desde una notificación push -> Mi Agenda
        // 2) si no, restaurar la última sección que estaba viendo
        if (destinoInicial) {
            irASeccion(destinoInicial);
            destinoInicial = null;
        } else {
            const guardada = localStorage.getItem('ultimaSeccion');
            const permitida = guardada && document.getElementById(guardada)
                && (guardada !== 'ruteo-view' || estado.esAdmin);
            irASeccion(permitida ? guardada : 'dashboard-view');
        }

        // Mínimo de tiempo visible para que no parpadee
        const restante = 400 - (Date.now() - t0);
        if (restante > 0) await new Promise(r => setTimeout(r, restante));
        document.getElementById('loading-screen').style.display = 'none';
    }
});

// ------------------------------------------------------------
// Registrar el Service Worker (habilita instalar la app y recibir push)
// ------------------------------------------------------------
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(err => console.error('Error al registrar el service worker:', err));
}

// ------------------------------------------------------------
// Exponer funciones al HTML (los atributos onclick las buscan en window)
// ------------------------------------------------------------
Object.assign(window, {
    // Auth / navegación
    accederConPassword, mostrarSeccion, confirmarSalida,
    // Prospectos
    renderProspectos, vaciarProspectos, importarProspectosDesdeExcel,
    // Ruteo
    filtrarRuteo, dispararNotificacion,
    // Visitas
    cambiarSubzonasVisita, guardarVisitaFormulario, descargarExcelVisitas, elegirResultadoVisita,
    // Agenda
    cargarAgendaVendedor, mandarReporte, activarNotificacionesUI,
    // Re-Ataques
    iniciarReVisita,
    // Facturación
    cargarFacturacion, recalcularFacturacion, factHistorico, toggleFilaFacturacion,
    // Presentación descargable
    descargarPresentacion,
    // Modal prospecto
    verDetalleP, activarEdicionP, guardarEdicionP, eliminarP, cerrarModalP, cambiarEstadoProspecto,
    // Modal visita
    verDetalleVisita, activarEdicionVisita, guardarEdicionVisita, eliminarVisitaActiva, cerrarModalVisita, cambiarResultadoVisita, cambiarMotivoPerdida, cambiarEtapaPendiente,
    // Dashboard: filtro por mes + de vendedor en interés + drill-down (zona / resultado / vendedor / interés / corte)
    cargarDashboard, dashEsteMes, dashHistorico, renderInteresDashboard, renderResultadoDashboard, renderZonaDashboard, verVisitasDeZona, verVisitasPorResultado, verVisitasPorVendedor, verVisitasPorInteres, verVisitasPorCorte, verVisitasPorMotivo, verEnviosDe, verDesglosePorVendedor, verClientesCerrados, verClientesPerdidos, verClientesPendientes, verPendientesPorEtapa, verVisitasInteresados, cerrarModalZona,
    // Tema claro/oscuro
    alternarTema,
    // Sidebar
    alternarSidebar, cerrarSidebar,
    // Utilidades usadas en el HTML
    selectSingle
});
