// ============================================================
// Pantalla: Presentación descargable (.pptx)
// ------------------------------------------------------------
// Genera una presentación de PowerPoint profesional y completa
// con TODOS los números del período que muestra el Panel de
// Control. Pensada para que alguien que la ve por primera vez la
// entienda: cada slide tiene un subtítulo que explica qué mira.
// La librería (PptxGenJS) se carga on-demand la primera vez.
// ============================================================
import { metricasPeriodo } from './dashboard.js';
import { conEstadoDeCarga } from '../utils.js';
import { toastExito, toastError } from '../components/toast.js';

// Paleta oscura ejecutiva (hex sin '#', como los quiere PptxGenJS)
const FONDO = '0B1220', PANEL = '151E33';
const AZUL = '3B82F6', AZUL_OSCURO = '1E3A8A', ROJO = 'F87171', VERDE = '34D399', AMBAR = 'FBBF24';
const GRIS = '94A3B8', TEXTO = 'E2E8F0', SUAVE = PANEL, BLANCO = 'FFFFFF', LINEA = '2B3A55', CELESTE = '93C5FD';
const PISTA = '223049'; // fondo de las barras horizontales

const DIAS_TRABAJADOS = 24; // días trabajados del mes para la facturación estimada

const fmtPesos = n => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n || 0);
const fmtNum = n => new Intl.NumberFormat('es-AR').format(Math.round(n || 0));

// Carga la librería PptxGenJS una sola vez (script global window.PptxGenJS)
let cargaLib = null;
function cargarPptxLib() {
    if (window.PptxGenJS) return Promise.resolve();
    if (cargaLib) return cargaLib;
    cargaLib = new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = 'https://cdn.jsdelivr.net/npm/pptxgenjs@3.12.0/dist/pptxgen.bundle.js';
        s.onload = () => resolve();
        s.onerror = () => { cargaLib = null; reject(new Error('No se pudo cargar la librería de presentación.')); };
        document.head.appendChild(s);
    });
    return cargaLib;
}

// Logo como dataURL (PptxGenJS lo necesita embebido). Si no carga, se sigue sin él.
let logoData = null, logoPedido = false;
async function cargarLogo() {
    if (logoPedido) return logoData;
    logoPedido = true;
    try {
        const blob = await (await fetch('/Logo-trim.png')).blob();
        logoData = await new Promise(res => { const fr = new FileReader(); fr.onload = () => res(fr.result); fr.readAsDataURL(blob); });
    } catch { logoData = null; }
    return logoData;
}

// El logo es azul y negro, así que sobre fondo oscuro va dentro de una pastilla blanca.
function logoPastilla(pptx, s, x, y, w) {
    if (!logoData) return;
    const h = w / 3.5;
    s.addShape(pptx.ShapeType.roundRect, { x, y, w: w + 0.4, h: h + 0.3, fill: { color: BLANCO }, line: { type: 'none' }, rectRadius: 0.06 });
    s.addImage({ data: logoData, x: x + 0.2, y: y + 0.15, w, h });
}

// Botón: genera y descarga el .pptx del período actual del dashboard.
export async function descargarPresentacion() {
    const btn = document.getElementById('btn-presentacion');
    await conEstadoDeCarga(btn, async () => {
        try {
            await cargarPptxLib();
        } catch (e) {
            return toastError(e.message);
        }
        const m = metricasPeriodo();
        if (!m.visitasTotal) return toastError('No hay datos en el período elegido para presentar.');
        await cargarLogo();
        await construir(m);
        toastExito('Presentación descargada.');
    });
}

