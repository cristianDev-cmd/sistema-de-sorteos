export async function onRequestGet({ request, env }) {
    try {
        const auth = request.headers.get("Authorization");
        if (!auth) return new Response("No autorizado", { status: 401 });

        const url = new URL(request.url);
        const sorteo_id = url.searchParams.get("sorteo_id");

        let query = "SELECT * FROM pozos ORDER BY id ASC";
        let result;
        if (sorteo_id) {
            result = await env.DB.prepare("SELECT * FROM pozos WHERE sorteo_id = ? ORDER BY id ASC").bind(sorteo_id).all();
        } else {
            result = await env.DB.prepare(query).all();
        }

        return new Response(JSON.stringify(result.results || []), { status: 200 });
    } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500 });
    }
}

export async function onRequestPost({ request, env }) {
    try {
        const auth = request.headers.get("Authorization");
        if (!auth) return new Response("No autorizado", { status: 401 });

        const { sorteo_id, nombre, descripcion, monto_total, divisiones } = await request.json();

        if (!sorteo_id || !nombre || !monto_total) {
            return new Response(JSON.stringify({ error: "Faltan campos requeridos" }), { status: 400 });
        }

        const divs = parseInt(divisiones) || 1;
        const monto_por_division = parseFloat(monto_total) / divs;

        const result = await env.DB.prepare(
            "INSERT INTO pozos (sorteo_id, nombre, descripcion, monto_total, divisiones, monto_por_division) VALUES (?, ?, ?, ?, ?, ?)"
        ).bind(sorteo_id, nombre, descripcion || '', parseFloat(monto_total), divs, monto_por_division).run();

        await env.DB.prepare(
            "INSERT INTO auditoria (tabla, accion, registro_id, detalles) VALUES ('pozos', 'INSERT', ?, ?)"
        ).bind(result.meta.last_row_id, JSON.stringify({ sorteo_id, nombre, monto_total })).run();

        return new Response(JSON.stringify({ success: true, id: result.meta.last_row_id }), { status: 201 });
    } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500 });
    }
}

export async function onRequestPut({ request, env }) {
    try {
        const auth = request.headers.get("Authorization");
        if (!auth) return new Response("No autorizado", { status: 401 });

        const { id, nombre, descripcion, monto_total, divisiones } = await request.json();

        if (!id) return new Response(JSON.stringify({ error: "Falta el ID" }), { status: 400 });

        const divs = parseInt(divisiones) || 1;
        const monto_por_division = parseFloat(monto_total) / divs;

        await env.DB.prepare(
            "UPDATE pozos SET nombre = ?, descripcion = ?, monto_total = ?, divisiones = ?, monto_por_division = ? WHERE id = ?"
        ).bind(nombre, descripcion || '', parseFloat(monto_total), divs, monto_por_division, id).run();

        await env.DB.prepare(
            "INSERT INTO auditoria (tabla, accion, registro_id, detalles) VALUES ('pozos', 'UPDATE', ?, ?)"
        ).bind(id, JSON.stringify({ nombre, monto_total, divisiones })).run();

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

        const pozo = await env.DB.prepare("SELECT * FROM pozos WHERE id = ?").bind(id).first();

        await env.DB.prepare("DELETE FROM pozos WHERE id = ?").bind(id).run();

        await env.DB.prepare(
            "INSERT INTO auditoria (tabla, accion, registro_id, detalles) VALUES ('pozos', 'DELETE', ?, ?)"
        ).bind(id, JSON.stringify(pozo)).run();

        return new Response(JSON.stringify({ success: true }), { status: 200 });
    } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500 });
    }
}
