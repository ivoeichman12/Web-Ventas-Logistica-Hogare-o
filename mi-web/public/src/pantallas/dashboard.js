// ============================================================
// Pantalla: Dashboard / Resumen de estadísticas
// ============================================================
import { estado } from '../estado.js';
import { claseResultado, ETAPAS_PENDIENTE } from '../config/constantes.js';
import { obtenerVisitasEnRango } from '../services/visitas.js';

// Ícono de una etapa de negociación (para el tag en la tarjeta de visita)
function iconoEtapa(etapa) {
    return ETAPAS_PENDIENTE.find(e => e.valor === etapa)?.icono || '⏳';
}

// Cuenta ocurrencias agrupando por el valor que devuelve keyFn
function contarPor(items, keyFn) {
    const mapa = new Map();
    items.forEach(it => {
        const k = keyFn(it) || '—';
        mapa.set(k, (mapa.get(k) || 0) + 1);
    });
    return mapa;
}

// Empresas únicas: una sola entrada por empresa, su visita más reciente.
// 'visitas' viene ordenado por fecha descendente, así que el primero que
// vemos de cada empresa es su estado actual. Sirve para no contar dos veces
// al mismo cliente cuando lo visitamos varias veces (envíos, interés, etc.).
function empresasUnicas(visitas) {
    const porEmpresa = new Map();
    for (const v of visitas) if (!porEmpresa.has(v.nombre)) porEmpresa.set(v.nombre, v);
    return [...porEmpresa.values()];
}

// Un cliente "pendiente" es el que no está ni ganado (Cerrado) ni perdido:
// agrupa los estados Pendiente y A seguir (todo lo que sigue en el pipeline).
function esPendiente(v) {
    return v.resultado !== 'Cerrado' && v.resultado !== 'Perdido';
}

