export async function onRequestGet({ request, env }) {
    try {
        const auth = request.headers.get("Authorization");
        if (!auth) return new Response("No autorizado", { status: 401 });

        const { results } = await env.DB.prepare(
            "SELECT * FROM sorteos ORDER BY id DESC"
        ).all();

        return new Response(JSON.stringify(results || []), { status: 200 });
    } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500 });
    }
}

export async function onRequestPost({ request, env }) {
    try {
        const auth = request.headers.get("Authorization");
        if (!auth) return new Response("No autorizado", { status: 401 });

        const { action, id } = await request.json();

        if (action === "cerrar") {
            const fecha_fin = new Date().toISOString();
            await env.DB.prepare(
                "UPDATE sorteos SET estado = 'Cerrado', fecha_fin = ? WHERE id = ?"
            ).bind(fecha_fin, id).run();
        } else if (action === "crear") {
            const { nombre_referencia } = await request.json();
            await env.DB.prepare(
                "INSERT INTO sorteos (nombre_referencia) VALUES (?)"
            ).bind(nombre_referencia).run();
        }

        return new Response(JSON.stringify({ success: true }), { status: 200 });
    } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500 });
    }
}
