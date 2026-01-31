import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

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
      supabase.from('salary_advances').select('*'), 
      supabase.from('salary_payments').select('*').order('created_at', { ascending: false })
    ]);

    const report = empRes.data?.map((emp: any) => {
      const empAtt = attRes.data?.filter(a => a.employee_id === emp.id) || [];
      
      // Filter advances belonging to this month
      const empAdv = advRes.data?.filter(a => 
        a.employee_id === emp.id && 
        a.created_at.startsWith(monthParam)
      ) || [];

      const empPayAll = payRes.data?.filter(p => p.employee_id === emp.id) || [];

      const formattedDisplayMonth = new Date(year, month - 1).toLocaleString('default', { month: 'long', year: 'numeric' });
      
      const empPayThisMonth = empPayAll.filter(p => 
        p.payment_month === monthParam || p.payment_month === formattedDisplayMonth
      );
      
      const fullDays = empAtt.filter(a => a.status === 'Full Day').length;
      const halfDays = empAtt.filter(a => a.status === 'Half Day').length;
      const leaves = empAtt.filter(a => a.status?.trim() === 'Absent' || a.status?.trim() === 'Leave').length;
      
      const rate = Number(emp.daily_rate || 0);
      const grossEarnings = (fullDays * rate) + (halfDays * 0.5 * rate);
      const totalAdvances = empAdv.reduce((sum, a) => sum + Number(a.amount || 0), 0);
      const paidThisMonth = empPayThisMonth.reduce((sum, p) => sum + Number(p.amount_paid || 0), 0);

      // Math: Earnings (1350) - Advances (700) - Paid (650) = 0 Balance
      const netPayable = grossEarnings - totalAdvances - paidThisMonth;

      return {
        id: emp.id,
        // CRITICAL FIX: Ensure 'name' exists for the frontend filter
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
        advanceHistory: empAdv, 
        paymentHistory: empPayAll
      };
    }) || [];

    return NextResponse.json({ report });
  } catch (error: any) {
    console.error("Summary API Error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}