// ============================================================
// Pantalla: Clientes Activos (empresas con visita "Cerrada")
// ============================================================

// Dibuja la grilla de clientes cerrados recibida
export function renderClientes(clientes) {
    const grid = document.getElementById('grid-activos');
    grid.innerHTML = '';

    if (clientes.length === 0) {
        grid.innerHTML = '<p class="estado-vacio">Todavía no hay clientes cerrados. Marcá una visita como "Cerrado" (desde su detalle) para que aparezca acá.</p>';
        return;
    }

    clientes.forEach(c => {
        grid.innerHTML += `<div class="card-prospecto" style="border-left:4px solid var(--verde-drive)">
            <span class="badge-estado resultado-cerrado">🤝 Cliente</span>
            <h3>${c.nombre}</h3>
            <p>👤 ${c.vendedor || '-'} · 📍 ${c.zona || 's/zona'}</p>
        </div>`;
    });
}
