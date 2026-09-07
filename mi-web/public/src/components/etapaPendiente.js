// ============================================================
// Componente: Selector de la etapa de negociación (Pendiente)
// ------------------------------------------------------------
// Se muestra al marcar una visita como "Pendiente". Devuelve una
// Promise<string|null>: la etapa elegida, o null si se cancela.
// ============================================================
import { ETAPAS_PENDIENTE } from '../config/constantes.js';

let modalEl = null;

function obtenerModal() {
    if (modalEl) return modalEl;

    modalEl = document.createElement('div');
    modalEl.className = 'modal';
    modalEl.innerHTML = `
        <div class="modal-content" style="max-width:440px;">
            <h2 style="margin-bottom:6px;">¿En qué etapa está?</h2>
            <p style="color:var(--texto-muted); font-size:0.85rem; margin-bottom:16px;">
                Elegí cómo viene la negociación con este cliente.
            </p>
            <div id="etapa-opciones" class="motivo-lista"></div>
            <button id="etapa-cancelar" class="btn-calc btn-sec" style="margin-top:14px;">Cancelar</button>
        </div>`;
    document.body.appendChild(modalEl);
    return modalEl;
}

export function pedirEtapaPendiente() {
    const modal = obtenerModal();
    const cont = modal.querySelector('#etapa-opciones');

    cont.innerHTML = ETAPAS_PENDIENTE.map(e => `
        <button class="motivo-opcion" data-valor="${e.valor}">
            <span class="motivo-icono">${e.icono}</span>${e.valor}
        </button>`).join('');

    modal.style.display = 'block';

    return new Promise(resolve => {
        const cerrar = (valor) => {
            modal.style.display = 'none';
            resolve(valor);
        };
        cont.querySelectorAll('.motivo-opcion').forEach(btn => {
            btn.onclick = () => cerrar(btn.dataset.valor);
        });
        modal.querySelector('#etapa-cancelar').onclick = () => cerrar(null);
    });
}
