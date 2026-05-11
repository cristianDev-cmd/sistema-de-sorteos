export async function onRequestGet({ env }) {
    try {
        const { results } = await env.DB.prepare(
            "SELECT admin_whatsapp, admin_alias, admin_titular FROM configuracion WHERE id = 1"
        ).all();
        
        if (!results || results.length === 0) {
            return new Response(JSON.stringify({ error: "Configuracion no encontrada" }), { status: 404 });
        }
        
        return new Response(JSON.stringify(results[0]), {
            headers: { "Content-Type": "application/json" }
        });
    } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500 });
    }
}
