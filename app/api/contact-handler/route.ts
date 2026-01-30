import { NextResponse } from "next/server";

// Handles contact form (email + google sheets)
export async function POST(request: Request) {
  try {
    const data = await request.json();

    const { name, phone, email, category, message } = data;

    if (!name || !phone || !email || !category) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    // ───────────────────────────────────────
    // 1️⃣ SEND EMAIL FOR COMPLAINTS
    // ───────────────────────────────────────

    if (category === "Complaint") {
      const apiRes = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/send-email`, {
        method: "POST",
        body: JSON.stringify(data),
      });

      if (!apiRes.ok) throw new Error("Email sending failed");
    }

    // ───────────────────────────────────────
    // 2️⃣ SAVE TO GOOGLE SHEET FOR OTHERS
    // ───────────────────────────────────────

    if (category !== "Complaint") {
      const sheetRes = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/save-to-sheet`, {
        method: "POST",
        body: JSON.stringify(data),
      });

      if (!sheetRes.ok) throw new Error("Sheet saving failed");
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Server error" },
      { status: 500 }
    );
  }
}