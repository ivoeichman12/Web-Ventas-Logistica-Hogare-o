// ============================================================
// Componente: Tema claro / oscuro
// ------------------------------------------------------------
// Guarda la preferencia en localStorage y la aplica poniendo
// data-tema="oscuro" en <html>. El CSS hace el resto (redefine
// las variables de color para el tema oscuro).
// ============================================================

const CLAVE = 'tema';

// Aplica el tema recibido ('claro' | 'oscuro') a la página
function aplicarTema(tema) {
    const esOscuro = tema === 'oscuro';
    document.documentElement.dataset.tema = esOscuro ? 'oscuro' : 'claro';

    // Actualiza el ícono/texto del botón del nav (si ya existe)
    const icono = document.getElementById('icono-tema');
    const label = document.getElementById('label-tema');
    if (icono) icono.textContent = esOscuro ? '🌙' : '☀️';
    if (label) label.textContent = esOscuro ? 'Modo oscuro' : 'Modo claro';

    // Actualiza el color de la barra del navegador (mobile)
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', esOscuro ? '#0b1220' : '#ffffff');
}

// Lee la preferencia guardada (default: 'claro') y la aplica.
// Se llama apenas carga la app para evitar parpadeo.
export function iniciarTema() {
    let guardado = 'claro';
    try { guardado = localStorage.getItem(CLAVE) || 'claro'; } catch (e) { /* modo privado */ }
    aplicarTema(guardado);
}

// Cambia de tema y guarda la preferencia
export function alternarTema() {
    const actual = document.documentElement.dataset.tema === 'oscuro' ? 'oscuro' : 'claro';
    const nuevo = actual === 'oscuro' ? 'claro' : 'oscuro';
    try { localStorage.setItem(CLAVE, nuevo); } catch (e) { /* modo privado */ }
    aplicarTema(nuevo);
}
