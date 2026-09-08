// ============================================================
// Edge Function: enviar-push-ruta
// ------------------------------------------------------------
// Se dispara automáticamente (trigger de Postgres) cuando se
// inserta una fila en "itinerarios" (Ivo asigna una ruta).
// Busca las suscripciones push del vendedor y les manda el aviso.
//
// Usa @negrel/webpush (Web Push nativo de Deno). Las claves VAPID
// están en formato JWK exportado por WebCrypto (formato que la
// librería importa sin problemas).
//
// Nota: la clave privada VAPID vive acá, en el código del servidor
// (no se expone al navegador). Para un equipo chico es aceptable;
// se puede mover a un secret de Supabase más adelante.
// ============================================================
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import * as webpush from "jsr:@negrel/webpush@0.5.0";

const CONTACTOS_EQUIPO: Record<string, { email: string }> = {
  "Dante": { email: "d.lizarraga.ventas@logisticahogar.com" },
  "Nahuel": { email: "n.avanzini.ventas@logisticahogar.com" },
  "IVO (Prueba)": { email: "i.eichman.ventas@logisticahogar.com" },
};

// Par de claves VAPID (ECDSA P-256), formato JWK exportado por WebCrypto.
const VAPID_JWK = {
  publicKey: {
    kty: "EC", crv: "P-256",
    x: "vQs4t_MX5s_ip5rL7h5MlWp-_eBVLepvo8gbug4crYI",
    y: "8RmzaaLYrKg1VuwZKGRu5lBBqW_4MhlDGcohLNidNK8",
    key_ops: ["verify"], ext: true,
  },
  privateKey: {
    kty: "EC", crv: "P-256",
    x: "vQs4t_MX5s_ip5rL7h5MlWp-_eBVLepvo8gbug4crYI",
    y: "8RmzaaLYrKg1VuwZKGRu5lBBqW_4MhlDGcohLNidNK8",
    d: "d9pWxcze_QEDnAwQPoNrq0pLz_OQkYezhCpwCguvDpg",
    key_ops: ["sign"], ext: true,
  },
};

let appServerPromise: Promise<webpush.ApplicationServer> | null = null;
function obtenerAppServer() {
  if (!appServerPromise) {
    appServerPromise = (async () => {
      const vapidKeys = await webpush.importVapidKeys(VAPID_JWK, { extractable: false });
      return await webpush.ApplicationServer.new({
        contactInformation: "mailto:i.eichman.ventas@logisticahogar.com",
        vapidKeys,
      });
    })();
  }
  return appServerPromise;
}

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

Deno.serve(async (req) => {
  let etapa = "inicio";
  try {
    etapa = "init_app_server";
    const appServer = await obtenerAppServer();

    etapa = "parse_body";
    const itinerario = await req.json();
    const vendedor = itinerario.vendedor as string;
    const cantidadClientes = Array.isArray(itinerario.clientes) ? itinerario.clientes.length : 0;

    const contacto = CONTACTOS_EQUIPO[vendedor];
    if (!contacto) return Response.json({ ok: false, motivo: "vendedor desconocido" });

    etapa = "consultar_suscripciones";
    const { data: suscripciones, error } = await supabase
      .from("push_subscriptions")
      .select("id, subscription")
      .eq("user_email", contacto.email);
    if (error) throw error;
    if (!suscripciones || suscripciones.length === 0) {
      return Response.json({ ok: true, enviados: 0, motivo: "sin suscripciones" });
    }

    const payload = JSON.stringify({
      title: "🚚 Nueva ruta asignada",
      body: `Tenés ${cantidadClientes} visita(s) para el ${itinerario.fecha}.`,
      url: "/?ir=agenda",
      destino: "agenda-view",
    });

    let enviados = 0;
    const errores: string[] = [];
    for (const s of suscripciones) {
      try {
        const subscriber = appServer.subscribe(s.subscription);
        await subscriber.pushTextMessage(payload, {});
        enviados++;
      } catch (err) {
        const status = (err as { statusCode?: number })?.statusCode;
        if (status === 404 || status === 410) {
          await supabase.from("push_subscriptions").delete().eq("id", s.id);
        } else {
          errores.push(String((err as Error)?.message || err));
        }
      }
    }

    return Response.json({ ok: true, enviados, errores });
  } catch (err) {
    return Response.json({
      ok: false, etapa,
      error: String((err as Error)?.message || err),
    }, { status: 500 });
  }
});
