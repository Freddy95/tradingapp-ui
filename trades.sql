create table trades (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  ticker text not null,
  action text not null, -- 'BUY' or 'SELL'
  quantity int not null default 1,
  brokerage text not null,
  status text not null default 'PENDING', -- 'PENDING', 'RUNNING', 'COMPLETED', 'FAILED'
  log text -- To store error messages like "Login failed" or "Insufficient funds"
);