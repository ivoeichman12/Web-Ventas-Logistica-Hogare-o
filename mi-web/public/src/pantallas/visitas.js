// ============================================================
// Pantalla: Registro de Visita + Historial
// ============================================================
import { zonasData, claseResultado } from '../config/constantes.js';
import { selectSingle, getValorSeleccionado, conEstadoDeCarga } from '../utils.js';
import { guardarVisita, obtenerTodasLasVisitas, obtenerVisitasDelMes } from '../services/visitas.js';
import { toastExito, toastError } from '../components/toast.js';
import { pedirMotivoPerdida } from '../components/motivoPerdida.js';
import { pedirEtapaPendiente } from '../components/etapaPendiente.js';

// Motivo/etapa elegidos junto con el resultado (se piden en el momento,
// no forman parte del <select> — se guardan acá hasta el submit).
let motivoPerdidaElegido = null;
let etapaPendienteElegida = null;

// Botón de Resultado (obligatorio): si es Perdido/Pendiente, pide el
// motivo/etapa correspondiente antes de dejarlo seleccionado. Si el
// vendedor cancela ese popup, el resultado queda sin elegir.
export async function elegirResultadoVisita(valor, elemento) {
    if (valor === 'Perdido') {
        const motivo = await pedirMotivoPerdida();
        if (!motivo) return;
        motivoPerdidaElegido = motivo;
        etapaPendienteElegida = null;
    } else if (valor === 'Pendiente') {
        const etapa = await pedirEtapaPendiente();
        if (!etapa) return;
        etapaPendienteElegida = etapa;
        motivoPerdidaElegido = null;
    } else {
        motivoPerdidaElegido = null;
        etapaPendienteElegida = null;
    }
    selectSingle('g-resultado-visita', elemento);
}

// Muestra las localidades de la zona elegida
export function cambiarSubzonasVisita(zona, elemento) {
    selectSingle('g-zona-visita', elemento);
    const grid = document.getElementById('g-localidad-visita');
    grid.innerHTML = '';
    zonasData[zona].forEach(l => {
        grid.innerHTML += `<div class="btn-option" onclick="selectSingle('g-localidad-visita', this)" data-val="${l}">${l}</div>`;
    });
    document.getElementById('visita-localidades-cont').style.display = 'block';
}

// Dibuja el historial de visitas recibido
export function renderHistorial(visitas) {
    const list = document.getElementById('historial-lista');
    list.innerHTML = '';

    if (visitas.length === 0) {
        list.innerHTML = '<p class="estado-vacio">Todavía no hay visitas registradas.</p>';
        return;
    }

    visitas.forEach(v => {
        const claseInteres = v.interes === 'Si' ? 'tag-si' : (v.interes === 'No' ? 'tag-no' : 'tag-neutro');
        const resultado = v.resultado || 'Pendiente';
        list.innerHTML += `<div class="visita-card" onclick="verDetalleVisita('${v.id}')">
            <span class="vendedor-tag">${(v.vendedor || '').toUpperCase()}</span>
            <strong>${v.nombre}</strong> <span class="badge-estado ${claseResultado(resultado)}">${resultado}</span><br>
            <span class="tag-v ${claseInteres}">${v.interes}</span><span class="tag-v tag-zona">${v.zona}</span>
        </div>`;
    });
}

// Guarda una nueva visita en Supabase
export async function guardarVisitaFormulario() {
    const nombre = document.getElementById('v-nombre').value;
    const zonaMacro = getValorSeleccionado('g-zona-visita');
    const localidad = getValorSeleccionado('g-localidad-visita');
    const resultado = getValorSeleccionado('g-resultado-visita');

    if (!nombre || !zonaMacro) return toastError('Nombre y Zona son obligatorios.');
    if (!resultado) return toastError('Resultado es obligatorio.');
    if (resultado === 'Perdido' && !motivoPerdidaElegido) return toastError('Falta el motivo de pérdida: volvé a elegir "Perdido".');
    if (resultado === 'Pendiente' && !etapaPendienteElegida) return toastError('Falta la etapa: volvé a elegir "Pendiente".');

    await conEstadoDeCarga(document.getElementById('btn-guardar-visita'), async () => {
        const enviosRaw = document.getElementById('v-envios').value;
        const { error } = await guardarVisita({
            nombre,
            vendedor: getValorSeleccionado('g-vend'),
            interes: getValorSeleccionado('g-int'),
            zona: `${zonaMacro} - ${localidad}`,
            horario_corte: getValorSeleccionado('g-corte'),
            envios_diarios: enviosRaw === '' ? null : parseInt(enviosRaw, 10),
            cotizado: getValorSeleccionado('g-cotizado') === 'si',
            resultado,
            motivo_perdida: resultado === 'Perdido' ? motivoPerdidaElegido : null,
            etapa_pendiente: resultado === 'Pendiente' ? etapaPendienteElegida : null,
            obs: document.getElementById('v-obs').value
        });

        if (error) return toastError('Error al guardar: ' + error.message);
        toastExito('Reporte guardado correctamente.');
        limpiarFormularioVisita(); // limpiamos y nos quedamos en la pantalla
        // El historial se refresca solo (suscripción realtime a "visitas").
    });
}

// Deja el formulario de visita en blanco, listo para cargar otra
function limpiarFormularioVisita() {
    document.getElementById('v-nombre').value = '';
    document.getElementById('v-obs').value = '';
    document.getElementById('v-envios').value = '';
    document.querySelectorAll('#visitas .btn-option.active').forEach(b => b.classList.remove('active'));
    document.getElementById('visita-localidades-cont').style.display = 'none';
    document.getElementById('g-localidad-visita').innerHTML = '';
    motivoPerdidaElegido = null;
    etapaPendienteElegida = null;
}

// Descarga las visitas como Excel. Si hay un mes elegido, baja solo
// ese mes (archivo liviano); si el campo está vacío, baja el histórico.
export async function descargarExcelVisitas() {
    const mes = document.getElementById('mes-reporte').value; // 'YYYY-MM' o ''
    const visitas = mes ? await obtenerVisitasDelMes(mes) : await obtenerTodasLasVisitas();

    if (!visitas.length) {
        return toastError(mes ? 'No hay visitas en ese mes.' : 'Todavía no hay visitas registradas.');
    }

    const data = visitas.map(v => ({
        Fecha: v.created_at ? new Date(v.created_at).toLocaleString('es-AR') : '',
        Vendedor: v.vendedor,
        Empresa: v.nombre,
        Interesado: v.interes,
        Cotizado: v.cotizado ? 'Sí' : 'No',
        'Envíos diarios': v.envios_diarios ?? '',
        Resultado: v.resultado || 'Pendiente',
        'Motivo de pérdida': v.motivo_perdida || '',
        Etapa: v.etapa_pendiente || '',
        Zona: v.zona,
        'Horario de Corte': v.horario_corte || '',
        Observaciones: v.obs
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Visitas');
    XLSX.writeFile(wb, mes ? `Reporte_Visitas_${mes}.xlsx` : 'Reporte_Visitas_Historico.xlsx');
    toastExito(`Reporte generado: ${visitas.length} visita(s).`);
}
