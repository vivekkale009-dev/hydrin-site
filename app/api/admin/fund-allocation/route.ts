
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function getSupabase() {
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local"
    );
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

const CATEGORIES = [
  "raw_material",
  "electricity",
  "production_labour",
  "other_manufacturing",
  "staff_salary",
] as const;

const round = (n: number) =>
  Math.round((Number(n) + Number.EPSILON) * 100) / 100;

const jsonError = (message: string, status = 500) =>
  NextResponse.json({ success: false, error: message }, { status });

function getPaymentDate(payment: any) {
  return payment.payment_verified_at || payment.created_at;
}

function dateOnly(value: any) {
  if (!value) return "";
  return String(value).slice(0, 10);
}

export async function GET(request: NextRequest) {
  try {
    const db = getSupabase();
    const { searchParams } = new URL(request.url);

    const from = searchParams.get("from") || "";
    const to = searchParams.get("to") || "";

    const [
      paymentsResult,
      ordersResult,
      costsResult,
      ledgerResult,
      transactionsResult,
      employeesResult,
      salaryResult,
    ] = await Promise.all([
      // IMPORTANT:
      // Do not filter payment_verified_at.
      // Every payment entry must appear in the register.
      db
        .from("order_payments")
        .select(
          "id, order_id, payer_type, amount, note, verified_by, payment_method, transaction_id, created_at, payment_verified_at"
        )
        .order("created_at", { ascending: true }),

      db
        .from("orders")
        .select(
          "id, order_number, uorn, gross_revenue, total_payable_amount"
        ),

      db
        .from("order_costing_lot_allocations")
        .select(
          "order_id, qty_boxes, actual_raw_material_cost, actual_labour_cost, actual_electricity_cost, actual_other_manufacturing_cost, actual_total_cost"
        ),

      db.from("fund_allocation_ledger").select("*"),

      db
        .from("fund_transactions")
        .select("*")
        .order("created_at", { ascending: false }),

      db
        .from("employees")
        .select("id, full_name, role, daily_rate, is_active"),

      db
        .from("salary_payments")
        .select("employee_id, amount_paid, payment_date, for_month"),
    ]);

    const results = [
      paymentsResult,
      ordersResult,
      costsResult,
      ledgerResult,
      transactionsResult,
      employeesResult,
      salaryResult,
    ];

    const failed = results.find((result) => result.error);

    if (failed?.error) {
      throw new Error(failed.error.message);
    }

    const payments = paymentsResult.data || [];
    const orders = ordersResult.data || [];
    const costs = costsResult.data || [];
    const ledger = ledgerResult.data || [];
    const transactions = transactionsResult.data || [];
    const employees = employeesResult.data || [];
    const salaryPayments = salaryResult.data || [];

    const orderMap = new Map(
      orders.map((order: any) => [order.id, order])
    );

    // Group actual dispatched production costs by order.
    const costMap = new Map<string, any>();

    for (const row of costs as any[]) {
      const current = costMap.get(row.order_id) || {
        raw_material: 0,
        electricity: 0,
        production_labour: 0,
        other_manufacturing: 0,
        total: 0,
        boxes: 0,
      };

      current.raw_material += Number(
        row.actual_raw_material_cost || 0
      );

      current.electricity += Number(
        row.actual_electricity_cost || 0
      );

      current.production_labour += Number(
        row.actual_labour_cost || 0
      );

      current.other_manufacturing += Number(
        row.actual_other_manufacturing_cost || 0
      );

      current.total += Number(row.actual_total_cost || 0);
      current.boxes += Number(row.qty_boxes || 0);

      costMap.set(row.order_id, current);
    }

    // Sort every payment chronologically before calculating instalments.
    const sortedPayments = [...(payments as any[])].sort(
      (a, b) =>
        new Date(getPaymentDate(a) || 0).getTime() -
        new Date(getPaymentDate(b) || 0).getTime()
    );

    // Calculate incremental reserve for each payment.
    // Example: if an order is paid in two instalments,
    // the second payment reserves only its additional share.
    const cumulativePaid = new Map<string, number>();

    const allPaymentRows = sortedPayments.map((payment: any) => {
      const order: any = orderMap.get(payment.order_id);
      const cost = costMap.get(payment.order_id);

      const orderAmount = Number(
        order?.total_payable_amount ||
          order?.gross_revenue ||
          0
      );

      const receiptAmount = Number(payment.amount || 0);

      const previousPaid =
        cumulativePaid.get(payment.order_id) || 0;

      const currentPaid = previousPaid + receiptAmount;

      cumulativePaid.set(payment.order_id, currentPaid);

      const previousRatio =
        orderAmount > 0
          ? Math.min(previousPaid / orderAmount, 1)
          : 0;

      const currentRatio =
        orderAmount > 0
          ? Math.min(currentPaid / orderAmount, 1)
          : 0;

      const incrementalRatio = Math.max(
        0,
        currentRatio - previousRatio
      );

      const hasCost =
        !!cost &&
        cost.boxes > 0 &&
        cost.total > 0;

      const recommended = {
        raw_material: hasCost
          ? round(cost.raw_material * incrementalRatio)
          : 0,

        electricity: hasCost
          ? round(cost.electricity * incrementalRatio)
          : 0,

        production_labour: hasCost
          ? round(cost.production_labour * incrementalRatio)
          : 0,

        other_manufacturing: hasCost
          ? round(
              cost.other_manufacturing * incrementalRatio
            )
          : 0,

        staff_salary: 0,
      };

      const existingLedger = (ledger as any[]).filter(
        (item) => item.payment_id === payment.id
      );

      const savedRecommendation = existingLedger.reduce(
        (sum: number, item: any) =>
          sum + Number(item.recommended_amount || 0),
        0
      );

      const savedAside = existingLedger.reduce(
        (sum: number, item: any) =>
          sum + Number(item.set_aside_amount || 0),
        0
      );

      const paymentDate = getPaymentDate(payment);

      return {
        payment_id: payment.id,
        order_id: payment.order_id,

        order_number:
          order?.order_number ||
          order?.uorn ||
          payment.order_id.slice(0, 8),

        payment_date: paymentDate,

        payment_amount: receiptAmount,
        payment_method: payment.payment_method || "-",
        transaction_id: payment.transaction_id || "",
        note: payment.note || "",
        payer_type: payment.payer_type || "",

        // A missing verification timestamp no longer hides the payment.
        payment_status: payment.payment_verified_at
          ? "Verified"
          : "Recorded - Not Verified",

        order_amount: orderAmount,
        total_received_for_order: currentPaid,

        actual_cost_available: hasCost,
        costing_boxes: cost?.boxes || 0,

        recommended,

        recommended_total: round(
          Object.values(recommended).reduce(
            (sum, value) => sum + value,
            0
          )
        ),

        saved_recommendation: round(savedRecommendation),
        saved_set_aside: round(savedAside),
      };
    });

    // Apply date filter only after calculating all instalments.
    // This prevents the date filter from changing the allocation calculation.
    const paymentRows = allPaymentRows.filter((payment: any) => {
      const paymentDate = dateOnly(payment.payment_date);

      if (from && paymentDate < from) return false;
      if (to && paymentDate > to) return false;

      return true;
    });

    // Filter fund transactions using the same date range.
    const filteredTransactions = (transactions as any[]).filter(
      (item) => {
        const transactionDate = dateOnly(
          item.expense_date || item.created_at
        );

        if (from && transactionDate < from) return false;
        if (to && transactionDate > to) return false;

        return true;
      }
    );

    // Category-wise totals for the selected date range.
    const categoryTotals: Record<string, any> = {};

    for (const category of CATEGORIES) {
      const categoryTransactions = filteredTransactions.filter(
        (item: any) => item.category === category
      );

      categoryTotals[category] = {
        recommended: round(
          paymentRows.reduce(
            (sum: number, payment: any) =>
              sum +
              Number(payment.recommended?.[category] || 0),
            0
          )
        ),

        set_aside: round(
          categoryTransactions
            .filter(
              (item: any) =>
                item.transaction_type === "set_aside"
            )
            .reduce(
              (sum: number, item: any) =>
                sum + Number(item.amount || 0),
              0
            )
        ),

        expenses_paid: round(
          categoryTransactions
            .filter(
              (item: any) =>
                item.transaction_type === "expense_paid"
            )
            .reduce(
              (sum: number, item: any) =>
                sum + Number(item.amount || 0),
              0
            )
        ),
      };
    }

    // Daily payment and reserve summary.
    const dailyMap: Record<string, any> = {};

    for (const payment of paymentRows as any[]) {
      const date = dateOnly(payment.payment_date);

      if (!date) continue;

      if (!dailyMap[date]) {
        dailyMap[date] = {
          date,
          payments_count: 0,
          received: 0,
          raw_material: 0,
          electricity: 0,
          production_labour: 0,
          other_manufacturing: 0,
          total_to_keep: 0,
          costing_pending_count: 0,
        };
      }

      const daily = dailyMap[date];

      daily.payments_count += 1;
      daily.received += payment.payment_amount;

      daily.raw_material +=
        payment.recommended.raw_material;

      daily.electricity +=
        payment.recommended.electricity;

      daily.production_labour +=
        payment.recommended.production_labour;

      daily.other_manufacturing +=
        payment.recommended.other_manufacturing;

      daily.total_to_keep += payment.recommended_total;

      if (!payment.actual_cost_available) {
        daily.costing_pending_count += 1;
      }
    }

    const dailyTotals = Object.values(dailyMap)
      .map((daily: any) => ({
        ...daily,
        received: round(daily.received),
        raw_material: round(daily.raw_material),
        electricity: round(daily.electricity),
        production_labour: round(daily.production_labour),
        other_manufacturing: round(
          daily.other_manufacturing
        ),
        total_to_keep: round(daily.total_to_keep),
      }))
      .sort((a: any, b: any) =>
        b.date.localeCompare(a.date)
      );

    const totalReceived = round(
      paymentRows.reduce(
        (sum: number, payment: any) =>
          sum + Number(payment.payment_amount || 0),
        0
      )
    );

    const totalRecommended = round(
      paymentRows.reduce(
        (sum: number, payment: any) =>
          sum + Number(payment.recommended_total || 0),
        0
      )
    );

    const totalSetAside = round(
      filteredTransactions
        .filter(
          (item: any) =>
            item.transaction_type === "set_aside"
        )
        .reduce(
          (sum: number, item: any) =>
            sum + Number(item.amount || 0),
          0
        )
    );

    const totalExpenses = round(
      filteredTransactions
        .filter(
          (item: any) =>
            item.transaction_type === "expense_paid"
        )
        .reduce(
          (sum: number, item: any) =>
            sum + Number(item.amount || 0),
          0
        )
    );

    // Salary payments for the current calendar month.
    const now = new Date();
    const monthStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      1
    )
      .toISOString()
      .slice(0, 10);

    const salaryPaidThisMonth = round(
      (salaryPayments as any[])
        .filter(
          (item) =>
            item.payment_date >= monthStart
        )
        .reduce(
          (sum: number, item: any) =>
            sum + Number(item.amount_paid || 0),
          0
        )
    );

    return NextResponse.json(
      {
        success: true,

        filters: {
          from,
          to,
        },

        payments: paymentRows,

        daily_totals: dailyTotals,

        totals: categoryTotals,

        summary: {
          total_received: totalReceived,
          total_recommended: totalRecommended,
          total_set_aside: totalSetAside,
          total_expenses_paid: totalExpenses,

          cash_remaining: round(
            totalReceived - totalExpenses
          ),

          salary_paid_this_month: salaryPaidThisMonth,

          staff_count: employees.filter(
            (employee: any) => employee.is_active
          ).length,
        },

        transactions: filteredTransactions,
      },
      {
        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
      }
    );
  } catch (error: any) {
    console.error("Fund allocation GET error:", error);

    return jsonError(
      error.message || "Unable to load fund data"
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const db = getSupabase();
    const body = await request.json();

    const {
      action,
      category,
      amount,
      payment_id,
      order_id,
      description,
    } = body;

    if (!["set_aside", "expense_paid"].includes(action)) {
      return jsonError("Invalid entry type", 400);
    }

    if (!CATEGORIES.includes(category)) {
      return jsonError("Invalid fund category", 400);
    }

    const value = Number(amount);

    if (!Number.isFinite(value) || value <= 0) {
      return jsonError(
        "Enter a valid amount greater than zero",
        400
      );
    }

    // Confirm the selected payment exists.
    // Do not reject it just because payment_verified_at is NULL.
    if (payment_id) {
      const { data: payment, error: paymentError } = await db
        .from("order_payments")
        .select("id, order_id")
        .eq("id", payment_id)
        .maybeSingle();

      if (paymentError) throw paymentError;

      if (!payment) {
        return jsonError(
          "The selected payment does not exist",
          400
        );
      }

      if (order_id && order_id !== payment.order_id) {
        return jsonError(
          "Payment and order do not match",
          400
        );
      }
    }

    const { error } = await db
      .from("fund_transactions")
      .insert({
        transaction_type: action,
        category,
        amount: round(value),
        payment_id: payment_id || null,
        order_id: order_id || null,

        description:
          String(description || "").trim() ||
          (action === "set_aside"
            ? "Money kept aside"
            : "Expense paid"),

        expense_date: new Date()
          .toISOString()
          .slice(0, 10),
      });

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Fund allocation POST error:", error);

    return jsonError(
      error.message || "Unable to save entry"
    );
  }
}
