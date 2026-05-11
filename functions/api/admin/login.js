export async function onRequestPost({ request, env }) {
    try {
        const { username, password } = await request.json();

        const { results } = await env.DB.prepare(
            "SELECT id FROM configuracion WHERE admin_user = ? AND admin_password = ?"
        ).bind(username, password).all();

        if (results && results.length > 0) {
            // Un token muy simple para esta versión
            const token = btoa(username + ":" + password); 
            return new Response(JSON.stringify({ success: true, token }), { status: 200 });
        } else {
            return new Response(JSON.stringify({ error: "Credenciales inválidas" }), { status: 401 });
        }
    } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500 });
    }
}
