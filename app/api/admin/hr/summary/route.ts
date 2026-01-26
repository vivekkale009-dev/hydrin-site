import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const monthParam = searchParams.get('month') || new Date().toISOString().slice(0, 7);
    const supabase = await createServerSupabaseClient();

    // DYNAMIC DATE CALCULATION
    const [year, month] = monthParam.split('-').map(Number);
    const lastDay = new Date(year, month, 0).getDate(); 
    const startDate = `${monthParam}-01`;
    const endDate = `${monthParam}-${lastDay}`;

    // Format monthParam to match DB (e.g., "2026-01" -> "January 2026")
    const formattedDisplayMonth = new Date(year, month - 1).toLocaleString('default', { month: 'long', year: 'numeric' });

    // Fetch data
    const [empRes, attRes, advRes, payRes] = await Promise.all([
      supabase.from('employees').select('*').eq('is_active', true),
      supabase.from('attendance').select('*').gte('work_date', startDate).lte('work_date', endDate),
      supabase.from('salary_advances').select('*').eq('is_settled', false),
      supabase.from('salary_payments').select('*').order('created_at', { ascending: false })
    ]);

    const report = empRes.data?.map((emp: any) => {
      const empAtt = attRes.data?.filter(a => a.employee_id === emp.id) || [];
      const empAdv = advRes.data?.filter(a => a.employee_id === emp.id) || [];
      const empPayAll = payRes.data?.filter(p => p.employee_id === emp.id) || [];

      // FIX: Filter using the formatted string "January 2026"
      const empPayThisMonth = empPayAll.filter(p => p.payment_month === formattedDisplayMonth);
      
      const fullDays = empAtt.filter(a => a.status === 'Full Day').length;
      const halfDays = empAtt.filter(a => a.status === 'Half Day').length;
	  const leaves = empAtt.filter(a => a.status?.trim() === 'Absent').length || 0;
      
      const totalAdvances = empAdv.reduce((sum, a) => sum + Number(a.amount || 0), 0);
      const paidThisMonth = empPayThisMonth.reduce((sum, p) => sum + Number(p.amount_paid || 0), 0);
      
      const rate = Number(emp.daily_rate || 0);
      const grossEarnings = (fullDays * rate) + (halfDays * 0.5 * rate);

      // Net Payable calculation
      const netPayable = grossEarnings - totalAdvances - paidThisMonth;

      return {
        id: emp.id,
        name: emp.full_name,
        phone: emp.contact_number,
        role: emp.role,
        dailyRate: rate,
        fullDays,
        halfDays,
		leaves,
        grossEarnings,
        advances: totalAdvances,
        netPayable: Math.max(0, netPayable), 
        attendanceHistory: empAtt,
        advanceHistory: empAdv, 
        paymentHistory: empPayAll
      };
    }) || [];

    return NextResponse.json({ report });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}