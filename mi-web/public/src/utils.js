// ============================================================
// Funciones auxiliares reutilizables
// ============================================================

// Marca como activo un botón dentro de un grupo de selección
// (deja solo uno seleccionado, como los "toggles" del formulario)
export function selectSingle(grupoId, elemento) {
    document.querySelectorAll(`#${grupoId} .btn-option`).forEach(b => b.classList.remove('active'));
    elemento.classList.add('active');
}

// Devuelve el valor (data-val) del botón activo dentro de un grupo
export function getValorSeleccionado(grupoId) {
    const el = document.querySelector(`#${grupoId} .btn-option.active`);
    return el ? el.getAttribute('data-val') : '';
}

// Ejecuta una función async mostrando un spinner en el botón mientras dura,
// y restaura el texto original al terminar (haya éxito o error).
export async function conEstadoDeCarga(boton, fnAsync) {
    if (!boton) return fnAsync();

    const textoOriginal = boton.innerHTML;
    boton.disabled = true;
    boton.classList.add('cargando');
    boton.innerHTML = `<span class="spinner"></span>${boton.dataset.textoCargando || 'Procesando...'}`;

    try {
        return await fnAsync();
    } finally {
        boton.disabled = false;
        boton.classList.remove('cargando');
        boton.innerHTML = textoOriginal;
    }
}
