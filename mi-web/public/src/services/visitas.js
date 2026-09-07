// ============================================================
// Servicio de Visitas (tabla "visitas")
// ============================================================
import { supabase } from '../config/supabase.js';

// Últimas visitas para el historial (por defecto 20)
export async function obtenerVisitasRecientes(limite = 20) {
    const { data, error } = await supabase
        .from('visitas')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limite);
    if (error) throw error;
    return data;
}

// Visitas de un mes puntual (anioMes con formato 'YYYY-MM'), para el reporte
export async function obtenerVisitasDelMes(anioMes) {
    const [anio, mes] = anioMes.split('-').map(Number);
    const desde = new Date(anio, mes - 1, 1).toISOString();     // primer día del mes
    const hasta = new Date(anio, mes, 1).toISOString();         // primer día del mes siguiente
    const { data, error } = await supabase
        .from('visitas')
        .select('*')
        .gte('created_at', desde)
        .lt('created_at', hasta)
        .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
}

// Visitas en un rango de fechas (para el filtro del dashboard).
// 'desde' y 'hasta' son 'YYYY-MM-DD' y son opcionales:
//   - ambos vacíos  -> trae todas
//   - solo desde    -> desde esa fecha en adelante
//   - solo hasta    -> hasta esa fecha (incluida)
//   - desde = hasta -> ese único día
export async function obtenerVisitasEnRango(desde, hasta) {
    let q = supabase.from('visitas').select('*').order('created_at', { ascending: false });
    if (desde) {
        const [y, m, d] = desde.split('-').map(Number);
        q = q.gte('created_at', new Date(y, m - 1, d).toISOString());
    }
    if (hasta) {
        const [y, m, d] = hasta.split('-').map(Number);
        q = q.lt('created_at', new Date(y, m - 1, d + 1).toISOString()); // +1 día: incluye el día "hasta" entero
    }
    const { data, error } = await q;
    if (error) throw error;
    return data;
}

// Todas las visitas (para el reporte Excel del histórico completo)
export async function obtenerTodasLasVisitas() {
    const { data, error } = await supabase
        .from('visitas')
        .select('*')
        .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
}

// Suscripción a cambios en vivo
export function suscribirVisitas(callback) {
    return supabase
        .channel('visitas-cambios')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'visitas' }, callback)
        .subscribe();
}

// Guardar una nueva visita
export function guardarVisita(visita) {
    return supabase.from('visitas').insert(visita);
}

// Clientes cerrados: empresas con al menos una visita en resultado 'Cerrado'
// (se queda con la visita más reciente de cada empresa)
export async function obtenerClientesCerrados() {
    const { data, error } = await supabase
        .from('visitas')
        .select('nombre, vendedor, zona, horario_corte, created_at')
        .eq('resultado', 'Cerrado')
        .order('created_at', { ascending: false });
    if (error) throw error;

    const vistos = new Set();
    return data.filter(v => {
        if (vistos.has(v.nombre)) return false;
        vistos.add(v.nombre);
        return true;
    });
}

// Actualizar una visita existente
export function actualizarVisita(id, cambios) {
    return supabase.from('visitas').update(cambios).eq('id', id);
}

// Borrar una visita
export function eliminarVisita(id) {
    return supabase.from('visitas').delete().eq('id', id);
}
