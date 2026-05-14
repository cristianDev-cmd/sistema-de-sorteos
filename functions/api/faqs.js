// Public endpoint: returns FAQs ordered by priority
export async function onRequestGet({ env }) {
    try {
        const { results } = await env.DB.prepare(
            "SELECT id, pregunta, respuesta FROM faqs ORDER BY orden ASC, id ASC"
        ).all();
        return new Response(JSON.stringify(results || []), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500 });
    }
}