async function construir(m) {
    const pptx = new window.PptxGenJS();
    pptx.layout = 'LAYOUT_WIDE'; // 13.33 x 7.5 (16:9)
    pptx.author = 'Logística Hogareño';

    // Precio promedio por envío: el que quedó guardado en la pantalla Facturación.
    const precio = Number(localStorage.getItem('fact_precio')) || 0;

    let pagina = 1;
    portada(pptx, m);
    slideNumeros(pptx, m, ++pagina);
    slideFacturacion(pptx, m, precio, ++pagina);
    slideResultadoInteres(pptx, m, ++pagina);
    slideTickets(pptx, m, ++pagina);
    slideVendedores(pptx, m, ++pagina);
    slideDestacados(pptx, m, precio, ++pagina);
    slideZonasMotivos(pptx, m, ++pagina);

    const nombre = `Presentacion Ventas - ${m.periodo}`.replace(/[\\/:*?"<>|]/g, '-');
    await pptx.writeFile({ fileName: `${nombre}.pptx` });
}

// ------------------------------------------------------------
// Estructura común: banda de encabezado + subtítulo + pie
// ------------------------------------------------------------
function marco(pptx, s, titulo, subtitulo, m, pagina) {
    s.background = { color: FONDO };
    // Barra de acento en el borde izquierdo
    s.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 0.16, h: 7.5, fill: { color: AZUL }, line: { type: 'none' } });
    s.addText(titulo, { x: 0.6, y: 0.38, w: 9.6, h: 0.62, fontSize: 28, bold: true, color: BLANCO });
    s.addText(subtitulo, { x: 0.6, y: 1.0, w: 9.6, h: 0.42, fontSize: 12.5, color: GRIS });
    s.addShape(pptx.ShapeType.line, { x: 0.6, y: 1.52, w: 12.13, h: 0, line: { color: LINEA, width: 1 } });
    logoPastilla(pptx, s, 10.95, 0.42, 1.6);
    // Pie de página
    s.addShape(pptx.ShapeType.line, { x: 0.6, y: 7.02, w: 12.13, h: 0, line: { color: LINEA, width: 1 } });
    s.addText('Logística Hogareño   ·   Reporte de Ventas   ·   ' + m.periodo, { x: 0.6, y: 7.08, w: 9, h: 0.35, fontSize: 9, color: GRIS });
    s.addText('Página ' + pagina, { x: 10.6, y: 7.08, w: 2.13, h: 0.35, fontSize: 9, bold: true, color: AZUL, align: 'right' });
}

// Recuadro con un texto explicativo en lenguaje claro (llena y aclara)
function narrativa(pptx, s, x, y, w, texto) {
    s.addShape(pptx.ShapeType.roundRect, { x, y, w, h: 0.9, fill: { color: SUAVE }, line: { color: LINEA, width: 1 }, rectRadius: 0.08 });
    s.addText([{ text: 'En resumen:  ', options: { bold: true, color: CELESTE } }, { text: texto, options: { color: TEXTO } }],
        { x: x + 0.25, y, w: w - 0.5, h: 0.9, fontSize: 12.5, valign: 'middle' });
}

// ------------------------------------------------------------
// Slide 1: portada
// ------------------------------------------------------------
function portada(pptx, m) {
    const s = pptx.addSlide();
    s.background = { color: FONDO };
    s.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 0.16, h: 7.5, fill: { color: AZUL }, line: { type: 'none' } });
    s.addShape(pptx.ShapeType.rect, { x: 0, y: 6.0, w: 13.33, h: 1.5, fill: { color: PANEL }, line: { type: 'none' } });
    logoPastilla(pptx, s, 0.9, 0.9, 3.1);
    s.addText('REPORTE DE VENTAS', { x: 0.9, y: 2.75, w: 11.5, h: 1.1, fontSize: 48, bold: true, color: BLANCO });
    s.addText('Análisis de la gestión comercial del equipo', { x: 0.9, y: 3.9, w: 11.5, h: 0.55, fontSize: 20, color: GRIS });
    s.addShape(pptx.ShapeType.line, { x: 0.95, y: 4.6, w: 4, h: 0, line: { color: AZUL, width: 2.5 } });
    s.addText('Período analizado: ' + m.periodo, { x: 0.9, y: 4.8, w: 11.5, h: 0.5, fontSize: 18, bold: true, color: CELESTE });
    s.addText('Logística Hogareño', { x: 0.9, y: 6.4, w: 8, h: 0.5, fontSize: 17, bold: true, color: BLANCO });
    s.addText('Generado el ' + new Date().toLocaleDateString('es-AR'), { x: 4.9, y: 6.45, w: 7.5, h: 0.4, fontSize: 13, color: GRIS, align: 'right' });
}

