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
            const numeros = r.numeros_ganadores_dia.split(",");
            for (let i = 0; i < Math.min(15, numeros.length); i++) {
                let n = numeros[i].trim();
                if (n.length > 0) {
                    let decena = n.slice(-2);
                    if (!todos_ganadores.includes(decena)) {
                        todos_ganadores.push(decena);
                    }
                }
            }
        });

        return new Response(JSON.stringify(todos_ganadores), { status: 200 });
    } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500 });
    }
}
