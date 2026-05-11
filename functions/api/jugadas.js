export async function onRequestPost({ request, env }) {
    try {
        const body = await request.json();
        const { jugador_id, lineas } = body; // lineas es un array de strings: ["01,02,03...","..."]

        if (!jugador_id || !lineas || lineas.length === 0) {
            return new Response(JSON.stringify({ error: "Faltan datos" }), { status: 400 });
        }

        // Obtener el sorteo abierto
        const { results: sorteos } = await env.DB.prepare(
            "SELECT id FROM sorteos WHERE estado = 'Abierto' ORDER BY id DESC LIMIT 1"
        ).all();

        let sorteo_id;
        if (!sorteos || sorteos.length === 0) {
            // Si no hay sorteo, lo creamos
            const insertSorteo = await env.DB.prepare(
                "INSERT INTO sorteos (nombre_referencia) VALUES ('Sorteo Auto-generado')"
            ).run();
            sorteo_id = insertSorteo.meta.last_row_id;
        } else {
            sorteo_id = sorteos[0].id;
        }

        // Obtener jugador para ver líneas gratis
        const { results: jugadores } = await env.DB.prepare(
            "SELECT lineas_gratis_disponibles FROM jugadores WHERE id = ?"
        ).bind(jugador_id).all();
        
        let lineas_gratis = jugadores.length > 0 ? jugadores[0].lineas_gratis_disponibles : 0;
        let ids_insertados = [];

        // Insertar cada línea
        for (const linea of lineas) {
            let usa_gratis = 0;
            if (lineas_gratis > 0) {
                usa_gratis = 1;
                lineas_gratis--;
            }
            
            const insert = await env.DB.prepare(
                "INSERT INTO jugadas (jugador_id, sorteo_id, numeros_elegidos, es_linea_gratis) VALUES (?, ?, ?, ?)"
            ).bind(jugador_id, sorteo_id, linea, usa_gratis).run();
            
            ids_insertados.push(insert.meta.last_row_id);
        }

        // Actualizar líneas gratis del jugador si usó alguna
        await env.DB.prepare(
            "UPDATE jugadores SET lineas_gratis_disponibles = ? WHERE id = ?"
        ).bind(lineas_gratis, jugador_id).run();

        return new Response(JSON.stringify({ success: true, ids: ids_insertados, sorteo_id }), { status: 201 });
    } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500 });
    }
}
