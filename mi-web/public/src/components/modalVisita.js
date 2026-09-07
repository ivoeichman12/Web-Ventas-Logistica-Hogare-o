// ============================================================
// Componente: Modal de detalle / edición de una Visita
// ============================================================
import { estado } from '../estado.js';
import { CONTACTOS_EQUIPO, OPCIONES_RESULTADO, MOTIVOS_PERDIDA, ETAPAS_PENDIENTE } from '../config/constantes.js';
import { actualizarVisita, eliminarVisita } from '../services/visitas.js';
import { toastExito, toastError } from './toast.js';
import { confirmarAccion } from './confirmModal.js';
import { pedirMotivoPerdida } from './motivoPerdida.js';
import { pedirEtapaPendiente } from './etapaPendiente.js';
import { conEstadoDeCarga } from '../utils.js';

// Agrupa un resultado (incluye el legado "A seguir") en una de las 3
// opciones vigentes, para saber cuál marcar como seleccionada en el <select>.
function grupoDeResultado(resultado) {
    if (resultado === 'Cerrado') return 'Cerrado';
    if (resultado === 'Perdido') return 'Perdido';
    return 'Pendiente'; // Pendiente, A seguir (legado) o sin definir
}

// Formatea la fecha de creación de la visita
function fechaLegible(iso) {
    if (!iso) return '-';
    return new Date(iso).toLocaleString('es-AR', {
        day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
}

// Busca una visita por id en el historial reciente o en la lista completa
function buscarVisita(id) {
    return estado.visitas.find(x => x.id === id)
        || estado.todasLasVisitas.find(x => x.id === id);
}

// Abre el modal en modo lectura con los datos de la visita
export function verDetalleVisita(id) {
    estado.visitaActivaId = id;
    const v = buscarVisita(id);
    if (!v) return;

    const grupoActual = grupoDeResultado(v.resultado);
    const opcionesResultado = OPCIONES_RESULTADO
        .map(o => `<option value="${o.valor}" ${grupoActual === o.valor ? 'selected' : ''}>${o.icono} ${o.label}</option>`).join('');

    // Si está perdido, mostramos el motivo (editable con un selector)
    const filaMotivo = grupoActual !== 'Perdido' ? '' : `
        <div class="info-row"><span class="info-label">Motivo</span>
            <select id="det-v-motivo" onchange="cambiarMotivoPerdida(this.value)" style="width:auto; max-width:62%; margin:0; padding:6px 10px;">
                ${MOTIVOS_PERDIDA.map(m => `<option value="${m.valor}" ${v.motivo_perdida === m.valor ? 'selected' : ''}>${m.icono} ${m.valor}</option>`).join('')}
            </select>
        </div>`;

    // Si está pendiente, mostramos la etapa (editable con un selector)
    const filaEtapa = grupoActual !== 'Pendiente' ? '' : `
        <div class="info-row"><span class="info-label">Etapa</span>
            <select id="det-v-etapa" onchange="cambiarEtapaPendiente(this.value)" style="width:auto; max-width:62%; margin:0; padding:6px 10px;">
                ${ETAPAS_PENDIENTE.map(e => `<option value="${e.valor}" ${v.etapa_pendiente === e.valor ? 'selected' : ''}>${e.icono} ${e.valor}</option>`).join('')}
            </select>
        </div>`;

    document.getElementById('det-v-titulo').innerText = v.nombre;
    document.getElementById('det-v-body').innerHTML = `
        <div class="info-row"><span class="info-label">Resultado</span>
            <select id="det-v-resultado" onchange="cambiarResultadoVisita(this.value)" style="width:auto; margin:0; padding:6px 10px;">${opcionesResultado}</select>
        </div>
        ${filaMotivo}
        ${filaEtapa}
        <div class="info-row"><span class="info-label">Vendedor</span><span>${v.vendedor || '-'}</span></div>
        <div class="info-row"><span class="info-label">Interés</span><span>${v.interes || '-'}</span></div>
        <div class="info-row"><span class="info-label">Cotizado</span><span>${v.cotizado ? '✅ Sí' : '— No'}</span></div>
        <div class="info-row"><span class="info-label">Envíos/día</span><span>${v.envios_diarios ?? '-'}</span></div>
        <div class="info-row"><span class="info-label">Zona</span><span>${v.zona || '-'}</span></div>
        <div class="info-row"><span class="info-label">Horario Corte</span><span>${v.horario_corte || '-'}</span></div>
        <div class="info-row"><span class="info-label">Fecha</span><span>${fechaLegible(v.created_at)}</span></div>
        <div style="margin-top:12px;"><label class="selector-label">Observaciones</label><p>${v.obs || 'Sin observaciones'}</p></div>`;

    document.getElementById('btn-edit-v').style.display = 'block';
    document.getElementById('btn-save-v').style.display = 'none';
    document.getElementById('modal-visita').style.display = 'block';
}

// Cambia el modal a modo edición (inputs)
export function activarEdicionVisita() {
    const v = buscarVisita(estado.visitaActivaId);
    if (!v) return;

    const opcionesVend = Object.keys(CONTACTOS_EQUIPO)
        .map(nom => `<option value="${nom}" ${v.vendedor === nom ? 'selected' : ''}>${nom}</option>`).join('');
    const opcionesInteres = ['Si', 'Neutro', 'No']
        .map(op => `<option value="${op}" ${v.interes === op ? 'selected' : ''}>${op}</option>`).join('');
    const opcionesCorte = ['12:00 hs', '13:00 hs', '14:00 hs', '15:00 hs']
        .map(op => `<option value="${op}" ${v.horario_corte === op ? 'selected' : ''}>${op}</option>`).join('');

    document.getElementById('det-v-body').innerHTML = `
        <label class="selector-label">Empresa / Prospecto</label>
        <input id="e-v-nombre" value="${(v.nombre || '').replace(/"/g, '&quot;')}">
        <label class="selector-label">Vendedor</label>
        <select id="e-v-vendedor">${opcionesVend}</select>
        <label class="selector-label">Interés</label>
        <select id="e-v-interes">${opcionesInteres}</select>
        <label class="selector-label">¿Se cotizó?</label>
        <select id="e-v-cotizado">
            <option value="no" ${!v.cotizado ? 'selected' : ''}>No</option>
            <option value="si" ${v.cotizado ? 'selected' : ''}>Sí</option>
        </select>
        <label class="selector-label">Envíos diarios (número)</label>
        <input id="e-v-envios" type="number" min="0" inputmode="numeric" value="${v.envios_diarios ?? ''}">
        <label class="selector-label">Zona</label>
        <input id="e-v-zona" value="${(v.zona || '').replace(/"/g, '&quot;')}">
        <label class="selector-label">Horario de Corte</label>
        <select id="e-v-corte">
            <option value="" ${!v.horario_corte ? 'selected' : ''}>Sin especificar</option>
            ${opcionesCorte}
        </select>
        <label class="selector-label">Observaciones</label>
        <textarea id="e-v-obs" rows="3">${v.obs || ''}</textarea>`;

    document.getElementById('btn-edit-v').style.display = 'none';
    document.getElementById('btn-save-v').style.display = 'block';
}

// Guarda los cambios de edición
export async function guardarEdicionVisita() {
    const cambios = {
        nombre:   document.getElementById('e-v-nombre').value,
        vendedor: document.getElementById('e-v-vendedor').value,
        interes:  document.getElementById('e-v-interes').value,
        zona:     document.getElementById('e-v-zona').value,
        horario_corte: document.getElementById('e-v-corte').value || null,
        envios_diarios: document.getElementById('e-v-envios').value === '' ? null : parseInt(document.getElementById('e-v-envios').value, 10),
        cotizado: document.getElementById('e-v-cotizado').value === 'si',
        obs:      document.getElementById('e-v-obs').value
    };
    if (!cambios.nombre.trim()) return toastError('El nombre no puede quedar vacío.');

    await conEstadoDeCarga(document.getElementById('btn-save-v'), async () => {
        const { error } = await actualizarVisita(estado.visitaActivaId, cambios);
        if (error) return toastError('Error al actualizar: ' + error.message);
        toastExito('Visita actualizada.');
        cerrarModalVisita();
    });
}

// Refleja cambios en las listas en memoria (para no esperar al realtime)
function actualizarEnMemoria(cambios) {
    [estado.visitas, estado.todasLasVisitas].forEach(lista => {
        const v = lista.find(x => x.id === estado.visitaActivaId);
        if (v) Object.assign(v, cambios);
    });
}

// Cambio rápido del resultado de la visita (desde el detalle).
// Si se marca "Perdido" pide el motivo, si se marca "Pendiente" pide la
// etapa (los dos son obligatorios).
export async function cambiarResultadoVisita(nuevoResultado) {
    const actual = buscarVisita(estado.visitaActivaId);
    let motivo = null;
    let etapa = null;

    if (nuevoResultado === 'Perdido') {
        motivo = await pedirMotivoPerdida();
        if (!motivo) {
            const sel = document.getElementById('det-v-resultado');
            if (sel) sel.value = grupoDeResultado(actual?.resultado);
            return;
        }
    } else if (nuevoResultado === 'Pendiente') {
        etapa = await pedirEtapaPendiente();
        if (!etapa) {
            const sel = document.getElementById('det-v-resultado');
            if (sel) sel.value = grupoDeResultado(actual?.resultado);
            return;
        }
    }

    // Al cambiar de grupo, limpiamos el motivo/etapa que no corresponden
    const cambios = {
        resultado: nuevoResultado,
        motivo_perdida: nuevoResultado === 'Perdido' ? motivo : null,
        etapa_pendiente: nuevoResultado === 'Pendiente' ? etapa : null
    };
    const { error } = await actualizarVisita(estado.visitaActivaId, cambios);
    if (error) return toastError('Error al cambiar resultado: ' + error.message);

    actualizarEnMemoria(cambios);
    const label = nuevoResultado === 'Perdido' ? `Perdido: ${motivo}.` : nuevoResultado === 'Pendiente' ? `Pendiente: ${etapa}.` : 'Ganado.';
    toastExito(label);
    verDetalleVisita(estado.visitaActivaId); // re-dibuja para mostrar/ocultar motivo/etapa
}

// Cambio del motivo de pérdida (cuando ya está marcada como Perdido)
export async function cambiarMotivoPerdida(nuevoMotivo) {
    const { error } = await actualizarVisita(estado.visitaActivaId, { motivo_perdida: nuevoMotivo });
    if (error) return toastError('Error al cambiar el motivo: ' + error.message);
    actualizarEnMemoria({ motivo_perdida: nuevoMotivo });
    toastExito(`Motivo: ${nuevoMotivo}.`);
}

// Cambio de la etapa de negociación (cuando ya está marcada como Pendiente)
export async function cambiarEtapaPendiente(nuevaEtapa) {
    const { error } = await actualizarVisita(estado.visitaActivaId, { etapa_pendiente: nuevaEtapa });
    if (error) return toastError('Error al cambiar la etapa: ' + error.message);
    actualizarEnMemoria({ etapa_pendiente: nuevaEtapa });
    toastExito(`Etapa: ${nuevaEtapa}.`);
}

// Borra la visita abierta (con confirmación)
export async function eliminarVisitaActiva() {
    const confirmado = await confirmarAccion('¿Seguro de borrar esta visita?');
    if (!confirmado) return;
    const { error } = await eliminarVisita(estado.visitaActivaId);
    if (error) return toastError('Error al borrar: ' + error.message);
    toastExito('Visita borrada.');
    cerrarModalVisita();
}

// Cierra el modal
export function cerrarModalVisita() {
    document.getElementById('modal-visita').style.display = 'none';
}
