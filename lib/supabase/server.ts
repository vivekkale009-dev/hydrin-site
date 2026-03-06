import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

// Keep this one as is
export async function createServerSupabaseClient() {
  const cookieStore = await cookies(); 
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name: string) => cookieStore.get(name)?.value,
        set: (name: string, value: string) => {
          cookieStore.set(name, value, { path: "/", httpOnly: true });
        },
        remove: (name: string) => {
          cookieStore.set(name, "", { path: "/", httpOnly: true, maxAge: 0 });
        }
      }
    }
  );
  return supabase;
}

// DELETE THE TWO OLD VERSIONS AND REPLACE WITH THIS SINGLE ONE:
export async function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      global: {
        headers: {
          'Cache-Control': 'no-store, max-age=0',
        },
      },
    }
  );
}