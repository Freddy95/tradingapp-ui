import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Use Service Role Key to bypass RLS for admin actions
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  const { tickers, action, quantity, brokerages } = await req.json();

  // Parse inputs: "AAPL TSLA" -> ['AAPL', 'TSLA']
  const stockList = tickers.trim().split(/\s+/);
  
  const jobs = [];

  // Create a job for every combination of Stock + Brokerage
  for (const stock of stockList) {
    for (const broker of brokerages) {
      jobs.push({
        ticker: stock.toUpperCase(),
        action,
        quantity: parseInt(quantity),
        brokerage: broker,
        status: 'PENDING'
      });
    }
  }

  // 1. Batch Insert into Supabase
  const { error } = await supabase.from('trades').insert(jobs);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // 2. Wake up the Worker (Fire and Forget)
  // We catch error so the UI doesn't freeze if worker is sleeping
  fetch(process.env.WORKER_URL!, { method: 'POST' }).catch(err => console.error(err));

  return NextResponse.json({ success: true, count: jobs.length });
}