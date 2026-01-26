import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: Request) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const form = await req.formData();
  const file = form.get("file") as File;

  if (!file) {
    return NextResponse.json({ url: null });
  }

  const fileExt = file.name.split(".").pop();
  const fileName = `payment_proofs/${Date.now()}.${fileExt}`;

  const { data, error } = await supabase.storage
    .from("public")
    .upload(fileName, file, { upsert: false });

  if (error) {
    console.error(error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }

  const publicUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/public/${fileName}`;

  return NextResponse.json({ url: publicUrl });
}
