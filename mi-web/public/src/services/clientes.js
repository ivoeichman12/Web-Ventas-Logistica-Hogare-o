// ============================================================
// Servicio de Clientes activos (tabla "clientes")
// ============================================================
import { supabase } from '../config/supabase.js';

// Trae todos los clientes activos
export async function obtenerClientes() {
    const { data, error } = await supabase.from('clientes').select('*');
    if (error) throw error;
    return data;
}

// Suscripción a cambios en vivo
export function suscribirClientes(callback) {
    return supabase
        .channel('clientes-cambios')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'clientes' }, callback)
        .subscribe();
}
