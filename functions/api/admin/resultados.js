export async function onRequestGet({ request, env }) {
    try {
        const auth = request.headers.get("Authorization");
        if (!auth) return new Response("No autorizado", { status: 401 });

        const url = new URL(request.url);
        const sorteoId = url.searchParams.get('sorteo_id');
        
        let query = "SELECT sd.*, s.nombre_referencia FROM sorteos_diarios sd JOIN sorteos s ON sd.sorteo_id = s.id";
        let results;

        if (sorteoId) {
            query += " WHERE sd.sorteo_id = ? ORDER BY sd.id DESC";
            const stmt = await env.DB.prepare(query).bind(sorteoId);
            results = (await stmt.all()).results;
        } else {
            query += " ORDER BY sd.id DESC";
            const stmt = await env.DB.prepare(query);
            results = (await stmt.all()).results;
        }

        return new Response(JSON.stringify(results || []), { status: 200 });
    } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500 });
    }
}

async function recalcularAciertos(env, sorteo_id) {
    const { results: resultados } = await env.DB.prepare(
        "SELECT numeros_ganadores_dia FROM sorteos_diarios WHERE sorteo_id = ?"
    ).bind(sorteo_id).all();

    let todos_ganadores = new Set();
    resultados.forEach(r => {
        r.numeros_ganadores_dia.split(",").forEach(n => todos_ganadores.add(n.trim()));
    });

    const { results: jugadas } = await env.DB.prepare(
        "SELECT id, numeros_elegidos, aciertos_actuales FROM jugadas WHERE sorteo_id = ?"
    ).bind(sorteo_id).all();

    for (const jugada of jugadas) {
        let elegidos = jugada.numeros_elegidos.split(",");
        let aciertos = 0;
        elegidos.forEach(n => {
            if (todos_ganadores.has(n.trim())) aciertos++;
        });

        if (aciertos !== jugada.aciertos_actuales) {
            await env.DB.prepare(
                "UPDATE jugadas SET aciertos_actuales = ? WHERE id = ?"
            ).bind(aciertos, jugada.id).run();
            
            // Nota: La lógica de otorgar líneas gratis (8 aciertos) se removió de aquí.
            // Ahora se ejecuta exclusivamente al cerrar el sorteo en sorteos.js
        }
    }
}

export async function onRequestPost({ request, env }) {
    try {
        const auth = request.headers.get("Authorization");
        if (!auth) return new Response("No autorizado", { status: 401 });

        const body = await request.json();
        const { numeros_ganadores_dia, dia_semana } = body;

        let sorteo_id = body.sorteo_id;
        if (!sorteo_id) {
            const { results: sorteos } = await env.DB.prepare(
                "SELECT id FROM sorteos WHERE estado = 'Abierto' ORDER BY id DESC LIMIT 1"
            ).all();
            if (!sorteos || sorteos.length === 0) {
                return new Response(JSON.stringify({ error: "No hay sorteo abierto" }), { status: 400 });
            }
            sorteo_id = sorteos[0].id;
        }

        const fecha_dia = body.fecha_dia || new Date().toISOString().split('T')[0];

        const result = await env.DB.prepare(
            "INSERT INTO sorteos_diarios (sorteo_id, dia_semana, fecha_dia, numeros_ganadores_dia) VALUES (?, ?, ?, ?)"
        ).bind(sorteo_id, dia_semana, fecha_dia, numeros_ganadores_dia).run();

        const newId = result.meta.last_row_id;
        await env.DB.prepare("INSERT INTO auditoria (tabla, accion, registro_id, detalles, admin_usuario) VALUES (?, ?, ?, ?, ?)").bind('sorteos_diarios', 'INSERT', newId, JSON.stringify(body), 'admin').run();

        await recalcularAciertos(env, sorteo_id);

        return new Response(JSON.stringify({ success: true }), { status: 201 });
    } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500 });
    }
}

export async function onRequestPut({ request, env }) {
    try {
        const auth = request.headers.get("Authorization");
        if (!auth) return new Response("No autorizado", { status: 401 });

        const body = await request.json();
        const { id, dia_semana, fecha_dia, numeros_ganadores_dia } = body;

        const actual = await env.DB.prepare("SELECT sorteo_id FROM sorteos_diarios WHERE id = ?").bind(id).first();
        if (!actual) return new Response("No encontrado", { status: 404 });

        await env.DB.prepare(
            "UPDATE sorteos_diarios SET dia_semana = ?, fecha_dia = ?, numeros_ganadores_dia = ? WHERE id = ?"
        ).bind(dia_semana, fecha_dia, numeros_ganadores_dia, id).run();

        await env.DB.prepare("INSERT INTO auditoria (tabla, accion, registro_id, detalles, admin_usuario) VALUES (?, ?, ?, ?, ?)").bind('sorteos_diarios', 'UPDATE', id, JSON.stringify(body), 'admin').run();

        await recalcularAciertos(env, actual.sorteo_id);

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

        const actual = await env.DB.prepare("SELECT sorteo_id FROM sorteos_diarios WHERE id = ?").bind(id).first();
        if (!actual) return new Response("No encontrado", { status: 404 });

        await env.DB.prepare("DELETE FROM sorteos_diarios WHERE id = ?").bind(id).run();
        await env.DB.prepare("INSERT INTO auditoria (tabla, accion, registro_id, detalles, admin_usuario) VALUES (?, ?, ?, ?, ?)").bind('sorteos_diarios', 'DELETE', id, JSON.stringify({id}), 'admin').run();

        await recalcularAciertos(env, actual.sorteo_id);

        return new Response(JSON.stringify({ success: true }), { status: 200 });
    } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500 });
    }
}
