// ============================================================
// Componente: Selector del motivo de pérdida
// ------------------------------------------------------------
// Se muestra al marcar una visita como "Perdido". Devuelve una
// Promise<string|null>: el motivo elegido, o null si se cancela.
// ============================================================
import { MOTIVOS_PERDIDA } from '../config/constantes.js';

let modalEl = null;

function obtenerModal() {
    if (modalEl) return modalEl;

    modalEl = document.createElement('div');
    modalEl.className = 'modal';
    modalEl.innerHTML = `
        <div class="modal-content" style="max-width:440px;">
            <h2 style="margin-bottom:6px;">¿Por qué se perdió?</h2>
            <p style="color:var(--texto-muted); font-size:0.85rem; margin-bottom:16px;">
                Elegí el motivo para poder analizar después por qué perdemos clientes.
            </p>
            <div id="motivo-opciones" class="motivo-lista"></div>
            <button id="motivo-cancelar" class="btn-calc btn-sec" style="margin-top:14px;">Cancelar</button>
        </div>`;
    document.body.appendChild(modalEl);
    return modalEl;
}

export function pedirMotivoPerdida() {
    const modal = obtenerModal();
    const cont = modal.querySelector('#motivo-opciones');

    cont.innerHTML = MOTIVOS_PERDIDA.map(m => `
        <button class="motivo-opcion" data-valor="${m.valor}">
            <span class="motivo-icono">${m.icono}</span>${m.valor}
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
        modal.querySelector('#motivo-cancelar').onclick = () => cerrar(null);
    });
}
