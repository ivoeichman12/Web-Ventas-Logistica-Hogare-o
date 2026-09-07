// ============================================================
// Servicio de Prospectos (tabla "prospectos")
// ============================================================
import { supabase } from '../config/supabase.js';

// Trae todos los prospectos, del más nuevo al más viejo
export async function obtenerProspectos() {
    const { data, error } = await supabase
        .from('prospectos')
        .select('*')
        .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
}

// Se suscribe a cambios en vivo (altas, ediciones, borrados).
// callback() se llama cada vez que algo cambia en la tabla.
export function suscribirProspectos(callback) {
    return supabase
        .channel('prospectos-cambios')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'prospectos' }, callback)
        .subscribe();
}

// Actualiza un prospecto por id
export function actualizarProspecto(id, cambios) {
    return supabase.from('prospectos').update(cambios).eq('id', id);
}

// Borra un prospecto por id
export function eliminarProspecto(id) {
    return supabase.from('prospectos').delete().eq('id', id);
}

// Borra TODOS los prospectos (vaciar base)
export function vaciarProspectos() {
    return supabase.from('prospectos').delete().neq('id', '00000000-0000-0000-0000-000000000000');
}

// Inserta muchos prospectos de una (importación desde Excel)
export function importarProspectos(filas) {
    return supabase.from('prospectos').insert(filas);
}
