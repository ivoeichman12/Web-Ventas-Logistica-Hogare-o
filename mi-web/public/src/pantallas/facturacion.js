// ============================================================
// Pantalla: Facturación (estimada)
// ------------------------------------------------------------
// Estima la facturación de los clientes GANADOS en un período:
//   facturación = precio promedio por envío
//               × (suma de envíos/día de los clientes ganados)
//               × días hábiles del mes
// Se filtra por mes (input month) o por histórico (mes vacío).
// El precio y los días se guardan en el navegador (localStorage).
//
// Además de la estimación del período elegido, se muestra un
// histórico mes a mes (todos los meses con datos) con filas
// desplegables para ver el detalle de qué clientes aportaron.
// ============================================================
import { obtenerVisitasDelMes, obtenerTodasLasVisitas } from '../services/visitas.js';

const LS_PRECIO = 'fact_precio';
const LS_DIAS = 'fact_dias';

const fmtPesos = n => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n || 0);
const fmtNum = n => new Intl.NumberFormat('es-AR').format(Math.round(n || 0));

// 'YYYY-MM' -> 'MM/YYYY'
function mesBonito(mes) {
    const [y, m] = mes.split('-');
    return `${m}/${y}`;
}

// Dado un array de visitas (ya filtrado a un período), calcula los
// clientes ganados (únicos por empresa) y sus totales.
function calcularGanados(visitas) {
    const vistos = new Set();
    const ganados = [];
    for (const v of visitas) {
        if (v.resultado !== 'Cerrado' || vistos.has(v.nombre)) continue;
        vistos.add(v.nombre);
        ganados.push(v);
    }
    const enviosDia = ganados.reduce((s, v) => s + (Number(v.envios_diarios) || 0), 0);
    return { ganados, enviosDia };
}

// Prepara la pantalla: restaura precio/días guardados y mes actual (una sola
// vez), y calcula.
export async function cargarFacturacion() {
    const precioInput = document.getElementById('fact-precio');
    if (precioInput && !precioInput.dataset.init) {
        precioInput.value = localStorage.getItem(LS_PRECIO) || '';
        document.getElementById('fact-dias').value = localStorage.getItem(LS_DIAS) || '22';
        document.getElementById('fact-mes').value = new Date().toISOString().slice(0, 7);
        precioInput.dataset.init = '1';
    }
    cacheVisitas = null; // fuerza a traer datos frescos al entrar a la pantalla
    mesesAbiertos.clear();
    await recalcularFacturacion();
}

// Botón "Histórico": limpia el mes (toma todas las visitas).
export function factHistorico() {
    document.getElementById('fact-mes').value = '';
    recalcularFacturacion();
}

// Calcula y dibuja. Se llama al cambiar mes, precio o días.
export async function recalcularFacturacion() {
    const mes = document.getElementById('fact-mes').value; // 'YYYY-MM' o ''
    const precio = Number(document.getElementById('fact-precio').value) || 0;
    const dias = Number(document.getElementById('fact-dias').value) || 0;
    try { localStorage.setItem(LS_PRECIO, precio); localStorage.setItem(LS_DIAS, dias); } catch (e) { /* modo privado */ }

    const visitas = mes ? await obtenerVisitasDelMes(mes) : await obtenerTodasLasVisitas();
    const { ganados, enviosDia } = calcularGanados(visitas);

    const enviosPeriodo = enviosDia * dias;
    const facturacion = enviosPeriodo * precio;

    document.getElementById('fact-monto').textContent = fmtPesos(facturacion);
    document.getElementById('fact-periodo').textContent = mes ? `Mes ${mesBonito(mes)}` : 'Histórico completo';

    document.getElementById('fact-desglose').innerHTML = [
        { icono: '🏆', valor: fmtNum(ganados.length), etiqueta: 'Clientes ganados' },
        { icono: '📦', valor: fmtNum(enviosDia), etiqueta: 'Envíos/día ganados' },
        { icono: '📅', valor: fmtNum(dias), etiqueta: 'Días hábiles' },
        { icono: '🧾', valor: fmtNum(enviosPeriodo), etiqueta: 'Envíos en el período' },
        { icono: '💵', valor: fmtPesos(precio), etiqueta: 'Precio por envío' }
    ].map(t => `<div class="dash-num">
        <span class="dash-num-icono">${t.icono}</span>
        <span class="dash-num-valor">${t.valor}</span>
        <span class="dash-num-etiqueta">${t.etiqueta}</span>
    </div>`).join('');

    await renderHistoricoFacturacion(precio, dias);
}

