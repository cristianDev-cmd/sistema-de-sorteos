// Purga de sorteos antiguos - elimina N sorteos más viejos y sus datos vinculados
export async function onRequestPost({ request, env }) {
    try {
        const auth = request.headers.get("Authorization");
        if (!auth) return new Response("No autorizado", { status: 401 });

        const { mantener_ultimos } = await request.json();
        const mantener = parseInt(mantener_ultimos);

        if (!mantener || mantener < 1) {
            return new Response(JSON.stringify({ error: "Debe especificar al menos 1 sorteo a mantener." }), { status: 400 });
        }

        // 1. Obtener IDs de los N sorteos más recientes (a mantener)
        const { results: recientes } = await env.DB.prepare(
            "SELECT id FROM sorteos ORDER BY id DESC LIMIT ?"
        ).bind(mantener).all();

        if (recientes.length === 0) {
            return new Response(JSON.stringify({ success: true, message: "No hay sorteos para purgar.", eliminados: 0 }), { status: 200 });
        }

        const idsAMantener = recientes.map(s => s.id);
        const placeholders = idsAMantener.map(() => '?').join(',');

        // 2. Buscar sorteos que se van a borrar
        const { results: sorteosBorrar } = await env.DB.prepare(
            `SELECT id FROM sorteos WHERE id NOT IN (${placeholders})`
        ).bind(...idsAMantener).all();

        if (sorteosBorrar.length === 0) {
            return new Response(JSON.stringify({ success: true, message: "No hay sorteos antiguos que purgar.", eliminados: 0 }), { status: 200 });
        }

        const idsBorrar = sorteosBorrar.map(s => s.id);
        const placeholders2 = idsBorrar.map(() => '?').join(',');

        // 3. Borrar datos vinculados en orden (jugadas, resultados, pozos, luego sorteos)
        await env.DB.prepare(`DELETE FROM jugadas WHERE sorteo_id IN (${placeholders2})`).bind(...idsBorrar).run();
        await env.DB.prepare(`DELETE FROM sorteos_diarios WHERE sorteo_id IN (${placeholders2})`).bind(...idsBorrar).run();
        await env.DB.prepare(`DELETE FROM pozos WHERE sorteo_id IN (${placeholders2})`).bind(...idsBorrar).run();
        await env.DB.prepare(`DELETE FROM sorteos WHERE id IN (${placeholders2})`).bind(...idsBorrar).run();

        // 4. Auditar la purga
        await env.DB.prepare(
            "INSERT INTO auditoria (tabla, accion, registro_id, detalles) VALUES ('sorteos', 'DELETE', 0, ?)"
        ).bind(JSON.stringify({ 
            accion: 'PURGA_MASIVA', 
            sorteos_eliminados: idsBorrar,
            sorteos_mantenidos: idsAMantener 
        })).run();

        return new Response(JSON.stringify({ 
            success: true, 
            message: `Purga completada. ${idsBorrar.length} sorteo(s) y todos sus datos vinculados fueron eliminados.`,
            eliminados: idsBorrar.length
        }), { status: 200 });

    } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500 });
    }
}
