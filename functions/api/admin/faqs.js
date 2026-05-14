// Admin CRUD for FAQs
export async function onRequestGet({ request, env }) {
    try {
        const auth = request.headers.get("Authorization");
        if (!auth) return new Response("No autorizado", { status: 401 });

        const { results } = await env.DB.prepare("SELECT * FROM faqs ORDER BY orden ASC, id ASC").all();
        return new Response(JSON.stringify(results || []), { status: 200 });
    } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500 });
    }
}

export async function onRequestPost({ request, env }) {
    try {
        const auth = request.headers.get("Authorization");
        if (!auth) return new Response("No autorizado", { status: 401 });

        const { pregunta, respuesta, orden } = await request.json();
        if (!pregunta || !respuesta) {
            return new Response(JSON.stringify({ error: "Faltan campos requeridos" }), { status: 400 });
        }

        const result = await env.DB.prepare(
            "INSERT INTO faqs (pregunta, respuesta, orden) VALUES (?, ?, ?)"
        ).bind(pregunta, respuesta, parseInt(orden) || 0).run();

        await env.DB.prepare(
            "INSERT INTO auditoria (tabla, accion, registro_id, detalles) VALUES ('faqs', 'INSERT', ?, ?)"
        ).bind(result.meta.last_row_id, JSON.stringify({ pregunta })).run();

        return new Response(JSON.stringify({ success: true, id: result.meta.last_row_id }), { status: 201 });
    } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500 });
    }
}

export async function onRequestPut({ request, env }) {
    try {
        const auth = request.headers.get("Authorization");
        if (!auth) return new Response("No autorizado", { status: 401 });

        const { id, pregunta, respuesta, orden } = await request.json();
        if (!id) return new Response(JSON.stringify({ error: "Falta el ID" }), { status: 400 });

        await env.DB.prepare(
            "UPDATE faqs SET pregunta = ?, respuesta = ?, orden = ? WHERE id = ?"
        ).bind(pregunta, respuesta, parseInt(orden) || 0, id).run();

        await env.DB.prepare(
            "INSERT INTO auditoria (tabla, accion, registro_id, detalles) VALUES ('faqs', 'UPDATE', ?, ?)"
        ).bind(id, JSON.stringify({ pregunta })).run();

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
        if (!id) return new Response(JSON.stringify({ error: "Falta el ID" }), { status: 400 });

        const faq = await env.DB.prepare("SELECT * FROM faqs WHERE id = ?").bind(id).first();

        await env.DB.prepare("DELETE FROM faqs WHERE id = ?").bind(id).run();

        await env.DB.prepare(
            "INSERT INTO auditoria (tabla, accion, registro_id, detalles) VALUES ('faqs', 'DELETE', ?, ?)"
        ).bind(id, JSON.stringify(faq)).run();

        return new Response(JSON.stringify({ success: true }), { status: 200 });
    } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500 });
    }
}