// ------------------------------------------------------------
// Slide 2: números clave
// ------------------------------------------------------------
function slideNumeros(pptx, m, pag) {
    const s = pptx.addSlide();
    marco(pptx, s, 'Números del período', 'Los indicadores principales de la actividad comercial en el período analizado.', m, pag);
    const tiles = [
        { icono: '📝', n: fmtNum(m.visitasTotal), l: 'Visitas totales', d: 'Cantidad de visitas registradas por el equipo', c: AZUL },
        { icono: '🏢', n: fmtNum(m.empresasVisitadas), l: 'Empresas visitadas', d: 'Empresas distintas que se visitaron', c: AZUL },
        { icono: '🏆', n: fmtNum(m.ganados), l: 'Clientes ganados', d: 'Empresas que se cerraron como clientes', c: VERDE },
        { icono: '📈', n: m.conversion + '%', l: 'Conversión', d: 'Porcentaje de empresas visitadas que se cerraron', c: VERDE },
        { icono: '💔', n: `${fmtNum(m.perdidos)}  (${m.pctPerdidos}%)`, l: 'Clientes perdidos', d: 'Empresas que decidieron no avanzar', c: ROJO },
        { icono: '⏳', n: `${fmtNum(m.pendientes)}  (${m.pctPendientes}%)`, l: 'Clientes pendientes', d: 'Empresas todavía en negociación', c: AMBAR }
    ];
    tiles.forEach((t, i) => {
        const col = i % 3, row = Math.floor(i / 3);
        const x = 0.6 + col * 4.12, y = 1.75 + row * 2.45;
        s.addShape(pptx.ShapeType.roundRect, { x, y, w: 3.9, h: 2.25, fill: { color: SUAVE }, line: { color: LINEA, width: 1 }, rectRadius: 0.1 });
        s.addShape(pptx.ShapeType.rect, { x, y, w: 3.9, h: 0.1, fill: { color: t.c }, line: { type: 'none' } });
        s.addText(t.icono, { x, y: y + 0.22, w: 3.9, h: 0.5, align: 'center', fontSize: 22 });
        s.addText(String(t.n), { x, y: y + 0.68, w: 3.9, h: 0.72, align: 'center', fontSize: 32, bold: true, color: t.c });
        s.addText(t.l, { x, y: y + 1.4, w: 3.9, h: 0.4, align: 'center', fontSize: 14, bold: true, color: TEXTO });
        s.addText(t.d, { x: x + 0.2, y: y + 1.78, w: 3.5, h: 0.42, align: 'center', fontSize: 10, color: GRIS });
    });
}

