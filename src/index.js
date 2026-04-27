/**
 * NEEDIFY BACKEND - ORDER PROCESSING
 * Handles: Order submission, retrieval, and storage in D1
 */

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const method = request.method;

    // CORS headers
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS, PATCH",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    if (method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    const db = env.DB;

    // Initialize database table
    try {
      await db.prepare(
        `CREATE TABLE IF NOT EXISTS orders (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          order_type TEXT NOT NULL,
          message TEXT NOT NULL,
          phone_number TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          status TEXT DEFAULT 'pending'
        )`
      ).run();
    } catch (e) {
      console.log("Table already exists");
    }

    // ROUTE 1: GET /api/orders - Retrieve all orders
    if (url.pathname === "/api/orders" && method === "GET") {
      const result = await db.prepare(
        "SELECT * FROM orders ORDER BY created_at DESC"
      ).all();
      
      return new Response(JSON.stringify(result.results || []), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ROUTE 2: POST /api/orders - Submit a new order
    if (url.pathname === "/api/orders" && method === "POST") {
      const body = await request.json();
      const { order_type, message, phone_number } = body;

      // Validation
      if (!order_type || !message || !phone_number) {
        return new Response(
          JSON.stringify({ error: "All fields required" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      // Validate order_type
      if (order_type !== "xerox" && order_type !== "print") {
        return new Response(
          JSON.stringify({ error: "Invalid order type" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      // Validate phone number (basic check for Indian numbers)
      const phoneRegex = /^[+]?[0-9]{10,13}$/;
      if (!phoneRegex.test(phone_number.replace(/\s+/g, ""))) {
        return new Response(
          JSON.stringify({ error: "Invalid phone number" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      // Insert into database
      const result = await db
        .prepare(
          `INSERT INTO orders (order_type, message, phone_number) 
           VALUES (?, ?, ?) 
           RETURNING *`
        )
        .bind(order_type, message, phone_number)
        .first();

      return new Response(JSON.stringify(result), {
        status: 201,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ROUTE 3: PATCH /api/orders/:id - Update order status (for dashboard later)
    if (url.pathname.startsWith("/api/orders/") && method === "PATCH") {
      const id = url.pathname.split("/").pop();
      const body = await request.json();
      const { status } = body;

      if (!status) {
        return new Response(
          JSON.stringify({ error: "Status required" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      const result = await db
        .prepare(
          "UPDATE orders SET status = ? WHERE id = ? RETURNING *"
        )
        .bind(status, id)
        .first();

      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 404
    return new Response(JSON.stringify({ error: "Not found" }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  },
};
