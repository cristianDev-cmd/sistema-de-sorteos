export async function onRequestPost({ request, env }) {
    try {
        const auth = request.headers.get("Authorization");
        if (!auth) return new Response("No autorizado", { status: 401 });

        const body = await request.json();
        const { numeros_ganadores_dia } = body; // ej: "12,34,55"

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
            "INSERT INTO sorteos_diarios (sorteo_id, fecha_dia, numeros_ganadores_dia) VALUES (?, ?, ?)"
        ).bind(sorteo_id, fecha_dia, numeros_ganadores_dia).run();

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
            
            // Lógica de premios automatizada (opcional):
            // Si aciertos == 8, dar 1 linea gratis
            if (aciertos >= 8) {
                // Verificar si ya le dimos la linea gratis? Para la simplificación, 
                // el superadmin las gestionará si es necesario, o lo hacemos aquí:
                // Requiere saber el jugador_id y no dar múltiples veces si se mantiene en 8.
                // Lo dejaremos para que el admin lo vea en la grilla y asigne, o lo agregamos después.
            }
        }

        return new Response(JSON.stringify({ success: true }), { status: 201 });
    } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500 });
    }
}