// ------------------------------------------------------------
// Slide 3: facturación estimada de clientes ganados
// ------------------------------------------------------------
function slideFacturacion(pptx, m, precio, pag) {
    const s = pptx.addSlide();
    marco(pptx, s, 'Facturación estimada', 'Ingresos aproximados que generan los clientes ganados en el período.', m, pag);
    const enviosMes = m.envios.ganado * DIAS_TRABAJADOS;
    const facturacion = enviosMes * precio;

    // Recuadro grande con el monto
    s.addShape(pptx.ShapeType.roundRect, { x: 0.6, y: 1.75, w: 12.13, h: 2.1, fill: { color: SUAVE }, line: { color: AZUL, width: 1.5 }, rectRadius: 0.12 });
    s.addText('Facturación estimada del período', { x: 0.6, y: 1.95, w: 12.13, h: 0.5, align: 'center', fontSize: 15, bold: true, color: GRIS });
    s.addText(precio ? fmtPesos(facturacion) : 'Cargá el precio promedio en la pantalla Facturación', { x: 0.6, y: 2.42, w: 12.13, h: 1.15, align: 'center', fontSize: precio ? 48 : 20, bold: true, color: CELESTE });

    // Desglose de la fórmula (palabras completas)
    const th = t => ({ text: t, options: { bold: true, color: BLANCO, fill: { color: AZUL_OSCURO }, align: 'center', valign: 'middle', fontSize: 13 } });
    const cel = t => ({ text: String(t), options: { fontSize: 15, align: 'center', valign: 'middle' } });
    s.addTable([
        [th('Envíos por día ganados'), th('Precio por envío'), th('Días trabajados'), th('Envíos del mes'), th('Facturación estimada')],
        [cel(fmtNum(m.envios.ganado)), cel(precio ? fmtPesos(precio) : 'Sin cargar'), cel(DIAS_TRABAJADOS), cel(fmtNum(enviosMes)), cel(precio ? fmtPesos(facturacion) : 'Sin calcular')]
    ], { x: 0.6, y: 4.15, w: 12.13, colW: [2.6, 2.4, 2.13, 2.4, 2.6], rowH: [0.75, 0.7], border: { type: 'solid', color: LINEA, pt: 1 }, fill: { color: PANEL }, valign: 'middle', color: TEXTO });

    narrativa(pptx, s, 0.6, 5.85, 12.13,
        `Se toman los ${fmtNum(m.envios.ganado)} envíos por día de los clientes ganados, se multiplican por ${DIAS_TRABAJADOS} días trabajados en el mes y por el precio promedio de cada envío.`);
}

// Dibuja una lista de barras horizontales con formas (control total del diseño)
function barras(pptx, s, x, y, w, items) {
    const max = Math.max(1, ...items.map(i => i.value));
    const filaH = 0.55, gap = 0.32, etiquetaW = 2.5;
    items.forEach((it, idx) => {
        const yy = y + idx * (filaH + gap);
        s.addText(it.label, { x, y: yy, w: etiquetaW, h: filaH, fontSize: 13, bold: true, color: TEXTO, valign: 'middle' });
        const trackX = x + etiquetaW + 0.1, trackW = w - etiquetaW - 0.9;
        s.addShape(pptx.ShapeType.roundRect, { x: trackX, y: yy + 0.13, w: trackW, h: 0.3, fill: { color: PISTA }, line: { type: 'none' }, rectRadius: 0.15 });
        s.addShape(pptx.ShapeType.roundRect, { x: trackX, y: yy + 0.13, w: Math.max(0.08, trackW * it.value / max), h: 0.3, fill: { color: it.color }, line: { type: 'none' }, rectRadius: 0.15 });
        s.addText(String(it.value), { x: x + w - 0.75, y: yy, w: 0.75, h: filaH, fontSize: 14, bold: true, color: TEXTO, align: 'right', valign: 'middle' });
    });
}

