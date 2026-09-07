// ============================================================
// Servicio de autenticación (Supabase Auth)
// ============================================================
import { supabase } from '../config/supabase.js';

// Iniciar sesión con email + contraseña
export function login(email, password) {
    return supabase.auth.signInWithPassword({ email, password });
}

// Cerrar sesión
export function logout() {
    return supabase.auth.signOut();
}

// Escuchar cambios de sesión. El callback recibe el usuario (o null).
// Se dispara al cargar la página con la sesión existente y en cada
// login / logout.
export function onAuthChange(callback) {
    supabase.auth.onAuthStateChange((_evento, session) => {
        callback(session?.user ?? null);
    });
}

// Usuario actualmente logueado (o null)
export async function getUsuarioActual() {
    const { data } = await supabase.auth.getUser();
    return data?.user ?? null;
}
