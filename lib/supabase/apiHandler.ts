import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createAdminClient } from "./server";

export async function withAdminAuth(handler: (supabase: any, body?: any) => Promise<any>) {
  return async (req: Request) => {
    try {
      // 1. Check Cookie Auth
      const cookieStore = await cookies();
      const isAdmin = cookieStore.get("oxy_admin")?.value === "1";

      if (!isAdmin) {
        return NextResponse.json({ error: "Unauthorized access" }, { status: 401 });
      }

      // 2. Initialize the Secure Admin Client
      const supabase = await createAdminClient();

      // 3. Parse body if it's a mutation (POST/PATCH/PUT)
      let body = null;
      if (req.method !== "GET" && req.method !== "DELETE") {
        body = await req.json();
      }

      // 4. Run the actual logic
      const result = await handler(supabase, body);
      return NextResponse.json(result);

    } catch (err: any) {
      console.error("API Error:", err);
      return NextResponse.json({ error: err.message || "Server Error" }, { status: 500 });
    }
  };
}