// ------------------------------------------------------------
// Slide 4: resultado e interés
// ------------------------------------------------------------
function slideResultadoInteres(pptx, m, pag) {
    const s = pptx.addSlide();
    marco(pptx, s, 'Resultado e interés', 'Cómo terminaron las empresas visitadas y qué nivel de interés mostraron.', m, pag);

    s.addText('Resultado de las empresas', { x: 0.6, y: 1.75, w: 6, h: 0.45, fontSize: 15, bold: true, color: TEXTO });
    s.addText('Cada empresa cuenta una sola vez, según su estado actual.', { x: 0.6, y: 2.15, w: 6, h: 0.35, fontSize: 11, color: GRIS });
    barras(pptx, s, 0.6, 2.65, 6, [
        { label: 'Ganados', value: m.resultado.ganados, color: VERDE },
        { label: 'Perdidos', value: m.resultado.perdidos, color: ROJO },
        { label: 'Pendientes', value: m.resultado.pendientes, color: AMBAR }
    ]);

    s.addText('Interés de los que siguen abiertos', { x: 7, y: 1.75, w: 6, h: 0.45, fontSize: 15, bold: true, color: TEXTO });
    s.addText('Empresas que todavía no se cerraron ni se perdieron.', { x: 7, y: 2.15, w: 6, h: 0.35, fontSize: 11, color: GRIS });
    barras(pptx, s, 7, 2.65, 6, [
        { label: 'Interesados', value: m.interes.si, color: VERDE },
        { label: 'Neutros', value: m.interes.neutro, color: AMBAR },
        { label: 'No interesados', value: m.interes.no, color: ROJO }
    ]);

    narrativa(pptx, s, 0.6, 5.85, 12.13,
        `De ${fmtNum(m.empresasVisitadas)} empresas visitadas, se ganaron ${fmtNum(m.resultado.ganados)} (${m.conversion}% de conversión), se perdieron ${fmtNum(m.resultado.perdidos)} y quedan ${fmtNum(m.resultado.pendientes)} en negociación.`);
}

// ------------------------------------------------------------
// Slide 5: análisis de tickets (envíos)
// ------------------------------------------------------------
function slideTickets(pptx, m, pag) {
    const s = pptx.addSlide();
    marco(pptx, s, 'Análisis de tickets (envíos por día)', 'Volumen de envíos diarios de las empresas según su estado. Un ticket es un envío.', m, pag);
    const th = t => ({ text: t, options: { bold: true, color: BLANCO, fill: { color: AZUL_OSCURO }, align: 'center', valign: 'middle', fontSize: 14 } });
    const izq = (t, extra = {}) => ({ text: t, options: { fontSize: 15, bold: true, valign: 'middle', color: TEXTO, ...extra } });
    const cen = (t, extra = {}) => ({ text: t, options: { fontSize: 15, align: 'center', valign: 'middle', ...extra } });
    const e = m.envios;
    const filas = [
        [{ text: 'Grupo de empresas', options: { bold: true, color: BLANCO, fill: { color: AZUL_OSCURO }, valign: 'middle', fontSize: 14 } }, th('Envíos por día'), th('Promedio por cliente')],
        [izq('Total del período'), cen(fmtNum(e.total)), cen(`${e.promTotal} por día`)],
        [izq('En negociación'), cen(fmtNum(e.negociacion)), cen(`${e.promNegociacion} por día`)],
        [izq('Clientes ganados'), cen(fmtNum(e.ganado), { color: VERDE }), cen(`${e.promGanado} por día`)],
        [izq('Clientes perdidos'), cen(fmtNum(e.perdido), { color: ROJO }), cen(`${e.promPerdido} por día`)]
    ];
    s.addTable(filas, { x: 0.6, y: 1.85, w: 12.13, colW: [6.13, 3, 3], rowH: 0.82, border: { type: 'solid', color: LINEA, pt: 1 }, fill: { color: PANEL }, valign: 'middle', color: TEXTO });

    narrativa(pptx, s, 0.6, 5.95, 12.13,
        `Los clientes ganados suman ${fmtNum(e.ganado)} envíos por día, con un promedio de ${e.promGanado} envíos diarios por cada cliente cerrado.`);
}

