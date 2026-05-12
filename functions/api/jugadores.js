export async function onRequestPost({ request, env }) {
    try {
        const body = await request.json();
        const { nombre_completo, telefono, dni_cuil, alias_para_cobrar, titular_cuenta } = body;

        if (!telefono || !nombre_completo) {
            return new Response(JSON.stringify({ error: "Teléfono y Nombre son requeridos" }), { status: 400 });
        }

        // Buscar si ya existe
        const { results } = await env.DB.prepare(
            "SELECT * FROM jugadores WHERE telefono = ?"
        ).bind(telefono).all();

        if (results && results.length > 0) {
            const jugador = results[0];
            // Actualizamos los datos por si cambiaron
            await env.DB.prepare(
                "UPDATE jugadores SET nombre_completo = ?, dni_cuil = ?, alias_para_cobrar = ?, titular_cuenta = ? WHERE id = ?"
            ).bind(nombre_completo, dni_cuil || "", alias_para_cobrar || "", titular_cuenta || "", jugador.id).run();
            
            return new Response(JSON.stringify({ id: jugador.id, lineas_gratis: jugador.lineas_gratis_disponibles }), { status: 200 });
        }

        // Si no existe, crear
        const insert = await env.DB.prepare(
            "INSERT INTO jugadores (nombre_completo, telefono, dni_cuil, alias_para_cobrar, titular_cuenta) VALUES (?, ?, ?, ?, ?)"
        ).bind(nombre_completo, telefono, dni_cuil || "", alias_para_cobrar || "", titular_cuenta || "").run();

        return new Response(JSON.stringify({ id: insert.meta.last_row_id, lineas_gratis: 0 }), { status: 201 });
    } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500 });
    }
}

export async function onRequestGet({ request, env }) {
    try {
        const url = new URL(request.url);
        const telefono = url.searchParams.get('telefono');

        if (!telefono) {
            return new Response(JSON.stringify({ error: "Teléfono requerido" }), { status: 400 });
        }

        const { results } = await env.DB.prepare(
            "SELECT * FROM jugadores WHERE telefono = ?"
        ).bind(telefono).all();

        if (results && results.length > 0) {
            return new Response(JSON.stringify(results[0]), { status: 200 });
        } else {
            return new Response(JSON.stringify({ found: false }), { status: 404 });
        }
    } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500 });
    }
}
