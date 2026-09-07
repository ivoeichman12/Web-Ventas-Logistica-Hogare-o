// ============================================================
// Pantalla: BBDD de Prospección
// ============================================================
import { estado } from '../estado.js';
import { claseEstado } from '../config/constantes.js';
import { vaciarProspectos as vaciarEnBase, importarProspectos } from '../services/prospectos.js';
import { toastExito, toastError } from '../components/toast.js';
import { confirmarAccion } from '../components/confirmModal.js';
import { conEstadoDeCarga } from '../utils.js';

// Dibuja la grilla de prospectos aplicando el buscador
export function renderProspectos() {
    const grid = document.getElementById('grid-prospectos');
    const query = document.getElementById('busqueda-prospecto').value.toLowerCase();
    const filtroEstado = document.getElementById('filtro-estado-prospecto').value;
    grid.innerHTML = '';

    const filtrados = estado.prospectos.filter(p =>
        p.nombre.toLowerCase().includes(query) &&
        (filtroEstado === 'Todos' || (p.estado || 'Nuevo') === filtroEstado)
    );

    if (filtrados.length === 0) {
        grid.innerHTML = estado.prospectos.length === 0
            ? '<p class="estado-vacio">Todavía no hay prospectos cargados. Importá un Excel para empezar.</p>'
            : '<p class="estado-vacio">No se encontraron prospectos con esos filtros.</p>';
        return;
    }

    filtrados.forEach(p => {
        const est = p.estado || 'Nuevo';
        grid.innerHTML += `<div class="card-prospecto" onclick="verDetalleP('${p.id}')">
            <span class="badge-estado ${claseEstado(est)}">${est}</span>
            <h3>${p.nombre}</h3><p>📍 ${p.zona} - ${p.localidad}</p><span class="tag-v">${p.rubro}</span>
        </div>`;
    });
}

// Vacía toda la base de prospectos (con confirmación)
export async function vaciarProspectos() {
    const confirmado = await confirmarAccion('¿Vaciar base de prospectos? Esta acción no se puede deshacer.');
    if (!confirmado) return;
    const { error } = await vaciarEnBase();
    if (error) return toastError('Error al vaciar: ' + error.message);
    toastExito('Base de prospectos vaciada.');
}

// Importa prospectos desde un archivo Excel (usa la librería global XLSX)
export function importarProspectosDesdeExcel(input) {
    const archivo = input.files[0];
    if (!archivo) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
        const datos = new Uint8Array(e.target.result);
        const wb = XLSX.read(datos, { type: 'array' });
        const json = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);

        // Busca el valor de una columna probando varios nombres posibles
        const getV = (row, claves) => {
            for (const k of claves) {
                const encontrada = Object.keys(row).find(rk => rk.trim().toLowerCase() === k.toLowerCase());
                if (encontrada) return row[encontrada];
            }
            return '-';
        };

        const filas = json.map(row => ({
            nombre:    getV(row, ['EMPRESA', 'Nombre']),
            rubro:     getV(row, ['RUBRO']),
            ventas:    getV(row, ['Cantidad ventas']),
            zona:      getV(row, ['Zona']),
            localidad: getV(row, ['Partido/Localidad/Barrio']),
            telefono:  getV(row, ['Teléfono']),
            notas:     getV(row, ['Notas'])
        }));

        const boton = document.getElementById('btn-importar-excel');
        await conEstadoDeCarga(boton, async () => {
            const { error } = await importarProspectos(filas);
            if (error) return toastError('Error al importar: ' + error.message);
            toastExito(`Importación terminada: ${filas.length} prospectos.`);
        });
    };
    reader.readAsArrayBuffer(archivo);
}
