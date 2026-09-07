// ============================================================
// Datos fijos de configuración de la app
// ============================================================

// Etapas del embudo de ventas de un prospecto. El orden importa (avanza de izq a der).
export const ESTADOS_PROSPECTO = ['Nuevo', 'Contactado', 'En negociación', 'Cerrado'];

// Resultado de una visita registrada
export const RESULTADOS_VISITA = ['Pendiente', 'Cerrado', 'Perdido', 'A seguir'];

// Motivos por los que se pierde un cliente (obligatorio al marcar 'Perdido')
export const MOTIVOS_PERDIDA = [
    { valor: 'Precio', icono: '💰' },
    { valor: 'Conforme con su logística actual', icono: '👍' },
    { valor: 'Contrato / exclusividad vigente', icono: '📄' },
    { valor: 'No hace envíos / no aplica', icono: '📦' },
    { valor: 'No le interesa / no atiende', icono: '🚫' },
    { valor: 'Zona o servicio no cubierto', icono: '📍' },
    { valor: 'Otro', icono: '❓' }
];

// Etapas de negociación de un cliente Pendiente (obligatorio al marcar
// 'Pendiente'). El orden importa: avanza de izq a der (embudo).
export const ETAPAS_PENDIENTE = [
    { valor: 'Visita sin contacto clave', icono: '👋' },
    { valor: 'Visita con contacto clave', icono: '🤝' },
    { valor: 'Cotizado', icono: '🧾' }
];

// Resultado de una visita: 3 opciones al registrar (reemplaza a "A seguir",
// ese avance ahora lo indica ETAPAS_PENDIENTE). 'valor' es lo que se guarda
// en la columna 'resultado'; 'label' es lo que ve el vendedor.
export const OPCIONES_RESULTADO = [
    { valor: 'Cerrado', label: 'Ganado', icono: '🏆' },
    { valor: 'Perdido', label: 'Perdido', icono: '💔' },
    { valor: 'Pendiente', label: 'Pendiente', icono: '⏳' }
];

// Clase CSS del badge/barra según el resultado de la visita
export function claseResultado(resultado) {
    switch (resultado) {
        case 'Cerrado':  return 'resultado-cerrado';
        case 'Perdido':  return 'resultado-perdido';
        case 'A seguir': return 'resultado-seguir';
        default:         return 'resultado-pendiente';
    }
}

// Clase CSS del badge según el estado (para colorearlo)
export function claseEstado(estado) {
    switch (estado) {
        case 'Contactado':      return 'estado-contactado';
        case 'En negociación':  return 'estado-negociacion';
        case 'Cerrado':         return 'estado-cerrado';
        default:                return 'estado-nuevo';
    }
}

// Contactos del equipo de ventas (para enviar rutas por WhatsApp / Email)
export const CONTACTOS_EQUIPO = {
    "Dante":        { phone: "5491163501779", email: "d.lizarraga.ventas@logisticahogar.com" },
    "Nahuel":       { phone: "5491132955598", email: "n.avanzini.ventas@logisticahogar.com" },
    "Ivo":          { phone: "5491139111993", email: "i.eichman.ventas@logisticahogar.com" }
};

// Clave pública VAPID para notificaciones push (no es secreta, va en el navegador)
export const VAPID_PUBLIC_KEY = 'BL0LOLfzF-bP4qeay-4eTJVqfv3gVS3qb6PIG7oOHK2C8RmzaaLYrKg1VuwZKGRu5lBBqW_4MhlDGcohLNidNK8';

// Zonas y sus localidades / partidos / barrios
export const zonasData = {
    "Zona Oeste": ["Morón", "La Matanza", "Merlo", "Hurlingham", "Tres de Febrero", "Moreno", "Ituzaingó", "San Miguel", "General Rodríguez", "Marcos Paz"],
    "Zona Norte": ["Vicente López", "San Isidro", "San Fernando", "Tigre", "General San Martín", "Pilar", "Escobar", "Malvinas Argentinas", "José C. Paz"],
    "Zona Sur":   ["Avellaneda", "Lanús", "Lomas de Zamora", "Quilmes", "Almirante Brown", "Berazategui", "Florencio Varela", "Esteban Echeverría", "Ezeiza"],
    "CABA":       ["Palermo", "Belgrano", "Caballito", "Flores", "Villa Urquiza", "Recoleta", "Microcentro", "Liniers", "Villa Devoto", "Parque Patricios", "Centro", "Otro barrio CABA"]
};