// ------------------------------------------------------------
// Slide 6: rendimiento por vendedor
// ------------------------------------------------------------
function slideVendedores(pptx, m, pag) {
    const s = pptx.addSlide();
    marco(pptx, s, 'Rendimiento por vendedor', 'Cuánto trabajó y cuánto cerró cada integrante del equipo de ventas.', m, pag);
    const th = t => ({ text: t, options: { bold: true, color: BLANCO, fill: { color: AZUL_OSCURO }, align: 'center', valign: 'middle', fontSize: 13 } });
    const cel = (t, extra = {}) => ({ text: String(t), options: { fontSize: 14, valign: 'middle', align: 'center', ...extra } });
    const filas = [[
        { text: 'Vendedor', options: { bold: true, color: BLANCO, fill: { color: AZUL_OSCURO }, valign: 'middle', fontSize: 13 } },
        th('Visitas'), th('Empresas'), th('Ganados'), th('Perdidos'), th('Pendientes'), th('Conversión')
    ]];
    (m.porVendedor.length ? m.porVendedor : []).forEach(v => {
        filas.push([
            { text: v.vendedor, options: { fontSize: 14, bold: true, valign: 'middle', color: TEXTO } },
            cel(v.visitas), cel(v.empresas), cel(v.ganados, { color: VERDE, bold: true }),
            cel(v.perdidos, { color: ROJO }), cel(v.pendientes, { color: AMBAR }),
            cel(v.conversion + '%', { bold: true })
        ]);
    });
    if (m.porVendedor.length === 0) filas.push([cel('Sin datos'), cel('-'), cel('-'), cel('-'), cel('-'), cel('-'), cel('-')]);
    s.addTable(filas, { x: 0.6, y: 1.85, w: 12.13, colW: [3.13, 1.5, 1.5, 1.5, 1.5, 1.5, 1.5], rowH: 0.62, border: { type: 'solid', color: LINEA, pt: 1 }, fill: { color: PANEL }, color: TEXTO });

    if (m.porVendedor.length) {
        const top = m.porVendedor[0];
        narrativa(pptx, s, 0.6, 5.95, 12.13,
            `${top.vendedor} lidera el período con ${fmtNum(top.ganados)} cliente(s) ganado(s) y ${top.conversion}% de conversión sobre ${fmtNum(top.empresas)} empresa(s) visitada(s).`);
    }
}

// Tarjeta de un cliente destacado (nombre, envíos, zona, vendedor, línea extra)
function tarjetaCliente(pptx, s, x, y, w, cli, colorAcento, extraLinea) {
    s.addShape(pptx.ShapeType.roundRect, { x, y, w, h: 1.55, fill: { color: SUAVE }, line: { color: LINEA, width: 1 }, rectRadius: 0.08 });
    s.addShape(pptx.ShapeType.rect, { x, y, w: 0.14, h: 1.55, fill: { color: colorAcento }, line: { type: 'none' } });
    s.addText(cli.nombre, { x: x + 0.32, y: y + 0.16, w: w - 2.6, h: 0.45, fontSize: 17, bold: true, color: TEXTO });
    s.addText(`${fmtNum(cli.envios)} envíos por día`, { x: x + w - 2.5, y: y + 0.16, w: 2.3, h: 0.45, fontSize: 16, bold: true, color: colorAcento, align: 'right' });
    s.addText(`Zona: ${cli.zona}     Vendedor: ${cli.vendedor}`, { x: x + 0.32, y: y + 0.72, w: w - 0.6, h: 0.35, fontSize: 12, color: GRIS });
    if (extraLinea) s.addText(extraLinea, { x: x + 0.32, y: y + 1.08, w: w - 0.6, h: 0.38, fontSize: 12.5, bold: true, color: colorAcento });
}

