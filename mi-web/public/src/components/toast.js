// ============================================================
// Componente: Toast (notificación flotante no bloqueante)
// ------------------------------------------------------------
// Reemplaza a alert(). No interrumpe al usuario ni bloquea la UI.
// ============================================================

let contenedor = null;

function obtenerContenedor() {
    if (contenedor) return contenedor;
    contenedor = document.createElement('div');
    contenedor.id = 'toast-contenedor';
    document.body.appendChild(contenedor);
    return contenedor;
}

// tipo: 'exito' | 'error' | 'info'
export function mostrarToast(mensaje, tipo = 'info') {
    const cont = obtenerContenedor();
    const iconos = { exito: '✅', error: '❌', info: 'ℹ️' };

    const toast = document.createElement('div');
    toast.className = `toast toast-${tipo}`;
    toast.innerHTML = `<span class="toast-icono">${iconos[tipo] || iconos.info}</span><span>${mensaje}</span>`;
    cont.appendChild(toast);

    // Dispara la animación de entrada
    requestAnimationFrame(() => toast.classList.add('toast-visible'));

    setTimeout(() => {
        toast.classList.remove('toast-visible');
        toast.addEventListener('transitionend', () => toast.remove(), { once: true });
    }, 3500);
}

export const toastExito = (msg) => mostrarToast(msg, 'exito');
export const toastError = (msg) => mostrarToast(msg, 'error');
export const toastInfo = (msg) => mostrarToast(msg, 'info');
