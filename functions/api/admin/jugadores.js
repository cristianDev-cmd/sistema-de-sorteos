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
            nombre_completo, telefono, dni_cuil || "", alias_para_cobrar || "", titular_cuenta || "", lineas_gratis_disponibles || 0, id
        ).run();

        await env.DB.prepare("INSERT INTO auditoria (tabla, accion, registro_id, detalles, admin_usuario) VALUES (?, ?, ?, ?, ?)").bind('jugadores', 'UPDATE', id, JSON.stringify(body), 'admin').run();

        return new Response(JSON.stringify({ success: true }), { status: 200 });
    } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500 });
    }
}

export async function onRequestPost({ request, env }) {
    try {
        const auth = request.headers.get("Authorization");
        if (!auth) return new Response("No autorizado", { status: 401 });

        const body = await request.json();
        const { nombre_completo, telefono, dni_cuil, alias_para_cobrar, titular_cuenta, lineas_gratis_disponibles } = body;

        const result = await env.DB.prepare(`
            INSERT INTO jugadores (nombre_completo, telefono, dni_cuil, alias_para_cobrar, titular_cuenta, lineas_gratis_disponibles)
            VALUES (?, ?, ?, ?, ?, ?)
        `).bind(nombre_completo, telefono, dni_cuil || "", alias_para_cobrar || "", titular_cuenta || "", lineas_gratis_disponibles || 0).run();

        const newId = result.meta.last_row_id;
        await env.DB.prepare("INSERT INTO auditoria (tabla, accion, registro_id, detalles, admin_usuario) VALUES (?, ?, ?, ?, ?)").bind('jugadores', 'INSERT', newId, JSON.stringify(body), 'admin').run();

        return new Response(JSON.stringify({ success: true, id: newId }), { status: 201 });
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

        await env.DB.prepare("DELETE FROM jugadores WHERE id = ?").bind(id).run();
        await env.DB.prepare("INSERT INTO auditoria (tabla, accion, registro_id, detalles, admin_usuario) VALUES (?, ?, ?, ?, ?)").bind('jugadores', 'DELETE', id, JSON.stringify({id}), 'admin').run();

        return new Response(JSON.stringify({ success: true }), { status: 200 });
    } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500 });
    }
}
