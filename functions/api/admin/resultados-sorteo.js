export async function onRequestGet({ request, env }) {
    try {
        const auth = request.headers.get("Authorization");
        if (!auth) return new Response("No autorizado", { status: 401 });

        const url = new URL(request.url);
        const sorteoId = url.searchParams.get('sorteo_id');

        if (!sorteoId) {
            return new Response(JSON.stringify({ error: "sorteo_id es requerido" }), { status: 400 });
        }

        const { results } = await env.DB.prepare(
            "SELECT numeros_ganadores_dia FROM sorteos_diarios WHERE sorteo_id = ?"
        ).bind(sorteoId).all();

        let todos_ganadores = [];
        results.forEach(r => {
            r.numeros_ganadores_dia.split(",").forEach(n => {
                const trimmed = n.trim();
                if (trimmed && !todos_ganadores.includes(trimmed)) {
                    todos_ganadores.push(trimmed);
                }
            });
        });

        return new Response(JSON.stringify(todos_ganadores), { status: 200 });
    } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500 });
    }
}
