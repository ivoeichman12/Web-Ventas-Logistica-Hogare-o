// ============================================================
// Conexión a Supabase (reemplaza a Firebase)
// ------------------------------------------------------------
// La "publishable key" es pública: puede vivir en el frontend sin
// problema. La seguridad real la dan las políticas RLS de la base.
// ============================================================
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = 'https://ixwynfbiocackgfkdjjs.supabase.co';
const SUPABASE_KEY = 'sb_publishable_WEABOywIFV_RjZ1eQqaPsw_2-0NCtOK';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
