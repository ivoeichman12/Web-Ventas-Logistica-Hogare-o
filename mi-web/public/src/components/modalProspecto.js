// ============================================================
// Componente: Modal de detalle / edición de un Prospecto
// ============================================================
import { estado } from '../estado.js';
import { ESTADOS_PROSPECTO } from '../config/constantes.js';
import { actualizarProspecto, eliminarProspecto } from '../services/prospectos.js';
import { toastExito, toastError } from './toast.js';
import { confirmarAccion } from './confirmModal.js';
import { conEstadoDeCarga } from '../utils.js';

// Abre el modal en modo lectura con los datos del prospecto
export function verDetalleP(id) {
    estado.prospectoActivoId = id;
    const p = estado.prospectos.find(x => x.id === id);

    const estadoActual = p.estado || 'Nuevo';
    const opcionesEstado = ESTADOS_PROSPECTO
        .map(e => `<option value="${e}" ${estadoActual === e ? 'selected' : ''}>${e}</option>`).join('');

    document.getElementById('det-p-empresa').innerText = p.nombre;
    document.getElementById('det-p-body').innerHTML = `
        <div class="info-row"><span class="info-label">Estado</span>
            <select id="det-p-estado" onchange="cambiarEstadoProspecto(this.value)" style="width:auto; margin:0; padding:6px 10px;">${opcionesEstado}</select>
        </div>
        <div class="info-row"><span class="info-label">Rubro</span><span>${p.rubro}</span></div>
        <div class="info-row"><span class="info-label">Ventas</span><span>${p.ventas}</span></div>
        <div class="info-row"><span class="info-label">Zona</span><span>${p.zona}</span></div>
        <div class="info-row"><span class="info-label">Localidad</span><span>${p.localidad}</span></div>
        <div class="info-row"><span class="info-label">Teléfono</span><span>${p.telefono}</span></div>
        <div style="margin-top:10px;"><label class="selector-label">Notas:</label><p>${p.notas || 'Sin notas'}</p></div>`;

    document.getElementById('btn-edit-p').style.display = 'block';
    document.getElementById('btn-save-p').style.display = 'none';
    document.getElementById('modal-prospecto').style.display = 'block';
}

// Cambia el modal a modo edición (inputs)
export function activarEdicionP() {
    const p = estado.prospectos.find(x => x.id === estado.prospectoActivoId);
    document.getElementById('det-p-body').innerHTML = `
        <div class="info-row"><span class="info-label">Rubro</span><input class="info-val-input" id="e-p-rubro" value="${p.rubro}"></div>
        <div class="info-row"><span class="info-label">Ventas</span><input class="info-val-input" id="e-p-ventas" value="${p.ventas}"></div>
        <div class="info-row"><span class="info-label">Zona</span><input class="info-val-input" id="e-p-zona" value="${p.zona}"></div>
        <div class="info-row"><span class="info-label">Localidad</span><input class="info-val-input" id="e-p-loc" value="${p.localidad}"></div>
        <div class="info-row"><span class="info-label">Teléfono</span><input class="info-val-input" id="e-p-tel" value="${p.telefono}"></div>
        <textarea id="e-p-notas" style="width:100%; margin-top:10px;">${p.notas || ''}</textarea>`;

    document.getElementById('btn-edit-p').style.display = 'none';
    document.getElementById('btn-save-p').style.display = 'block';
}

// Guarda los cambios de edición
export async function guardarEdicionP() {
    const cambios = {
        rubro:     document.getElementById('e-p-rubro').value,
        ventas:    document.getElementById('e-p-ventas').value,
        zona:      document.getElementById('e-p-zona').value,
        localidad: document.getElementById('e-p-loc').value,
        telefono:  document.getElementById('e-p-tel').value,
        notas:     document.getElementById('e-p-notas').value
    };
    await conEstadoDeCarga(document.getElementById('btn-save-p'), async () => {
        const { error } = await actualizarProspecto(estado.prospectoActivoId, cambios);
        if (error) return toastError('Error al actualizar: ' + error.message);
        toastExito('Prospecto actualizado.');
        cerrarModalP();
    });
}

// Cambio rápido del estado del embudo (desde el detalle, sin entrar a editar)
export async function cambiarEstadoProspecto(nuevoEstado) {
    const { error } = await actualizarProspecto(estado.prospectoActivoId, { estado: nuevoEstado });
    if (error) return toastError('Error al cambiar estado: ' + error.message);
    const p = estado.prospectos.find(x => x.id === estado.prospectoActivoId);
    if (p) p.estado = nuevoEstado; // reflejo inmediato en memoria
    toastExito(`Estado: ${nuevoEstado}.`);
}

// Borra el prospecto abierto (con confirmación)
export async function eliminarP() {
    const confirmado = await confirmarAccion('¿Seguro de borrar este prospecto?');
    if (!confirmado) return;
    const { error } = await eliminarProspecto(estado.prospectoActivoId);
    if (error) return toastError('Error al borrar: ' + error.message);
    toastExito('Prospecto borrado.');
    cerrarModalP();
}

// Cierra el modal
export function cerrarModalP() {
    document.getElementById('modal-prospecto').style.display = 'none';
}
