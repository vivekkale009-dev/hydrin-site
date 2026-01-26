import QRCode from "qrcode";
import { createClient } from "@supabase/supabase-js";
import { notFound } from "next/navigation";

export default async function DistributorQRPage({ params }: { params: { id: string } }) {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  
  const { data: order } = await supabase.from("orders").select("uorn, exit_confirmed_at").eq("id", params.id).single();

  if (!order) return notFound();

  // If already exited, show a "Completed" screen instead of a QR
  if (order.exit_confirmed_at) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', fontFamily: 'sans-serif' }}>
        <div style={{ fontSize: '60px' }}>🚛</div>
        <h1 style={{ color: '#2c3e50' }}>EXIT COMPLETED</h1>
        <p>This pass was used on {new Date(order.exit_confirmed_at).toLocaleString()}</p>
      </div>
    );
  }

  // Points to the internal verification page that your team scans
  const origin = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const verifyUrl = `${origin}/verify-gp/${params.id}`;
  const qrDataUrl = await QRCode.toDataURL(verifyUrl, { width: 600, margin: 2 });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', backgroundColor: '#fff', textAlign: 'center', fontFamily: 'sans-serif' }}>
      <h2 style={{ color: '#333' }}>EARTHY SOURCE</h2>
      <p style={{ color: '#666' }}>Pass for: <b>{order.uorn}</b></p>
      <img src={qrDataUrl} alt="QR Code" style={{ width: '80%', maxWidth: '350px', border: '1px solid #eee' }} />
      <p style={{ marginTop: '20px', color: '#e67e22', fontWeight: 'bold' }}>SHOW THIS TO SECURITY OFFICER</p>
    </div>
  );
}