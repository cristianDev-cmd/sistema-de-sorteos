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

        const body = await request.json();
        const { action, id, nombre_referencia, pozo_semana, pozo_consuelo, pozo_saladito } = body;

        if (action === "cerrar") {
            const fecha_fin = new Date().toISOString();
            await env.DB.prepare(
                "UPDATE sorteos SET estado = 'Cerrado', fecha_fin = ? WHERE id = ?"
            ).bind(fecha_fin, id).run();
        } else if (action === "crear") {
            // 1. Crear el nuevo sorteo
            const result = await env.DB.prepare(
                "INSERT INTO sorteos (nombre_referencia, pozo_semana, pozo_consuelo, pozo_saladito) VALUES (?, ?, ?, ?)"
            ).bind(nombre_referencia, pozo_semana || 0, pozo_consuelo || 0, pozo_saladito || 0).run();
            
            const nuevo_sorteo_id = result.meta.last_row_id;

            // 2. Buscar jugadas mensuales del sorteo anterior y clonarlas
            // Intentamos obtener el ID del sorteo anterior
            const anterior = await env.DB.prepare(
                "SELECT id FROM sorteos WHERE id < ? ORDER BY id DESC LIMIT 1"
            ).bind(nuevo_sorteo_id).first();

            if (anterior) {
                const { results: mensuales } = await env.DB.prepare(
                    "SELECT jugador_id, numeros_elegidos, es_mensual FROM jugadas WHERE sorteo_id = ? AND es_mensual = 1"
                ).bind(anterior.id).all();

                for (const j of mensuales) {
                    await env.DB.prepare(
                        "INSERT INTO jugadas (jugador_id, sorteo_id, numeros_elegidos, pagada, es_mensual) VALUES (?, ?, ?, 1, 1)"
                    ).bind(j.jugador_id, nuevo_sorteo_id, j.numeros_elegidos).run();
                }
            }
        } else if (action === "actualizar") {
            const { estado } = body;
            await env.DB.prepare(
                "UPDATE sorteos SET nombre_referencia = ?, pozo_semana = ?, pozo_consuelo = ?, pozo_saladito = ?, estado = ? WHERE id = ?"
            ).bind(nombre_referencia, pozo_semana, pozo_consuelo, pozo_saladito, estado, id).run();
        } else if (action === "toggle_publico") {
            const { recibiendo_jugadas } = body;
            await env.DB.prepare(
                "UPDATE sorteos SET recibiendo_jugadas = ? WHERE id = ?"
            ).bind(recibiendo_jugadas ? 1 : 0, id).run();
        }

        await env.DB.prepare("INSERT INTO auditoria (tabla, accion, registro_id, detalles, admin_usuario) VALUES (?, ?, ?, ?, ?)").bind('sorteos', action === 'crear' ? 'INSERT' : 'UPDATE', id || body.nuevo_sorteo_id || null, JSON.stringify(body), 'admin').run();

        return new Response(JSON.stringify({ success: true }), { status: 200 });
    } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500 });
    }
}

export async function onRequestDelete({ request, env }) {
    try {
        const auth = request.headers.get("Authorization");
        if (!auth) return new Response("No autorizado", { status: 401 });

        const url = new URL(request.url);
        const id = url.searchParams.get("id");

        if (!id) return new Response("ID requerido", { status: 400 });

        await env.DB.prepare("DELETE FROM sorteos WHERE id = ?").bind(id).run();
        await env.DB.prepare("INSERT INTO auditoria (tabla, accion, registro_id, detalles, admin_usuario) VALUES (?, ?, ?, ?, ?)").bind('sorteos', 'DELETE', id, JSON.stringify({id}), 'admin').run();

        return new Response(JSON.stringify({ success: true }), { status: 200 });
    } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500 });
    }
}
