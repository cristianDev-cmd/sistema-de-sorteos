export async function onRequestPost({ request, env }) {
    try {
        const auth = request.headers.get("Authorization");
        if (!auth) return new Response("No autorizado", { status: 401 });

        const body = await request.json();
        const { numeros_ganadores_dia, dia_semana } = body;

        // Obtener sorteo abierto
        const { results: sorteos } = await env.DB.prepare(
            "SELECT id FROM sorteos WHERE estado = 'Abierto' ORDER BY id DESC LIMIT 1"
        ).all();

        if (!sorteos || sorteos.length === 0) {
            return new Response(JSON.stringify({ error: "No hay sorteo abierto" }), { status: 400 });
        }
        const sorteo_id = sorteos[0].id;
        const fecha_dia = new Date().toISOString().split('T')[0];

        // Insertar resultado diario
        await env.DB.prepare(
            "INSERT INTO sorteos_diarios (sorteo_id, dia_semana, fecha_dia, numeros_ganadores_dia) VALUES (?, ?, ?, ?)"
        ).bind(sorteo_id, dia_semana, fecha_dia, numeros_ganadores_dia).run();

        // Recalcular aciertos de todas las jugadas activas
        // 1. Obtener todos los resultados del sorteo
        const { results: resultados } = await env.DB.prepare(
            "SELECT numeros_ganadores_dia FROM sorteos_diarios WHERE sorteo_id = ?"
        ).bind(sorteo_id).all();

        let todos_ganadores = new Set();
        resultados.forEach(r => {
            r.numeros_ganadores_dia.split(",").forEach(n => todos_ganadores.add(n.trim()));
        });

        // 2. Obtener jugadas activas
        const { results: jugadas } = await env.DB.prepare(
            "SELECT id, numeros_elegidos FROM jugadas WHERE sorteo_id = ?"
        ).bind(sorteo_id).all();

        // 3. Actualizar aciertos
        for (const jugada of jugadas) {
            let elegidos = jugada.numeros_elegidos.split(",");
            let aciertos = 0;
            elegidos.forEach(n => {
                if (todos_ganadores.has(n.trim())) aciertos++;
            });

            await env.DB.prepare(
                "UPDATE jugadas SET aciertos_actuales = ? WHERE id = ?"
            ).bind(aciertos, jugada.id).run();
            
            // Lógica de premios automatizada:
            // Si aciertos >= 8, ganar una línea gratis para la próxima semana
            if (aciertos >= 8) {
                // Obtenemos el jugador_id de la jugada
                const jData = await env.DB.prepare("SELECT jugador_id FROM jugadas WHERE id = ?").bind(jugada.id).first();
                if (jData) {
                    await env.DB.prepare(
                        "UPDATE jugadores SET lineas_gratis_disponibles = lineas_gratis_disponibles + 1 WHERE id = ?"
                    ).bind(jData.jugador_id).run();
                }
            }
        }

        return new Response(JSON.stringify({ success: true }), { status: 201 });
    } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500 });
    }
}
