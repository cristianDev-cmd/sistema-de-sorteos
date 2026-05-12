export async function onRequestGet({ request, env }) {
    try {
        const auth = request.headers.get("Authorization");
        if (!auth) return new Response("No autorizado", { status: 401 });

        const { results } = await env.DB.prepare(
            "SELECT * FROM jugadores ORDER BY id DESC"
        ).all();

        return new Response(JSON.stringify(results || []), { status: 200 });
    } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500 });
    }
}

export async function onRequestPut({ request, env }) {
    try {
        const auth = request.headers.get("Authorization");
        if (!auth) return new Response("No autorizado", { status: 401 });

        const body = await request.json();
        const { id, nombre_completo, telefono, dni_cuil, alias_para_cobrar, titular_cuenta, lineas_gratis_disponibles } = body;

        await env.DB.prepare(`
            UPDATE jugadores 
            SET nombre_completo = ?, telefono = ?, dni_cuil = ?, alias_para_cobrar = ?, titular_cuenta = ?, lineas_gratis_disponibles = ?
            WHERE id = ?
        `).bind(
            nombre_completo, 
            telefono, 
            dni_cuil || "", 
            alias_para_cobrar || "", 
            titular_cuenta || "", 
            lineas_gratis_disponibles || 0,
            id
        ).run();

        return new Response(JSON.stringify({ success: true }), { status: 200 });
    } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500 });
    }
}
