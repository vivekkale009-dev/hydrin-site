import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createServerSupabaseClient() {
  const cookieStore = await cookies(); // IMPORTANT in Next.js 16

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
          cookieStore.set(name, "", {
            path: "/",
            httpOnly: true,
            maxAge: 0,
          });
        }
      }
    }
  );

  return supabase;
}
