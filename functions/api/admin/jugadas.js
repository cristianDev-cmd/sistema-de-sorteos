export async function onRequestGet({ request, env }) {
    try {
        const auth = request.headers.get("Authorization");
        if (!auth) return new Response("No autorizado", { status: 401 });

        const url = new URL(request.url);
        const sorteoId = url.searchParams.get('sorteo_id');
        
        let query = `
            SELECT j.id, ju.nombre_completo, ju.telefono, s.nombre_referencia, j.numeros_elegidos, j.pagada, j.es_linea_gratis, j.aciertos_actuales
            FROM jugadas j
            JOIN jugadores ju ON j.jugador_id = ju.id
            JOIN sorteos s ON j.sorteo_id = s.id
        `;
        let results;

        if (sorteoId) {
            query += " WHERE j.sorteo_id = ? ORDER BY j.id DESC";
            const stmt = await env.DB.prepare(query).bind(sorteoId);
            results = (await stmt.all()).results;
        } else {
            query += " ORDER BY j.id DESC";
            const stmt = await env.DB.prepare(query);
            results = (await stmt.all()).results;
        }

        return new Response(JSON.stringify(results || []), { status: 200 });
    } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500 });
    }
}

export async function onRequestPut({ request, env }) {
    try {
        const auth = request.headers.get("Authorization");
        if (!auth) return new Response("No autorizado", { status: 401 });

        const { id, pagada } = await request.json();

        await env.DB.prepare(
            "UPDATE jugadas SET pagada = ? WHERE id = ?"
        ).bind(pagada ? 1 : 0, id).run();

        return new Response(JSON.stringify({ success: true }), { status: 200 });
    } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500 });
    }
}