// Escapa comillas para insertar un texto dentro de un onclick="fn('...')"
function escaparJS(s) {
    return String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

// Dibuja una lista de barras horizontales en el contenedor indicado.
// entradas: [{ label, count, cls }]
// alTocar (opcional): nombre de una función global; si se pasa, cada barra
// con datos se vuelve clickeable y llama a esa función con el label.
function renderBarras(contenedorId, entradas, alTocar) {
    const cont = document.getElementById(contenedorId);
    const max = Math.max(1, ...entradas.map(e => e.count));
    if (entradas.length === 0) {
        cont.innerHTML = '<p class="estado-vacio" style="padding:16px;">Sin datos.</p>';
        return;
    }
    // Suma total del panel, visible sin tener que clickear (arriba a la derecha)
    const total = entradas.reduce((s, e) => s + e.count, 0);
    const cabecera = `<div class="dash-barras-total">Total: ${total}</div>`;
    cont.innerHTML = cabecera + entradas.map(e => {
        const clickeable = alTocar && e.count > 0;
        const apertura = clickeable
            ? `<div class="dash-barra dash-barra-click" onclick="${alTocar}('${escaparJS(e.label)}')">`
            : '<div class="dash-barra">';
        const verMas = clickeable ? ' <span class="dash-ver">ver ›</span>' : '';
        return `${apertura}
            <div class="dash-barra-top"><span>${e.label}${verMas}</span><span>${e.count}</span></div>
            <div class="dash-barra-track"><div class="dash-barra-fill ${e.cls || ''}" style="width:${Math.round(e.count / max * 100)}%"></div></div>
        </div>`;
    }).join('');
}

// --- Helpers de fechas para el filtro por rango ---

// Fecha -> 'YYYY-MM-DD' en horario local (no UTC, para no correr un día)
function fechaISO(d) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
// 'YYYY-MM-DD' -> 'DD/MM/YYYY'
function fechaBonita(iso) {
    const [y, m, d] = iso.split('-');
    return `${d}/${m}/${y}`;
}
// Texto del período según el rango elegido
function rotularPeriodo(desde, hasta) {
    if (!desde && !hasta) return 'Histórico completo';
    if (desde && hasta) return desde === hasta ? fechaBonita(desde) : `${fechaBonita(desde)} – ${fechaBonita(hasta)}`;
    return desde ? `Desde ${fechaBonita(desde)}` : `Hasta ${fechaBonita(hasta)}`;
}

// Botón "Este mes": rango del 1ro del mes actual hasta hoy
export function dashEsteMes() {
    const hoy = new Date();
    document.getElementById('dash-desde').value = fechaISO(new Date(hoy.getFullYear(), hoy.getMonth(), 1));
    document.getElementById('dash-hasta').value = fechaISO(hoy);
    cargarDashboard();
}
// Botón "Histórico": limpia el rango
export function dashHistorico() {
    document.getElementById('dash-desde').value = '';
    document.getElementById('dash-hasta').value = '';
    cargarDashboard();
}

// --- Helpers para los filtros de vendedor de cada panel ---

// Vendedor elegido en un <select> ('Todos' si no hay)
function vendDe(selectId) {
    return document.getElementById(selectId)?.value || 'Todos';
}

// Visitas del período filtradas por el vendedor de un <select>
function visitasPorVend(selectId) {
    const vend = vendDe(selectId);
    return vend === 'Todos'
        ? estado.todasLasVisitas
        : estado.todasLasVisitas.filter(v => (v.vendedor || '') === vend);
}

// Llena un <select> de vendedores con los presentes en las visitas,
// preservando la selección actual si sigue existiendo.
function poblarSelectVendedores(selectId, visitas) {
    const sel = document.getElementById(selectId);
    const previa = sel.value || 'Todos';
    const vendedores = [...new Set(visitas.map(v => v.vendedor).filter(Boolean))].sort();
    sel.innerHTML = '<option value="Todos">Todos los vendedores</option>' +
        vendedores.map(x => `<option value="${x}">${x}</option>`).join('');
    sel.value = [...sel.options].some(o => o.value === previa) ? previa : 'Todos';
}

// Dibuja una fila de tarjetas de números. Cada tarjeta puede ser clickeable
// si trae `alTocar` (código a ejecutar en el onclick).
function renderTarjetas(contenedorId, tarjetas) {
    document.getElementById(contenedorId).innerHTML = tarjetas.map(t => {
        const clickeable = t.alTocar ? ` dash-num-click" onclick="${t.alTocar}` : '';
        const ver = t.alTocar ? ' <span class="dash-ver">ver ›</span>' : '';
        // Línea chica opcional (ej. promedio) debajo de la etiqueta
        const sub = t.sub ? `<span class="dash-num-sub">${t.sub}</span>` : '';
        return `<div class="dash-num${clickeable}">
            <span class="dash-num-icono">${t.icono}</span>
            <span class="dash-num-valor">${t.valor}</span>
            <span class="dash-num-etiqueta">${t.etiqueta}${ver}</span>
            ${sub}
        </div>`;
    }).join('');
}

// Carga y dibuja todo el dashboard. Todas las métricas salen de
// las visitas registradas (reflejan la actividad real del equipo).
export async function cargarDashboard() {
    // Filtro por rango de fechas (Desde – Hasta). Vacío = histórico completo.
    // Todas las métricas y el drill-down se calculan sobre el rango elegido.
    const desde = document.getElementById('dash-desde')?.value || '';
    const hasta = document.getElementById('dash-hasta')?.value || '';
    const visitas = await obtenerVisitasEnRango(desde, hasta);
    estado.todasLasVisitas = visitas; // guardamos para el drill-down

    // Mostrar el período que se está viendo
    const rotulo = document.getElementById('dash-periodo');
    if (rotulo) rotulo.textContent = rotularPeriodo(desde, hasta);

    // Empresa única (su visita más reciente = su estado actual). Se reusa
    // para los números y para los envíos.
    const empresasU = empresasUnicas(visitas);

    // --- Tarjetas de números clave ---
    const empresasVisitadas = new Set(visitas.map(v => v.nombre)).size;
    const clientesCerrados = new Set(visitas.filter(v => v.resultado === 'Cerrado').map(v => v.nombre)).size;
    // Perdidos y pendientes por estado actual (su visita más reciente).
    // Pendientes agrupa Pendiente + A seguir (ver esPendiente).
    const clientesPerdidos = empresasU.filter(v => v.resultado === 'Perdido').length;
    const clientesPendientes = empresasU.filter(esPendiente).length;
    // % sobre las empresas visitadas (ganados/perdidos/pendientes lo parten
    // en 3, así que sus porcentajes suman ~100%). Conversión = % de ganados.
    const pctDe = n => empresasVisitadas > 0 ? Math.round(n / empresasVisitadas * 100) : 0;
    const conversion = pctDe(clientesCerrados);
    renderTarjetas('dash-numeros', [
        { etiqueta: 'Visitas totales', valor: visitas.length, icono: '📝' },
        { etiqueta: 'Empresas visitadas', valor: empresasVisitadas, icono: '🏢' },
        { etiqueta: 'Clientes ganados', valor: clientesCerrados, icono: '🏆', alTocar: 'verClientesCerrados()' },
        { etiqueta: 'Conversión', valor: conversion + '%', icono: '📈', alTocar: 'verDesglosePorVendedor()' },
        { etiqueta: 'Clientes perdidos', valor: `${clientesPerdidos} <span class="dash-num-porc">${pctDe(clientesPerdidos)}%</span>`, icono: '💔', alTocar: 'verClientesPerdidos()' },
        { etiqueta: 'Clientes pendientes', valor: `${clientesPendientes} <span class="dash-num-porc">${pctDe(clientesPendientes)}%</span>`, icono: '⏳', alTocar: 'verClientesPendientes()' }
    ]);

    // --- Envíos diarios (por empresa única: se usa su visita más reciente) ---
    const env = v => Number(v.envios_diarios) || 0;
    // Promedio de envíos por empresa del grupo (solo las que tienen envíos
    // cargados, para que un 0 sin dato no baje el promedio artificialmente).
    const promedio = arr => {
        const con = arr.filter(v => env(v) > 0);
        return con.length ? Math.round(con.reduce((s, v) => s + env(v), 0) / con.length) : 0;
    };
    // "En negociación": interesados o a seguir, PERO sin los ya cerrados
    // (esos salen del pipeline; se cuentan aparte en "Clientes cerrados").
    const grNegociacion = empresasU.filter(v => v.resultado !== 'Cerrado' && (v.interes === 'Si' || v.resultado === 'A seguir'));
    const grCerrado = empresasU.filter(v => v.resultado === 'Cerrado');
    const grPerdido = empresasU.filter(v => v.resultado === 'Perdido');
    const sumaEnv = arr => arr.reduce((s, v) => s + env(v), 0);
    renderTarjetas('dash-envios', [
        { etiqueta: 'Total del período', valor: sumaEnv(empresasU), sub: `${promedio(empresasU)}/día por cliente`, icono: '📦', alTocar: "verEnviosDe('todos')" },
        { etiqueta: 'Interesados / A seguir', valor: sumaEnv(grNegociacion), sub: `${promedio(grNegociacion)}/día por cliente`, icono: '🔥', alTocar: "verEnviosDe('interes')" },
        { etiqueta: 'Clientes cerrados', valor: sumaEnv(grCerrado), sub: `${promedio(grCerrado)}/día por cliente`, icono: '🤝', alTocar: "verEnviosDe('cerrado')" },
        { etiqueta: 'Perdidos', valor: sumaEnv(grPerdido), sub: `${promedio(grPerdido)}/día por cliente`, icono: '💔', alTocar: "verEnviosDe('perdido')" }
    ]);

    // --- Visitas por vendedor (clickeable) ---
    const porVendedor = [...contarPor(visitas, v => v.vendedor)].sort((a, b) => b[1] - a[1]);
    renderBarras('dash-vendedores', porVendedor.map(([label, count]) => ({ label, count })), 'verVisitasPorVendedor');

    // --- Paneles con filtro por vendedor (poblar select + render) ---
    poblarSelectVendedores('dash-interes-vendedor', visitas);
    renderInteresDashboard();

    poblarSelectVendedores('dash-resultado-vendedor', visitas);
    renderResultadoDashboard();

    poblarSelectVendedores('dash-zona-vendedor', visitas);
    renderZonaDashboard();

    // --- Motivos de pérdida (solo visitas marcadas como Perdido) ---
    const perdidas = visitas.filter(v => v.resultado === 'Perdido');
    const porMotivo = [...contarPor(perdidas, v => v.motivo_perdida)].sort((a, b) => b[1] - a[1]);
    renderBarras('dash-motivos', porMotivo.map(([label, count]) => ({ label, count, cls: 'fill-no' })), 'verVisitasPorMotivo');

    // --- Pendientes: desglose por etapa (por empresa única) ---
    // Orden del embudo (ETAPAS_PENDIENTE); los sin etapa ("—", pendientes
    // viejos previos a esta función) quedan al final.
    const pendientes = empresasU.filter(esPendiente);
    const ordenEtapa = e => { const i = ETAPAS_PENDIENTE.findIndex(x => x.valor === e); return i === -1 ? 99 : i; };
    const porEtapa = [...contarPor(pendientes, v => v.etapa_pendiente)]
        .sort((a, b) => ordenEtapa(a[0]) - ordenEtapa(b[0]));
    renderBarras('dash-pendientes', porEtapa.map(([label, count]) => ({ label, count })), 'verPendientesPorEtapa');

    // --- Visitas por horario de corte (clickeable) ---
    const porCorte = [...contarPor(visitas, v => v.horario_corte)].sort((a, b) => a[0].localeCompare(b[0]));
    renderBarras('dash-corte', porCorte.map(([label, count]) => ({ label, count })), 'verVisitasPorCorte');
}

// Resumen de todas las métricas del período actual (usa estado.todasLasVisitas,
// que ya dejó cargado cargarDashboard). Fuente única de números para la
// presentación descargable (presentacion.js).
export function metricasPeriodo() {
    const visitas = estado.todasLasVisitas || [];
    const empresasU = empresasUnicas(visitas);
    const empresasVisitadas = new Set(visitas.map(v => v.nombre)).size;
    const ganados = new Set(visitas.filter(v => v.resultado === 'Cerrado').map(v => v.nombre)).size;
    const perdidos = empresasU.filter(v => v.resultado === 'Perdido').length;
    const pendientes = empresasU.filter(esPendiente).length;
    const pct = n => empresasVisitadas > 0 ? Math.round(n / empresasVisitadas * 100) : 0;

    const env = v => Number(v.envios_diarios) || 0;
    const suma = arr => arr.reduce((s, v) => s + env(v), 0);
    const prom = arr => { const c = arr.filter(v => env(v) > 0); return c.length ? Math.round(suma(c) / c.length) : 0; };
    const gNeg = empresasU.filter(v => v.resultado !== 'Cerrado' && (v.interes === 'Si' || v.resultado === 'A seguir'));
    const gCer = empresasU.filter(v => v.resultado === 'Cerrado');
    const gPer = empresasU.filter(v => v.resultado === 'Perdido');

    const interes = contarPor(empresasU.filter(v => v.resultado !== 'Cerrado'), v => v.interes);

    // Rendimiento por vendedor (visitas + resultado + conversión)
    const vendedores = [...new Set(visitas.map(v => v.vendedor).filter(Boolean))].sort();
    const porVendedor = vendedores.map(vend => {
        const vs = visitas.filter(v => v.vendedor === vend);
        const empU = empresasUnicas(vs);
        const emp = new Set(vs.map(v => v.nombre)).size;
        const gan = new Set(vs.filter(v => v.resultado === 'Cerrado').map(v => v.nombre)).size;
        return {
            vendedor: vend, visitas: vs.length, empresas: emp,
            ganados: gan, perdidos: empU.filter(v => v.resultado === 'Perdido').length,
            pendientes: empU.filter(esPendiente).length,
            conversion: emp ? Math.round(gan / emp * 100) : 0
        };
    }).sort((a, b) => b.ganados - a.ganados || b.conversion - a.conversion);

    // Top clientes por volumen de envíos/día
    const porEnvios = (arr, n) => arr.slice()
        .sort((a, b) => (Number(b.envios_diarios) || 0) - (Number(a.envios_diarios) || 0))
        .slice(0, n)
        .map(v => ({ nombre: v.nombre, zona: v.zona || 'Sin zona', envios: Number(v.envios_diarios) || 0, vendedor: v.vendedor || 'Sin asignar', etapa: v.etapa_pendiente || null }));
    const topGanados = porEnvios(gCer, 2);
    const topInteresados = porEnvios(empresasU.filter(v => esPendiente(v) && v.interes === 'Si'), 2);

    const desde = document.getElementById('dash-desde')?.value || '';
    const hasta = document.getElementById('dash-hasta')?.value || '';

    return {
        periodo: rotularPeriodo(desde, hasta),
        visitasTotal: visitas.length,
        empresasVisitadas,
        ganados, conversion: pct(ganados),
        perdidos, pctPerdidos: pct(perdidos),
        pendientes, pctPendientes: pct(pendientes),
        envios: {
            total: suma(empresasU), promTotal: prom(empresasU),
            negociacion: suma(gNeg), promNegociacion: prom(gNeg),
            ganado: suma(gCer), promGanado: prom(gCer),
            perdido: suma(gPer), promPerdido: prom(gPer)
        },
        resultado: { ganados, perdidos, pendientes },
        interes: { si: interes.get('Si') || 0, neutro: interes.get('Neutro') || 0, no: interes.get('No') || 0 },
        porVendedor,
        topGanados,
        topInteresados,
        zonas: statsPorZona(visitas),
        motivos: [...contarPor(visitas.filter(v => v.resultado === 'Perdido'), v => v.motivo_perdida)].sort((a, b) => b[1] - a[1]),
        etapas: [...contarPor(empresasU.filter(esPendiente), v => v.etapa_pendiente)]
    };
}

// Muestra una lista de visitas en el modal de detalle (drill-down genérico).
// Cada tarjeta abre el detalle completo de la visita (reusa el modal de visita).
function mostrarListaVisitas(titulo, visitas) {
    const ordenadas = [...visitas].sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
    document.getElementById('det-zona-titulo').innerText = titulo;
    document.getElementById('det-zona-sub').innerText = `${ordenadas.length} visita(s)`;
    document.getElementById('det-zona-filtro').style.display = 'none'; // esta vista no usa filtro

    document.getElementById('det-zona-lista').innerHTML = ordenadas.map(tarjetaVisita).join('');
    document.getElementById('modal-zona').style.display = 'block';
}

// HTML de una tarjeta de visita (se reusa en todos los drill-downs)
function tarjetaVisita(v) {
    const claseInteres = v.interes === 'Si' ? 'tag-si' : (v.interes === 'No' ? 'tag-no' : 'tag-neutro');
    const fecha = v.created_at ? new Date(v.created_at).toLocaleDateString('es-AR') : '';
    const corte = v.horario_corte ? `<span class="tag-v">⏰ ${v.horario_corte}</span>` : '';
    const envios = (v.envios_diarios != null && v.envios_diarios !== '') ? `<span class="tag-v">📦 ${v.envios_diarios}/día</span>` : '';
    const cotiz = v.cotizado ? `<span class="tag-v">🧾 Cotizado</span>` : '';
    const etapa = esPendiente(v) && v.etapa_pendiente ? `<span class="tag-v">${iconoEtapa(v.etapa_pendiente)} ${v.etapa_pendiente}</span>` : '';
    const res = v.resultado && v.resultado !== 'Pendiente'
        ? `<span class="badge-estado ${claseResultado(v.resultado)}">${v.resultado}</span>` : '';
    const motivo = v.resultado === 'Perdido' && v.motivo_perdida
        ? `<div style="font-size:0.72rem; color:var(--error); margin-top:5px; font-weight:600;">💔 ${v.motivo_perdida}</div>` : '';
    return `<div class="visita-card" onclick="verDetalleVisita('${v.id}')">
        <span class="vendedor-tag">${(v.vendedor || '').toUpperCase()}</span>
        <strong>${v.nombre}</strong> ${res}<br>
        <span class="tag-v ${claseInteres}">${v.interes || '-'}</span><span class="tag-v tag-zona">${v.zona || 's/zona'}</span>${corte}${envios}${cotiz}${etapa}
        ${motivo}
        <div style="font-size:0.7rem; color:var(--texto-muted); margin-top:6px;">${fecha}</div>
    </div>`;
}

// HTML del <select> de vendedores para el filtro dentro del modal
function selectFiltroVendedores(vendedores, elegido, llamada) {
    return `<select onchange="${llamada}" style="width:auto; margin:0; padding:7px 10px; font-size:0.8rem;">
        <option value="Todos"${elegido === 'Todos' ? ' selected' : ''}>Todos los vendedores</option>
        ${vendedores.map(x => `<option value="${x}"${elegido === x ? ' selected' : ''}>${x}</option>`).join('')}
    </select>`;
}

// Sufijo " · Vendedor" para los títulos del drill-down cuando hay filtro
function sufijoVend(vend) {
    return vend === 'Todos' ? '' : ` · ${vend}`;
}

// ---- Panel: Interés en las visitas (filtro por vendedor) ----
export function renderInteresDashboard() {
    const porInteres = contarPor(empresasUnicas(visitasPorVend('dash-interes-vendedor')).filter(v => v.resultado !== 'Cerrado'), v => v.interes);
    renderBarras('dash-interes', [
        { label: 'Sí', count: porInteres.get('Si') || 0, cls: 'fill-si' },
        { label: 'Neutro', count: porInteres.get('Neutro') || 0, cls: 'fill-neutro' },
        { label: 'No', count: porInteres.get('No') || 0, cls: 'fill-no' }
    ], 'verVisitasPorInteres');
}
export function verVisitasPorInteres(interesLabel) {
    const valor = interesLabel === 'Sí' ? 'Si' : interesLabel; // el panel muestra 'Sí', la base guarda 'Si'
    const vend = vendDe('dash-interes-vendedor');
    // Por empresa única y sin cerrados, para que coincida con el número de la barra.
    let visitas = empresasUnicas(visitasPorVend('dash-interes-vendedor'))
        .filter(v => (v.interes || '') === valor && v.resultado !== 'Cerrado');
    mostrarListaVisitas(`Interés: ${interesLabel}${sufijoVend(vend)}`, visitas);
}

// ---- Panel: Resultado de las visitas (filtro por vendedor) ----
// Se agrupa en 3: Ganados (Cerrado), Perdidos (Perdido) y Pendientes
// (Pendiente + A seguir juntos). Por empresa única / estado actual, así los
// tres suman las Empresas visitadas y coinciden con las tarjetas de arriba.
export function renderResultadoDashboard() {
    const emp = empresasUnicas(visitasPorVend('dash-resultado-vendedor'));
    const ganados = emp.filter(v => v.resultado === 'Cerrado').length;
    const perdidos = emp.filter(v => v.resultado === 'Perdido').length;
    const pendientes = emp.filter(esPendiente).length;
    renderBarras('dash-resultados', [
        { label: 'Ganados', count: ganados, cls: 'fill-resultado-cerrado' },
        { label: 'Perdidos', count: perdidos, cls: 'fill-resultado-perdido' },
        { label: 'Pendientes', count: pendientes, cls: 'fill-resultado-pendiente' }
    ], 'verVisitasPorResultado');
}
export function verVisitasPorResultado(grupo) {
    const vend = vendDe('dash-resultado-vendedor');
    const emp = empresasUnicas(visitasPorVend('dash-resultado-vendedor'));
    let lista, titulo;
    if (grupo === 'Ganados') { lista = emp.filter(v => v.resultado === 'Cerrado'); titulo = '🏆 Ganados'; }
    else if (grupo === 'Perdidos') { lista = emp.filter(v => v.resultado === 'Perdido'); titulo = '💔 Perdidos'; }
    else { lista = emp.filter(esPendiente); titulo = '⏳ Pendientes'; }
    mostrarListaVisitas(`${titulo}${sufijoVend(vend)}`, lista);
}

// ---- Panel: Visitas por zona (filtro por vendedor) ----
// Estadísticas por zona: por empresa única (estado actual). Devuelve, por
// zona, cuántas empresas hay y cuántas cerradas/perdidas/neutras.
function statsPorZona(visitas) {
    const mapa = new Map();
    for (const v of empresasUnicas(visitas)) {
        const z = v.zona || '—';
        if (!mapa.has(z)) mapa.set(z, { zona: z, total: 0, cerrados: 0, perdidos: 0, neutros: 0 });
        const s = mapa.get(z);
        s.total++;
        if (v.resultado === 'Cerrado') s.cerrados++;
        else if (v.resultado === 'Perdido') s.perdidos++;
        if (v.interes === 'Neutro' && v.resultado !== 'Cerrado') s.neutros++;
    }
    return [...mapa.values()].sort((a, b) => b.total - a.total);
}
export function renderZonaDashboard() {
    const zonas = statsPorZona(visitasPorVend('dash-zona-vendedor'));
    const cont = document.getElementById('dash-zonas');
    if (zonas.length === 0) {
        cont.innerHTML = '<p class="estado-vacio" style="padding:16px;">Sin datos.</p>';
        return;
    }
    const max = Math.max(1, ...zonas.map(z => z.total));
    const totalGeneral = zonas.reduce((s, z) => s + z.total, 0);
    // La barra mide el volumen (largo = total de la zona) y la parte cerrada
    // se pinta en verde, así se ve de un vistazo en qué zonas cerramos.
    cont.innerHTML = `<div class="dash-barras-total">Total: ${totalGeneral}</div>` + zonas.map(z => {
        const anchoBarra = Math.round(z.total / max * 100);
        const pctCerr = z.total ? Math.round(z.cerrados / z.total * 100) : 0;
        const verdeInterno = z.total ? Math.round(z.cerrados / z.total * 100) : 0;
        return `<div class="dash-barra dash-barra-click" onclick="verVisitasDeZona('${escaparJS(z.zona)}')">
            <div class="dash-barra-top">
                <span>${z.zona} <span class="dash-ver">ver ›</span></span>
                <span>${z.total}</span>
            </div>
            <div class="dash-barra-track">
                <div class="dash-barra-fill dash-zona-fill" style="width:${anchoBarra}%">
                    <div class="dash-zona-cerr" style="width:${verdeInterno}%"></div>
                </div>
            </div>
            <div class="dash-zona-sub"><span class="dot-cerr"></span>${z.cerrados} cerrado(s) · ${pctCerr}% conversión</div>
        </div>`;
    }).join('');
}
// Drill-down de zona: en vez de la lista de clientes, muestra los porcentajes
// de conversión, pérdida y neutro de la zona.
export function verVisitasDeZona(zona) {
    const vend = vendDe('dash-zona-vendedor');
    const empresas = empresasUnicas(visitasPorVend('dash-zona-vendedor')).filter(v => (v.zona || '—') === zona);
    const total = empresas.length;
    const cerrados = empresas.filter(v => v.resultado === 'Cerrado').length;
    const perdidos = empresas.filter(v => v.resultado === 'Perdido').length;
    const neutros = empresas.filter(v => v.interes === 'Neutro' && v.resultado !== 'Cerrado').length;
    const pct = n => total ? Math.round(n / total * 100) : 0;
    const base = zona === '—' ? '📍 Sin zona' : `📍 ${zona}`;

    document.getElementById('det-zona-titulo').innerText = `${base}${sufijoVend(vend)}`;
    document.getElementById('det-zona-sub').innerText = `${total} empresa(s) en la zona`;
    document.getElementById('det-zona-filtro').style.display = 'none';
    document.getElementById('det-zona-lista').innerHTML = total === 0
        ? '<p class="estado-vacio">Sin empresas en esta zona.</p>'
        : `<div class="visita-card" style="cursor:default;">
            <div class="desglose-grid">
                <div><span class="desglose-num" style="color:#22c55e;">${pct(cerrados)}%</span><span class="desglose-lbl">Conversión (${cerrados})</span></div>
                <div><span class="desglose-num" style="color:#ef4444;">${pct(perdidos)}%</span><span class="desglose-lbl">Pérdida (${perdidos})</span></div>
                <div><span class="desglose-num" style="color:#f59e0b;">${pct(neutros)}%</span><span class="desglose-lbl">Neutro (${neutros})</span></div>
            </div>
        </div>`;
    document.getElementById('modal-zona').style.display = 'block';
}

// Drill-down por vendedor (panel "Visitas por vendedor", sin filtro propio)
export function verVisitasPorVendedor(vendedor) {
    const visitas = estado.todasLasVisitas.filter(v => (v.vendedor || '—') === vendedor);
    mostrarListaVisitas(`👤 ${vendedor}`, visitas);
}

// Lista de clientes cerrados (al tocar la tarjeta "Clientes cerrados"):
// muestra el nombre de cada cliente y qué vendedor lo cerró, con filtro
// por vendedor. Respeta el rango de fechas actual.
export function verClientesCerrados(vendedorFiltro = 'Todos') {
    // Una empresa puede tener varias visitas cerradas: nos quedamos con la
    // más reciente (la lista ya viene ordenada por fecha descendente).
    const vistos = new Set();
    const cerrados = estado.todasLasVisitas
        .filter(v => v.resultado === 'Cerrado')
        .filter(v => {
            if (vistos.has(v.nombre)) return false;
            vistos.add(v.nombre);
            return true;
        });

    const vendedores = [...new Set(cerrados.map(c => c.vendedor).filter(Boolean))].sort();
    const lista = vendedorFiltro === 'Todos'
        ? cerrados
        : cerrados.filter(c => (c.vendedor || '') === vendedorFiltro);

    document.getElementById('det-zona-titulo').innerText = '🤝 Clientes cerrados';
    document.getElementById('det-zona-sub').innerText = `${lista.length} cliente(s)`;

    // Filtro por vendedor dentro del panel
    const filtro = document.getElementById('det-zona-filtro');
    filtro.style.display = 'block';
    filtro.innerHTML = selectFiltroVendedores(vendedores, vendedorFiltro, 'verClientesCerrados(this.value)');

    document.getElementById('det-zona-lista').innerHTML = lista.length === 0
        ? '<p class="estado-vacio">Sin clientes cerrados en el período.</p>'
        : lista.map(c => {
            const fecha = c.created_at ? new Date(c.created_at).toLocaleDateString('es-AR') : '';
            return `<div class="visita-card" onclick="verDetalleVisita('${c.id}')">
                <span class="vendedor-tag">${(c.vendedor || '-').toUpperCase()}</span>
                <strong>${c.nombre}</strong> <span class="badge-estado resultado-cerrado">Cerrado</span><br>
                <span class="tag-v tag-zona">${c.zona || 's/zona'}</span>
                <div style="font-size:0.7rem; color:var(--texto-muted); margin-top:6px;">Visita del ${fecha}</div>
            </div>`;
        }).join('');

    document.getElementById('modal-zona').style.display = 'block';
}

// Lista de clientes perdidos (al tocar la tarjeta "Clientes perdidos"):
// empresas cuyo estado actual (visita más reciente) quedó en Perdido.
export function verClientesPerdidos() {
    const perdidos = empresasUnicas(estado.todasLasVisitas).filter(v => v.resultado === 'Perdido');
    mostrarListaVisitas('💔 Clientes perdidos', perdidos);
}

// Lista de clientes pendientes (Pendiente + A seguir), por empresa única.
export function verClientesPendientes() {
    const pend = empresasUnicas(estado.todasLasVisitas).filter(esPendiente);
    mostrarListaVisitas('⏳ Clientes pendientes', pend);
}

// Drill-down de la tabla de Pendientes: por etapa de negociación.
export function verPendientesPorEtapa(etapa) {
    const lista = empresasUnicas(estado.todasLasVisitas)
        .filter(v => esPendiente(v) && (v.etapa_pendiente || '—') === etapa);
    const titulo = etapa === '—' ? '⏳ Pendientes sin etapa' : `${iconoEtapa(etapa)} ${etapa}`;
    mostrarListaVisitas(titulo, lista);
}

// Lista de visitas interesadas / no interesadas (al tocar las tarjetas
// "Interesados", "Neutros" o "No interesados"), con filtro por vendedor.
export function verVisitasInteresados(interes, vendedorFiltro = 'Todos') {
    // Por empresa única: un cliente visitado varias veces aparece una sola vez.
    const todas = empresasUnicas(estado.todasLasVisitas).filter(v => (v.interes || '') === interes && v.resultado !== 'Cerrado');
    const vendedores = [...new Set(todas.map(v => v.vendedor).filter(Boolean))].sort();
    const lista = vendedorFiltro === 'Todos'
        ? todas
        : todas.filter(v => (v.vendedor || '') === vendedorFiltro);

    const titulos = { Si: '✅ Interesados', Neutro: '😐 Neutros', No: '🚫 No interesados' };
    document.getElementById('det-zona-titulo').innerText = titulos[interes] || 'Interés';
    document.getElementById('det-zona-sub').innerText = `${lista.length} cliente(s)`;

    const filtro = document.getElementById('det-zona-filtro');
    filtro.style.display = 'block';
    filtro.innerHTML = selectFiltroVendedores(vendedores, vendedorFiltro, `verVisitasInteresados('${interes}', this.value)`);

    document.getElementById('det-zona-lista').innerHTML = lista.length === 0
        ? '<p class="estado-vacio">Sin visitas en el período.</p>'
        : lista.map(tarjetaVisita).join('');

    document.getElementById('modal-zona').style.display = 'block';
}

// Desglose de conversión por vendedor (al tocar la tarjeta "Conversión").
// Respeta el rango de fechas actual.
export function verDesglosePorVendedor() {
    const vendedores = [...new Set(estado.todasLasVisitas.map(v => v.vendedor).filter(Boolean))].sort();
    const filas = vendedores.map(vend => {
        const vs = estado.todasLasVisitas.filter(v => v.vendedor === vend);
        const visitadas = new Set(vs.map(v => v.nombre)).size;
        const cerradas = new Set(vs.filter(v => v.resultado === 'Cerrado').map(v => v.nombre)).size;
        const conv = visitadas > 0 ? Math.round(cerradas / visitadas * 100) : 0;
        return { vend, visitadas, cerradas, conv };
    }).sort((a, b) => b.cerradas - a.cerradas || b.conv - a.conv);

    document.getElementById('det-zona-titulo').innerText = '📈 Conversión por vendedor';
    document.getElementById('det-zona-sub').innerText = 'Empresas visitadas, cerradas y conversión';
    document.getElementById('det-zona-filtro').style.display = 'none'; // ya está desglosado por vendedor
    document.getElementById('det-zona-lista').innerHTML = filas.length === 0
        ? '<p class="estado-vacio">Sin datos en el período.</p>'
        : filas.map(f => `<div class="visita-card" style="cursor:default;">
            <span class="vendedor-tag">${f.vend.toUpperCase()}</span>
            <div class="desglose-grid">
                <div><span class="desglose-num">${f.visitadas}</span><span class="desglose-lbl">Visitadas</span></div>
                <div><span class="desglose-num">${f.cerradas}</span><span class="desglose-lbl">Cerradas</span></div>
                <div><span class="desglose-num" style="color:var(--brand);">${f.conv}%</span><span class="desglose-lbl">Conversión</span></div>
            </div>
        </div>`).join('');

    document.getElementById('modal-zona').style.display = 'block';
}

// Drill-down de envíos diarios: lista las empresas (por empresa única, su
// visita más reciente) con su número de envíos, ordenadas de mayor a menor.
export function verEnviosDe(tipo) {
    let empresas = empresasUnicas(estado.todasLasVisitas);
    let titulo = '📦 Envíos diarios · Total';

    if (tipo === 'interes') {
        empresas = empresas.filter(v => v.resultado !== 'Cerrado' && (v.interes === 'Si' || v.resultado === 'A seguir'));
        titulo = '🔥 Envíos · Interesados / A seguir';
    } else if (tipo === 'cerrado') {
        empresas = empresas.filter(v => v.resultado === 'Cerrado');
        titulo = '🤝 Envíos · Clientes cerrados';
    } else if (tipo === 'perdido') {
        empresas = empresas.filter(v => v.resultado === 'Perdido');
        titulo = '💔 Envíos · Perdidos';
    }

    empresas = empresas
        .filter(v => Number(v.envios_diarios) > 0)
        .sort((a, b) => (Number(b.envios_diarios) || 0) - (Number(a.envios_diarios) || 0));
    const total = empresas.reduce((s, v) => s + (Number(v.envios_diarios) || 0), 0);

    document.getElementById('det-zona-titulo').innerText = titulo;
    document.getElementById('det-zona-sub').innerText = `${empresas.length} empresa(s) · ${total} envíos/día en total`;
    document.getElementById('det-zona-filtro').style.display = 'none';
    document.getElementById('det-zona-lista').innerHTML = empresas.length === 0
        ? '<p class="estado-vacio">Ninguna empresa de este grupo tiene envíos cargados.</p>'
        : empresas.map(tarjetaVisita).join('');
    document.getElementById('modal-zona').style.display = 'block';
}

// Drill-down por motivo de pérdida
export function verVisitasPorMotivo(motivo) {
    const visitas = estado.todasLasVisitas
        .filter(v => v.resultado === 'Perdido' && (v.motivo_perdida || '—') === motivo);
    mostrarListaVisitas(`💔 Perdidos: ${motivo}`, visitas);
}

// Drill-down por horario de corte
export function verVisitasPorCorte(corte) {
    const visitas = estado.todasLasVisitas.filter(v => (v.horario_corte || '—') === corte);
    mostrarListaVisitas(corte === '—' ? '⏰ Sin horario' : `⏰ ${corte}`, visitas);
}

export function cerrarModalZona() {
    document.getElementById('modal-zona').style.display = 'none';
}