// ------------------------------------------------------------
// Slide 7: clientes destacados
// ------------------------------------------------------------
function slideDestacados(pptx, m, precio, pag) {
    const s = pptx.addSlide();
    marco(pptx, s, 'Clientes destacados', 'Los clientes más grandes que ganamos y las mejores oportunidades para el próximo mes.', m, pag);

    s.addText('Mejores clientes ganados en el período', { x: 0.6, y: 1.75, w: 6, h: 0.45, fontSize: 15, bold: true, color: VERDE });
    s.addText('Ordenados por volumen de envíos por día.', { x: 0.6, y: 2.15, w: 6, h: 0.3, fontSize: 11, color: GRIS });
    if (m.topGanados.length === 0) {
        s.addText('No hubo clientes ganados en el período.', { x: 0.6, y: 2.6, w: 6, h: 0.5, fontSize: 12, italic: true, color: GRIS });
    } else {
        m.topGanados.forEach((c, i) => {
            const factMes = precio ? `Facturación estimada: ${fmtPesos(c.envios * DIAS_TRABAJADOS * precio)} por mes` : 'Cargá el precio en Facturación para ver el monto';
            tarjetaCliente(pptx, s, 0.6, 2.5 + i * 1.8, 6, c, VERDE, factMes);
        });
    }

    s.addText('Oportunidades para el próximo mes', { x: 7, y: 1.75, w: 6, h: 0.45, fontSize: 15, bold: true, color: AMBAR });
    s.addText('Empresas interesadas que todavía no se cerraron.', { x: 7, y: 2.15, w: 6, h: 0.3, fontSize: 11, color: GRIS });
    if (m.topInteresados.length === 0) {
        s.addText('No hay oportunidades abiertas en el período.', { x: 7, y: 2.6, w: 6, h: 0.5, fontSize: 12, italic: true, color: GRIS });
    } else {
        m.topInteresados.forEach((c, i) => {
            tarjetaCliente(pptx, s, 7, 2.5 + i * 1.8, 6, c, AMBAR, c.etapa ? `Etapa actual: ${c.etapa}` : 'Interesado, sin cerrar todavía');
        });
    }
}

// ------------------------------------------------------------
// Slide 8: zonas y motivos de pérdida
// ------------------------------------------------------------
function slideZonasMotivos(pptx, m, pag) {
    const s = pptx.addSlide();
    marco(pptx, s, 'Zonas y motivos de pérdida', 'Dónde se concentran las empresas y por qué motivos se pierden clientes.', m, pag);
    const th = t => ({ text: t, options: { bold: true, color: BLANCO, fill: { color: AZUL_OSCURO }, valign: 'middle', fontSize: 13 } });
    const celda = (t, extra = {}) => ({ text: String(t), options: { fontSize: 13, valign: 'middle', ...extra } });

    // Zonas (hasta 6 por cantidad de empresas)
    s.addText('Empresas por zona y su conversión', { x: 0.6, y: 1.75, w: 6, h: 0.45, fontSize: 14, bold: true, color: TEXTO });
    const zonas = m.zonas.slice(0, 6).map(z => [
        celda(z.zona === '—' ? 'Sin zona' : z.zona), celda(z.total, { align: 'center' }),
        celda(z.total ? Math.round(z.cerrados / z.total * 100) + '%' : '0%', { align: 'center', color: VERDE, bold: true })
    ]);
    s.addTable([[th('Zona'), th('Empresas'), th('Conversión')], ...(zonas.length ? zonas : [[celda('Sin datos'), celda('-'), celda('-')]])],
        { x: 0.6, y: 2.25, w: 6, colW: [3.1, 1.45, 1.45], rowH: 0.58, border: { type: 'solid', color: LINEA, pt: 1 }, fill: { color: PANEL }, color: TEXTO });

    // Motivos de pérdida (hasta 6)
    s.addText('Por qué se perdieron clientes', { x: 7, y: 1.75, w: 6, h: 0.45, fontSize: 14, bold: true, color: TEXTO });
    const motivos = m.motivos.slice(0, 6).map(([mot, n]) => [celda(mot || 'Sin motivo cargado'), celda(n, { align: 'center', color: ROJO, bold: true })]);
    s.addTable([[th('Motivo de la pérdida'), th('Cantidad')], ...(motivos.length ? motivos : [[celda('No hubo clientes perdidos'), celda('-')]])],
        { x: 7, y: 2.25, w: 6, colW: [4.4, 1.6], rowH: 0.58, border: { type: 'solid', color: LINEA, pt: 1 }, fill: { color: PANEL }, color: TEXTO });
}
