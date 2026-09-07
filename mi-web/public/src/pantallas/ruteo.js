// ============================================================
// Pantalla: Panel de Ruteo (solo Admin)
// ============================================================
import { estado } from '../estado.js';
import { CONTACTOS_EQUIPO } from '../config/constantes.js';
import { crearItinerario } from '../services/itinerarios.js';
import { toastExito, toastError } from '../components/toast.js';
import { conEstadoDeCarga } from '../utils.js';

// Rellena el <select> de rubros con los rubros presentes en los datos
export function actualizarFiltroRubros() {
    const sel = document.getElementById('r-filter-rubro');
    const rubros = new Set(estado.prospectos.map(p => p.rubro).filter(Boolean));
    sel.innerHTML = '<option value="Todos">Todos los Rubros</option>';
    rubros.forEach(r => sel.innerHTML += `<option value="${r}">${r}</option>`);
}

// Aplica los filtros y dibuja la tabla de leads
export function filtrarRuteo() {
    const s = document.getElementById('r-search').value.toLowerCase();
    const z = document.getElementById('r-filter-zona').value;
    const r = document.getElementById('r-filter-rubro').value;
    const v = document.getElementById('r-filter-ventas').value;
    const list = document.getElementById('r-lista-leads');
    list.innerHTML = '';

    const filtrados = estado.prospectos.filter(p => {
        const mS = p.nombre.toLowerCase().includes(s);
        const mZ = (z === 'Todos' || p.zona === z);
        const mR = (r === 'Todos' || p.rubro === r);
        const mV = (v === 'Todos' || (p.ventas && p.ventas.toLowerCase().includes(v.toLowerCase())));
        return mS && mZ && mR && mV;
    });

    if (filtrados.length === 0) {
        list.innerHTML = '<p class="estado-vacio">No hay prospectos que coincidan con estos filtros.</p>';
        return;
    }

    filtrados.forEach(p => {
        list.innerHTML += `<div class="r-item-row" onclick="this.querySelector('input').click()">
            <div class="r-check-cell"><input type="checkbox" class="r-check" data-nombre="${p.nombre}" data-dir="${p.zona} - ${p.localidad}"></div>
            <div style="font-weight:bold;"><span class="r-label">Empresa</span>${p.nombre}</div>
            <div><span class="r-label">Rubro</span>${p.rubro}</div>
            <div><span class="r-label">Zona</span>${p.zona}</div>
            <div><span class="r-label">Localidad</span>${p.localidad}</div>
        </div>`;
    });
}

// Arma la ruta seleccionada, la guarda como itinerario y la envía por
// WhatsApp o Email al vendedor elegido.
export async function dispararNotificacion(canal, boton) {
    const fecha = document.getElementById('fecha-ruteo').value;
    const vendedor = document.getElementById('r-vendedor-select').value;
    const checks = document.querySelectorAll('.r-check:checked');

    if (!fecha || checks.length === 0) return toastError('Por favor, selecciona fecha y prospectos.');

    await conEstadoDeCarga(boton, async () => {
        const fechaBonita = fecha.split('-').reverse().join('/');
        const seleccionados = Array.from(checks).map(c => ({ nombre: c.dataset.nombre, dir: c.dataset.dir }));

        // Guardar la ruta en la agenda del vendedor
        const { error } = await crearItinerario({ vendedor, fecha, clientes: seleccionados });
        if (error) return toastError('Error al guardar la ruta: ' + error.message);

        let msg = `!Hola ${vendedor}, Como estas?!\n\nTus visitas para el dia ${fechaBonita} son:\n`;
        seleccionados.forEach((p, i) => msg += `${i + 1}. ${p.nombre} - ${p.dir}\n`);

        if (canal === 'whatsapp') {
            window.open(`https://api.whatsapp.com/send?phone=${CONTACTOS_EQUIPO[vendedor].phone}&text=${encodeURIComponent(msg)}`, '_blank');
        } else {
            window.open(`mailto:${CONTACTOS_EQUIPO[vendedor].email}?subject=Ruta de Visitas ${fechaBonita}&body=${encodeURIComponent(msg)}`, '_blank');
        }
        toastExito('Ruta enviada y guardada en agenda.');
    });
}
