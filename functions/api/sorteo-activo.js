export async function onRequestGet({ request, env }) {
    try {
        const { results } = await env.DB.prepare(
            "SELECT id, nombre_referencia, estado FROM sorteos WHERE estado = 'Abierto' AND recibiendo_jugadas = 1 ORDER BY id DESC LIMIT 1"
        ).all();

        if (results && results.length > 0) {
            return new Response(JSON.stringify(results[0]), { status: 200, headers: { "Content-Type": "application/json" } });
        } else {
            return new Response(JSON.stringify({ activo: false }), { status: 200, headers: { "Content-Type": "application/json" } });
        }
    } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500 });
    }
}
