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

    // Helper to apply date filter if params exist
    const applyFilter = (query: any, column: string) => {
      if (start && end) {
        return query.gte(column, start).lte(column, end);
      }
      return query;
    };

    const [orders, costs, rules, vans, products, expenses, advances, payments] = await Promise.all([
      applyFilter(supabase.from('orders_with_details').select('*, order_items(*, products(*))'), 'created_at'),
      supabase.from('product_cost_components').select('*'), // Static configs don't need date filters
      supabase.from('business_rules').select('*'),
      supabase.from('vans').select('*'),
      supabase.from('products').select('*'),
      applyFilter(supabase.from('business_expenses').select('*'), 'expense_date'),
      applyFilter(supabase.from('salary_advances').select('*'), 'request_date'),
      applyFilter(supabase.from('salary_payments').select('*'), 'payment_date')
    ]);

    // Check for errors in the data response
    if (orders.error || expenses.error) {
       console.error("Supabase Error:", orders.error || expenses.error);
    }

    return NextResponse.json({
      orders: orders.data || [],
      costs: costs.data || [],
      rules: rules.data || [],
      vans: vans.data || [],
      products: products.data || [],
      expenses: expenses.data || [],
      salaryAdvances: advances.data || [],
      salaryPayments: payments.data || []
    });
  } catch (error) {
    console.error("Route Error:", error);
    return NextResponse.json({ error: 'Failed to fetch dashboard data' }, { status: 500 });
  }
}