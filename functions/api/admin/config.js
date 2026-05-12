export async function onRequestPut({ request, env }) {
    try {
        const auth = request.headers.get("Authorization");
        if (!auth) return new Response("No autorizado", { status: 401 });

        const body = await request.json();
        const { admin_whatsapp, admin_alias, admin_titular, admin_user, admin_password, precio_linea } = body;

        await env.DB.prepare(
            "UPDATE configuracion SET admin_whatsapp = ?, admin_alias = ?, admin_titular = ?, admin_user = ?, admin_password = ?, precio_linea = ? WHERE id = 1"
        ).bind(admin_whatsapp, admin_alias, admin_titular, admin_user, admin_password, precio_linea).run();

        return new Response(JSON.stringify({ success: true }), { status: 200 });
    } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500 });
    }
}