// ------------------------------------------------------------
// Histórico mensual con filas desplegables
// ------------------------------------------------------------
let cacheVisitas = null;         // todas las visitas, para no repetir la consulta
const mesesAbiertos = new Set(); // meses actualmente desplegados (persiste entre renders)

async function renderHistoricoFacturacion(precio, dias) {
    const cont = document.getElementById('fact-historico');
    if (!cont) return;

    if (!cacheVisitas) cacheVisitas = await obtenerTodasLasVisitas();

    if (!cacheVisitas.length) {
        cont.innerHTML = '';
        return;
    }

    // Agrupamos las visitas por mes (YYYY-MM) según su fecha de carga.
    const porMes = new Map();
    for (const v of cacheVisitas) {
        const d = new Date(v.created_at);
        const mes = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        if (!porMes.has(mes)) porMes.set(mes, []);
        porMes.get(mes).push(v);
    }

    const meses = [...porMes.keys()].sort().reverse(); // más reciente primero

    cont.innerHTML = `
        <h3 style="margin:22px 0 12px;">Histórico mensual</h3>
        <div class="fact-tabla">
            ${meses.map(mes => filaFacturacionHTML(mes, porMes.get(mes), precio, dias)).join('')}
        </div>
    `;
}

function filaFacturacionHTML(mes, visitasDelMes, precio, dias) {
    const { ganados, enviosDia } = calcularGanados(visitasDelMes);
    const monto = enviosDia * dias * precio;
    const abierto = mesesAbiertos.has(mes);

    const detalle = !abierto ? '' : `
        <div class="fact-fila-detalle">
            ${ganados.length === 0
                ? `<p style="color:var(--texto-muted); font-size:0.8rem; padding:10px 4px;">Sin clientes ganados este mes.</p>`
                : ganados.map(v => `
                    <div class="fact-detalle-item">
                        <span class="fact-detalle-nombre">${v.nombre}</span>
                        <span class="fact-detalle-dato">${v.vendedor || '—'}</span>
                        <span class="fact-detalle-dato">${fmtNum(v.envios_diarios)} envíos/día</span>
                        <span class="fact-detalle-dato">${fmtPesos((Number(v.envios_diarios) || 0) * dias * precio)}</span>
                    </div>
                `).join('')
            }
        </div>
    `;

    return `
        <div class="fact-fila">
            <button class="fact-fila-header" onclick="toggleFilaFacturacion('${mes}')">
                <span class="fact-fila-mes">${mesBonito(mes)}</span>
                <span class="fact-fila-clientes">${fmtNum(ganados.length)} clientes</span>
                <span class="fact-fila-monto">${fmtPesos(monto)}</span>
                <span class="fact-fila-flecha">${abierto ? '▲' : '▼'}</span>
            </button>
            ${detalle}
        </div>
    `;
}

// Abre/cierra el detalle de un mes sin volver a consultar la base.
export function toggleFilaFacturacion(mes) {
    if (mesesAbiertos.has(mes)) mesesAbiertos.delete(mes);
    else mesesAbiertos.add(mes);
    const precio = Number(document.getElementById('fact-precio').value) || 0;
    const dias = Number(document.getElementById('fact-dias').value) || 0;
    renderHistoricoFacturacion(precio, dias);
}
