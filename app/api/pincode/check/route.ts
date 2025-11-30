import pincodes from "@/data/pincodes.json";

type PinInfo = {
  deliverable: boolean;
  fee?: number;
};

export async function POST(req: Request) {
  try {
    const { pincode } = await req.json();
    const pin = String(pincode || "").trim();

    if (!pin || pin.length !== 6) {
      return new Response(
        JSON.stringify({ ok: false, error: "Invalid PIN" }),
        { status: 400 }
      );
    }

    const info = (pincodes as Record<string, PinInfo>)[pin];

    if (!info || !info.deliverable) {
      return new Response(JSON.stringify({ ok: false }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }

    return new Response(
      JSON.stringify({
        ok: true,
        fee: info.fee ?? 0
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("PIN check error", e);
    return new Response(
      JSON.stringify({ ok: false, error: "Server error" }),
      { status: 500 }
    );
  }
}
