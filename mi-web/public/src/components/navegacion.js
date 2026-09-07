// ============================================================
// Componente: Navegación entre secciones + salir
// ============================================================
import { logout } from '../services/auth.js';
import { cargarAgendaVendedor } from '../pantallas/agenda.js';
import { cargarDashboard } from '../pantallas/dashboard.js';
import { cargarReataques } from '../pantallas/reataques.js';
import { cargarFacturacion } from '../pantallas/facturacion.js';

// Muestra la sección indicada y marca activo el botón del nav
export function mostrarSeccion(id, btn) {
    document.querySelectorAll('.view-section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.nav-link').forEach(n => n.classList.remove('active'));
    document.getElementById(id).classList.add('active');
    if (btn) btn.classList.add('active');

    // Recordamos la última sección para restaurarla al recargar la página
    try { localStorage.setItem('ultimaSeccion', id); } catch (e) { /* modo privado */ }

    cerrarSidebar(); // en celular, al elegir una sección se cierra el menú

    if (id === 'agenda-view') cargarAgendaVendedor();
    if (id === 'dashboard-view') cargarDashboard();
    if (id === 'reataques-view') cargarReataques();
    if (id === 'facturacion-view') cargarFacturacion();
}

// --- Sidebar (menú lateral) ---
export function alternarSidebar() {
    document.getElementById('sidebar').classList.toggle('abierto');
    document.getElementById('sidebar-overlay').classList.toggle('abierto');
}

export function cerrarSidebar() {
    document.getElementById('sidebar').classList.remove('abierto');
    document.getElementById('sidebar-overlay').classList.remove('abierto');
}

// Navega a una sección buscando su botón del nav (útil cuando no
// tenemos el elemento, ej: al abrir desde una notificación push)
export function irASeccion(id) {
    const btn = document.querySelector(`.nav-link[onclick*="${id}"]`);
    mostrarSeccion(id, btn);
}

// Cierra sesión y recarga
export function confirmarSalida() {
    logout().then(() => location.reload());
}
