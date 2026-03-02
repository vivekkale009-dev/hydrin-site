import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const monthParam = searchParams.get('month') || new Date().toISOString().slice(0, 7); 
    const supabase = await createServerSupabaseClient();

    const [year, month] = monthParam.split('-').map(Number);
    const lastDay = new Date(year, month, 0).getDate(); 
    const startDate = `${monthParam}-01`;
    const endDate = `${monthParam}-${lastDay}`;

    const [empRes, attRes, advRes, payRes] = await Promise.all([
      supabase.from('employees').select('*').eq('is_active', true),
      supabase.from('attendance').select('*').gte('work_date', startDate).lte('work_date', endDate),
      // SURGICAL FIX: Fetch all advances, but we will filter them intelligently below
      supabase.from('salary_advances').select('*').order('created_at', { ascending: false }), 
      supabase.from('salary_payments').select('*').order('created_at', { ascending: false })
    ]);

    const report = empRes.data?.map((emp: any) => {
      const empAtt = attRes.data?.filter(a => a.employee_id === emp.id) || [];
      
      // FIX: Ensure we only deduct advances that were given in this specific month
      // or are marked as unsettled (depending on your business logic)
      const empAdv = advRes.data?.filter(a => 
        a.employee_id === emp.id && 
        a.created_at.startsWith(monthParam)
      ) || [];

      const empPayAll = payRes.data?.filter(p => p.employee_id === emp.id) || [];

      // SURGICAL CHANGE: Calculate current month payments strictly by monthParam 
      // This ensures 0-balance payments (recorded upon generation) are counted correctly.
      const empPayThisMonth = empPayAll.filter(p => p.payment_month === monthParam);
      
      const fullDays = empAtt.filter(a => a.status === 'Full Day').length;
      const halfDays = empAtt.filter(a => a.status === 'Half Day').length;
      const leaves = empAtt.filter(a => a.status?.trim() === 'Absent' || a.status?.trim() === 'Leave').length;
      
      const rate = Number(emp.daily_rate || 0);
      const grossEarnings = (fullDays * rate) + (halfDays * 0.5 * rate);
      
      // FIX: Ensure Number conversion is safe for the sum
      const totalAdvances = empAdv.reduce((sum, a) => sum + Number(a.amount || 0), 0);
      const paidThisMonth = empPayThisMonth.reduce((sum, p) => sum + Number(p.amount_paid || 0), 0);

      // Math: Earnings - Advances - Paid = Net Due
      const netPayable = grossEarnings - totalAdvances - paidThisMonth;

      return {
        id: emp.id,
        employee_no: emp.employee_no || "",
        name: emp.full_name || "Unknown Staff", 
        phone: emp.contact_number || "",
        role: emp.role || "Staff",
        dailyRate: rate,
        fullDays,
        halfDays,
        leaves,
        grossEarnings,
        advances: totalAdvances,
        paidAlready: paidThisMonth, 
        netPayable: Math.max(0, netPayable), 
        attendanceHistory: empAtt,
        advanceHistory: empAdv, // This feeds the 'Advances' tab in your drawer
        paymentHistory: empPayAll // Kept as full history so PDF buttons show up for all months
      };
    }) || [];

    return NextResponse.json({ report });
  } catch (error: any) {
    console.error("Summary API Error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}