// ============================================================
// Servicio de Itinerarios / Agenda (tabla "itinerarios")
// ============================================================
import { supabase } from '../config/supabase.js';

// Crea un itinerario (ruta asignada a un vendedor para una fecha)
export function crearItinerario(itinerario) {
    return supabase.from('itinerarios').insert(itinerario);
}

// Trae la agenda de un vendedor para una fecha puntual
export async function obtenerAgenda(vendedor, fecha) {
    const { data, error } = await supabase
        .from('itinerarios')
        .select('*')
        .eq('vendedor', vendedor)
        .eq('fecha', fecha);
    if (error) throw error;
    return data;
}
