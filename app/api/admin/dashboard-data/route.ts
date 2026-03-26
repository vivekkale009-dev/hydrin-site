export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse, NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const start = searchParams.get('start');
    const end = searchParams.get('end');
    
    const supabase = await createAdminClient();

    // 1. Initialize queries
    let ordersQuery = supabase.from('orders_with_details').select('*, order_items(*, products(*))');
    let expensesQuery = supabase.from('business_expenses').select('*');
    let advancesQuery = supabase.from('salary_advances').select('*');
    let paymentsQuery = supabase.from('salary_payments').select('*');

    // 2. Apply filters only if dates are provided
    if (start && end) {
      ordersQuery = ordersQuery.gte('created_at', start).lte('created_at', end);
      expensesQuery = expensesQuery.gte('expense_date', start).lte('expense_date', end);
      advancesQuery = advancesQuery.gte('request_date', start).lte('request_date', end);
      paymentsQuery = paymentsQuery.gte('payment_date', start).lte('payment_date', end);
    }

    // 3. Execute all at once
    const [
      { data: ordersData, error: ordersError },
      { data: costsData },
      { data: rulesData },
      { data: vansData },
      { data: productsData },
      { data: expensesData },
      { data: advancesData },
      { data: paymentsData }
    ] = await Promise.all([
      ordersQuery,
      supabase.from('product_cost_components').select('*'),
      supabase.from('business_rules').select('*'),
      supabase.from('vans').select('*'),
      supabase.from('products').select('*'),
      expensesQuery,
      advancesQuery,
      paymentsQuery
    ]);

    if (ordersError) {
       console.error("Supabase Error:", ordersError);
    }

    return NextResponse.json({
      orders: ordersData || [],
      costs: costsData || [],
      rules: rulesData || [],
      vans: vansData || [],
      products: productsData || [],
      expenses: expensesData || [],
      salaryAdvances: advancesData || [],
      salaryPayments: paymentsData || []
    });
  } catch (error) {
    console.error("Route Error:", error);
    return NextResponse.json({ error: 'Failed to fetch dashboard data' }, { status: 500 });
  }
}