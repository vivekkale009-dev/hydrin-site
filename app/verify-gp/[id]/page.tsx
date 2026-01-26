"use client";
import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

export default function VerifyGatePass({ params }: { params: { id: string } }) {
  const [order, setOrder] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [notes, setNotes] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");
  const [timeLeft, setTimeLeft] = useState<string>("");
  const [isExpired, setIsExpired] = useState(false);

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    fetchOrderDetails();
  }, []);

  useEffect(() => {
    if (!order?.gate_pass_printed_at || !!order?.exit_confirmed_at) return;

    const interval = setInterval(() => {
      const printedTime = new Date(order.gate_pass_printed_at).getTime();
      const expiryTime = printedTime + (60 * 60 * 1000); 
      const now = new Date().getTime();
      const difference = expiryTime - now;

      if (difference <= 0) {
        setTimeLeft("EXPIRED");
        setIsExpired(true);
        clearInterval(interval);
      } else {
        const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((difference % (1000 * 60)) / 1000);
        setTimeLeft(`${minutes}m ${seconds}s`);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [order]);

  async function fetchOrderDetails() {
    const { data: o } = await supabase.from("orders").select("*").eq("id", params.id).single();
    const { data: i } = await supabase.from("order_items").select("*").eq("order_id", params.id);
    setOrder(o);
    setItems(i || []);
  }

  const totalBoxCount = items.reduce((sum, item) => sum + (Number(item.qty_boxes) || 0), 0);

  // --- UPDATED LOGIC HERE ---
  const handleConfirmExit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isExpired) return alert("Cannot confirm exit. Pass has expired!");
    
    setIsUpdating(true);
    try {
      // 1. Update Order Table
      const { error: orderError } = await supabase
        .from("orders")
        .update({
          exit_confirmed_at: new Date().toISOString(),
          exit_notes: notes,
          status: 'out_for_delivery' 
        })
        .eq("id", params.id);

      if (orderError) throw orderError;

      // 2. Log final DEDUCT and Clear Inventory Reservations
      for (const item of items) {
        if (item.product_id && item.qty_boxes) {
          
          // ADDED: Create the audit trail entry for the final deduction
          await supabase.from("inventory_movements").insert({
            product_id: item.product_id,
            order_id: params.id,
            order_number: order.uorn,
            movement_type: 'deduct', 
            qty_boxes: Number(item.qty_boxes),
            notes: `Vehicle Exit Confirmed: ${notes}`
          });

          // Clear the reservation in DB
          const { error: rpcError } = await supabase.rpc('clear_reservation', { 
            p_product_id: item.product_id, 
            p_qty: Number(item.qty_boxes) 
          });
          
          if (rpcError) console.error(`Inventory Error for ${item.product_id}:`, rpcError);
        }
      }

      setStatusMsg("SUCCESS: Exit recorded. Inventory updated.");
      await fetchOrderDetails();
    } catch (error: any) {
      alert("Error: " + error.message);
    } finally {
      setIsUpdating(false);
    }
  };

  if (!order) return <div style={{ padding: '20px' }}>Loading...</div>;

  const alreadyExited = !!order.exit_confirmed_at;

  return (
    <div style={{ fontFamily: 'sans-serif', padding: '20px', maxWidth: '500px', margin: '0 auto' }}>
      {statusMsg && (
        <div style={{ background: '#d4edda', color: '#155724', padding: '15px', borderRadius: '8px', marginBottom: '15px', fontWeight: 'bold', textAlign: 'center' }}>
          {statusMsg}
        </div>
      )}

      <div style={{ 
        textAlign: 'center', padding: '20px', borderRadius: '15px', color: '#fff',
        backgroundColor: alreadyExited ? '#6c757d' : (isExpired ? '#c53030' : '#28a745'),
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
      }}>
        <h2 style={{ margin: '0 0 10px 0' }}>
          {alreadyExited ? "VEHICLE EXITED" : (isExpired ? "PASS EXPIRED" : "GATE PASS VALID")}
        </h2>
        
        {!alreadyExited && !isExpired && (
          <div style={{ background: 'rgba(255,255,255,0.2)', padding: '10px', borderRadius: '8px', display: 'inline-block' }}>
            <span style={{ fontSize: '14px' }}>TIME REMAINING: </span>
            <b style={{ fontSize: '20px', letterSpacing: '1px' }}>{timeLeft}</b>
          </div>
        )}
        
        <p style={{ marginTop: '10px', opacity: 0.9 }}>{order.uorn} | {order.vehicle_number}</p>
      </div>

      <div style={{ 
        marginTop: '20px', background: '#eef2ff', padding: '20px', borderRadius: '12px', 
        border: '2px solid #4f46e5', textAlign: 'center' 
      }}>
        <p style={{ margin: 0, fontSize: '12px', color: '#4f46e5', fontWeight: 'bold', textTransform: 'uppercase' }}>
          Warehouse Verification
        </p>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', marginTop: '5px' }}>
          <span style={{ fontSize: '40px', fontWeight: '900', color: '#1e1b4b' }}>{totalBoxCount}</span>
          <span style={{ fontSize: '18px', fontWeight: 'bold', color: '#4338ca' }}>TOTAL BOXES</span>
        </div>
      </div>

      <div style={{ marginTop: '20px', background: '#fff', padding: '15px', borderRadius: '10px', border: '1px solid #eee' }}>
        <h4 style={{ marginTop: 0, color: '#666' }}>Load Manifest (Details)</h4>
        {items.map((item, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f9f9f9', padding: '8px 0' }}>
            <span style={{ fontSize: '14px' }}>{item.product_name}</span>
            <b style={{ fontSize: '14px', background: '#f3f4f6', padding: '2px 8px', borderRadius: '4px' }}>{item.qty_boxes}</b>
          </div>
        ))}
      </div>

      {!alreadyExited ? (
        <form onSubmit={handleConfirmExit} style={{ marginTop: '25px' }}>
          <label style={{ fontWeight: 'bold', fontSize: '14px' }}>Security Notes:</label>
          <textarea 
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            required={!isExpired}
            disabled={isExpired}
            style={{ width: '100%', padding: '10px', marginTop: '5px', borderRadius: '8px', border: '1px solid #ccc' }} 
            placeholder={isExpired ? "Pass expired - Notes disabled" : "Odometer, Driver ID, etc."} 
          />
          <button 
            type="submit" 
            disabled={isUpdating || isExpired}
            style={{ 
                width: '100%', padding: '16px', marginTop: '10px', 
                background: isExpired ? '#eee' : (isUpdating ? '#ccc' : '#007bff'), 
                color: isExpired ? '#999' : '#fff', 
                border: 'none', borderRadius: '8px', 
                fontWeight: 'bold', fontSize: '16px',
                cursor: (isUpdating || isExpired) ? 'not-allowed' : 'pointer'
            }}
          >
            {isExpired ? "EXPIRED - CANNOT EXIT" : (isUpdating ? "UPDATING..." : "CONFIRM VEHICLE EXIT")}
          </button>
        </form>
      ) : (
        <div style={{ marginTop: '25px', padding: '15px', background: '#f0f2f5', borderRadius: '10px', border: '1px solid #e1e4e8' }}>
          <p style={{ color: '#555', fontWeight: 'bold', marginBottom: '5px' }}>EXIT LOGGED</p>
          <p style={{ margin: '3px 0', fontSize: '14px' }}><b>Time:</b> {new Date(order.exit_confirmed_at).toLocaleString()}</p>
          <p style={{ margin: '3px 0', fontSize: '14px' }}><b>Notes:</b> {order.exit_notes}</p>
        </div>
      )}
    </div>
  );
}