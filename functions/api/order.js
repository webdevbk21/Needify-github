export async function onRequestPost(context) {
    const { request, env } = context;

    try {
        const data = await request.json();
        const { type, details, contact } = data;

        if (!type || !details || !contact) {
            return new Response("Missing required fields", { status: 400 });
        }

        // Insert into D1
        // Note: env.DB must match the binding name you set in Cloudflare Dashboard
        const info = await env.DB.prepare(
            "INSERT INTO orders (type, details, contact) VALUES (?, ?, ?)"
        )
        .bind(type, details, contact)
        .run();

        return new Response(JSON.stringify({ success: true, id: info.lastRowId }), {
            headers: { "Content-Type": "application/json" },
        });
    } catch (err) {
        return new Response("Error: " + err.message, { status: 500 });
    }
}
