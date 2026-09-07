// ============================================================
// Estado compartido de la app (datos que viven en memoria)
// ============================================================
export const estado = {
    prospectos: [],          // lista de prospectos cargada desde Supabase
    prospectoActivoId: null, // id del prospecto abierto en el modal
    visitas: [],             // historial reciente de visitas (para la pantalla de visitas)
    todasLasVisitas: [],     // todas las visitas (las carga el dashboard, para el drill-down)
    visitaActivaId: null,    // id de la visita abierta en el modal
    esAdmin: false           // true si el usuario logueado es admin (Ivo)
};
