// ============================================================
// Componente: Modal de confirmación (reemplaza a confirm())
// ------------------------------------------------------------
// Devuelve una Promise<boolean>: true si el usuario confirma.
// ============================================================

let modalEl = null;

function obtenerModal() {
    if (modalEl) return modalEl;

    modalEl = document.createElement('div');
    modalEl.className = 'modal';
    modalEl.innerHTML = `
        <div class="modal-content" style="max-width:400px; text-align:center;">
            <p id="confirm-modal-texto" style="margin-bottom:20px; font-size:1rem;"></p>
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
                <button id="confirm-modal-cancelar" class="btn-calc btn-sec">Cancelar</button>
                <button id="confirm-modal-aceptar" class="btn-calc btn-danger">Confirmar</button>
            </div>
        </div>`;
    document.body.appendChild(modalEl);
    return modalEl;
}

export function confirmarAccion(mensaje) {
    const modal = obtenerModal();
    modal.querySelector('#confirm-modal-texto').textContent = mensaje;
    modal.style.display = 'block';

    return new Promise(resolve => {
        const cerrar = (resultado) => {
            modal.style.display = 'none';
            resolve(resultado);
        };
        modal.querySelector('#confirm-modal-aceptar').onclick = () => cerrar(true);
        modal.querySelector('#confirm-modal-cancelar').onclick = () => cerrar(false);
    });
}
