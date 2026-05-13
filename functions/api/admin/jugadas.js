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

        const body = await request.json();
        const { id, pagada, numeros_elegidos, es_mensual } = body;

        if (es_mensual !== undefined) {
            await env.DB.prepare(
                "UPDATE jugadas SET es_mensual = ?, pagada = 1 WHERE id = ?"
            ).bind(es_mensual ? 1 : 0, id).run();
        } else if (numeros_elegidos !== undefined) {
            // Actualizar números y recalculamos aciertos
            // 1. Obtener sorteo_id de la jugada
            const jugada = await env.DB.prepare("SELECT sorteo_id FROM jugadas WHERE id = ?").bind(id).first();
            
            if (jugada) {
                // 2. Obtener todos los resultados ganadores de ese sorteo
                const { results: resultados } = await env.DB.prepare(
                    "SELECT numeros_ganadores_dia FROM sorteos_diarios WHERE sorteo_id = ?"
                ).bind(jugada.sorteo_id).all();

                let todos_ganadores = new Set();
                resultados.forEach(r => {
                    r.numeros_ganadores_dia.split(",").forEach(n => todos_ganadores.add(n.trim()));
                });

                // 3. Calcular nuevos aciertos
                let elegidos = numeros_elegidos.split(",");
                let aciertos = 0;
                elegidos.forEach(n => {
                    if (todos_ganadores.has(n.trim())) aciertos++;
                });

                await env.DB.prepare(
                    "UPDATE jugadas SET numeros_elegidos = ?, aciertos_actuales = ? WHERE id = ?"
                ).bind(numeros_elegidos, aciertos, id).run();
            }
        } else if (pagada !== undefined) {
            await env.DB.prepare(
                "UPDATE jugadas SET pagada = ? WHERE id = ?"
            ).bind(pagada ? 1 : 0, id).run();
        }

        await env.DB.prepare("INSERT INTO auditoria (tabla, accion, registro_id, detalles, admin_usuario) VALUES (?, ?, ?, ?, ?)").bind('jugadas', 'UPDATE', id, JSON.stringify(body), 'admin').run();

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
        const { jugador_id, sorteo_id, numeros_elegidos, pagada, es_mensual } = body;

        const result = await env.DB.prepare(`
            INSERT INTO jugadas (jugador_id, sorteo_id, numeros_elegidos, pagada, es_mensual)
            VALUES (?, ?, ?, ?, ?)
        `).bind(jugador_id, sorteo_id, numeros_elegidos, pagada ? 1 : 0, es_mensual ? 1 : 0).run();

        const newId = result.meta.last_row_id;
        await env.DB.prepare("INSERT INTO auditoria (tabla, accion, registro_id, detalles, admin_usuario) VALUES (?, ?, ?, ?, ?)").bind('jugadas', 'INSERT', newId, JSON.stringify(body), 'admin').run();

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

        await env.DB.prepare("DELETE FROM jugadas WHERE id = ?").bind(id).run();
        await env.DB.prepare("INSERT INTO auditoria (tabla, accion, registro_id, detalles, admin_usuario) VALUES (?, ?, ?, ?, ?)").bind('jugadas', 'DELETE', id, JSON.stringify({id}), 'admin').run();

        return new Response(JSON.stringify({ success: true }), { status: 200 });
    } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500 });
    }
}
