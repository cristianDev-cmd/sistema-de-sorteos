export async function onRequestGet({ request, env }) {
    try {
        const { results } = await env.DB.prepare(
            "SELECT id, nombre_referencia FROM sorteos ORDER BY id DESC"
        ).all();

        return new Response(JSON.stringify(results), {
            headers: { "Content-Type": "application/json" }
        });
    } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500 });
    }
}
