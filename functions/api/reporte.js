export async function onRequestGet({ request, env }) {
    try {
        const url = new URL(request.url);
        let sorteoId = url.searchParams.get('sorteo_id');
        let sorteoInfo;

        if (sorteoId) {
            const { results } = await env.DB.prepare("SELECT id, nombre_referencia, pozo_semana, pozo_consuelo, pozo_saladito FROM sorteos WHERE id = ?").bind(sorteoId).all();
            if (results.length > 0) sorteoInfo = results[0];
        } else {
            const { results } = await env.DB.prepare("SELECT id, nombre_referencia, pozo_semana, pozo_consuelo, pozo_saladito FROM sorteos ORDER BY id DESC LIMIT 1").all();
            if (results.length > 0) sorteoInfo = results[0];
        }

        if (!sorteoInfo) {
            return new Response(JSON.stringify({ error: "No hay sorteos disponibles" }), { status: 404 });
        }

        sorteoId = sorteoInfo.id;

        // Fetch Resultados
        const { results: resultados_diarios } = await env.DB.prepare(
            "SELECT dia_semana, numeros_ganadores_dia FROM sorteos_diarios WHERE sorteo_id = ? ORDER BY id ASC"
        ).bind(sorteoId).all();

        // Fetch Pozos Dinámicos
        const { results: pozos } = await env.DB.prepare(
            "SELECT id, nombre, descripcion, monto_total, divisiones, monto_por_division FROM pozos WHERE sorteo_id = ? ORDER BY id ASC"
        ).bind(sorteoId).all();

        // Fetch Jugadas Pagadas
        const { results: jugadas } = await env.DB.prepare(`
            SELECT j.id, ju.nombre_completo, j.numeros_elegidos, j.aciertos_actuales
            FROM jugadas j
            JOIN jugadores ju ON j.jugador_id = ju.id
            WHERE j.sorteo_id = ? AND j.pagada = 1
            ORDER BY ju.nombre_completo ASC
        `).bind(sorteoId).all();

        return new Response(JSON.stringify({
            sorteo: sorteoInfo,
            resultados_diarios,
            pozos,
            jugadas
        }), { status: 200, headers: { "Content-Type": "application/json" } });

    } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500 });
    }
}
