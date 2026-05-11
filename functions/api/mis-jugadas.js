export async function onRequestGet({ request, env }) {
    try {
        const url = new URL(request.url);
        const telefono = url.searchParams.get("telefono");

        if (!telefono) {
            return new Response(JSON.stringify({ error: "Teléfono requerido" }), { status: 400 });
        }

        const { results: jugadores } = await env.DB.prepare(
            "SELECT id, nombre_completo, lineas_gratis_disponibles FROM jugadores WHERE telefono = ?"
        ).bind(telefono).all();

        if (!jugadores || jugadores.length === 0) {
            return new Response(JSON.stringify({ error: "Jugador no encontrado" }), { status: 404 });
        }

        const jugador = jugadores[0];

        // Obtener sorteo activo
        const { results: sorteos } = await env.DB.prepare(
            "SELECT id, nombre_referencia FROM sorteos WHERE estado = 'Abierto' ORDER BY id DESC LIMIT 1"
        ).all();

        let sorteo_activo_id = null;
        let resultados_semana = [];
        if (sorteos && sorteos.length > 0) {
            sorteo_activo_id = sorteos[0].id;
            
            // Obtener resultados de la semana
            const { results: sorteos_diarios } = await env.DB.prepare(
                "SELECT numeros_ganadores_dia FROM sorteos_diarios WHERE sorteo_id = ?"
            ).bind(sorteo_activo_id).all();
            
            if (sorteos_diarios) {
                sorteos_diarios.forEach(sd => {
                    if(sd.numeros_ganadores_dia) {
                        resultados_semana.push(...sd.numeros_ganadores_dia.split(","));
                    }
                });
            }
        }

        // Obtener jugadas activas del jugador
        const { results: jugadas } = await env.DB.prepare(
            "SELECT id, numeros_elegidos, pagada, es_linea_gratis, aciertos_actuales FROM jugadas WHERE jugador_id = ? AND sorteo_id = ?"
        ).bind(jugador.id, sorteo_activo_id).all();

        return new Response(JSON.stringify({
            jugador,
            jugadas: jugadas || [],
            numeros_salidos: resultados_semana
        }), { status: 200 });
    } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500 });
    }
}
