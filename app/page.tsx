'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { RefreshCw, Trash2, PlayCircle, AlertCircle, CheckCircle2 } from 'lucide-react';

// Initialize Supabase Client (Public Key is fine for reading if RLS allows, 
// or use a simple fetch to an API route if you prefer hiding logic)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!, 
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY! 
  // NOTE: Ensure you have a .env variable for NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const BROKERS = ['Fidelity', 'Schwab', 'WellsFargo', 'Robinhood', 'TRowe', 'TastyTrade', 'Sofi'];

export default function Dashboard() {
  // --- Auth State (Simple Password Gate) ---
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  
  // --- Form State ---
  const [tickers, setTickers] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [action, setAction] = useState('BUY');
  const [selectedBrokers, setSelectedBrokers] = useState<string[]>(BROKERS);
  const [loading, setLoading] = useState(false);

  // --- History State ---
  const [trades, setTrades] = useState<any[]>([]);

  // Real-time Subscription to Database
  useEffect(() => {
    if (!isAuthenticated) return;

    fetchTrades();

    // Listen for changes (Real-time updates on status)
    const channel = supabase
      .channel('realtime trades')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'trades' }, (payload) => {
        fetchTrades(); // Refresh list on any change
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [isAuthenticated]);

  const fetchTrades = async () => {
    const { data } = await supabase.from('trades').select('*').order('created_at', { ascending: false });
    if (data) setTrades(data);
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // In a real app, verify against API. For simple tool, checking env via API or hardcode is common.
    // For this example, we will assume you set the password locally or use NextAuth.
    // To keep this snippet runnable, we'll simulate a simple check:
    // Ideally, perform a POST to /api/auth/verify (omitted for brevity)
    setIsAuthenticated(true); 
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    await fetch('/api/trade', {
      method: 'POST',
      body: JSON.stringify({ tickers, action, quantity, brokerages: selectedBrokers }),
    });

    setTickers('');
    setLoading(false);
  };

  const handleRetry = async (trade: any) => {
    // Retry just submits a single new job
    await fetch('/api/trade', {
      method: 'POST',
      body: JSON.stringify({ 
        tickers: trade.ticker, 
        action: trade.action, 
        quantity: trade.quantity, 
        brokerages: [trade.brokerage] 
      }),
    });
  };

  const handleClear = async () => {
    if(!confirm("Clear all history?")) return;
    await fetch('/api/history', { method: 'DELETE' });
    fetchTrades();
  };

  // --- Login Screen ---
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
        <form onSubmit={handleLogin} className="p-8 bg-gray-800 rounded-lg shadow-xl space-y-4">
          <h1 className="text-2xl font-bold">Trading Command</h1>
          <input 
            type="password" 
            placeholder="Access Code" 
            className="w-full p-2 rounded bg-gray-700 border border-gray-600"
            onChange={(e) => setPasswordInput(e.target.value)}
          />
          <button className="w-full bg-blue-600 py-2 rounded hover:bg-blue-500">Enter</button>
        </form>
      </div>
    );
  }

  // --- Main Dashboard ---
  return (
    <div className="min-h-screen bg-gray-50 p-8 font-sans text-gray-900">
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-800">Bot Control Center</h1>
          <div className="text-sm text-gray-500">Status: <span className="text-green-600 font-bold">Online</span></div>
        </div>

        {/* Control Panel */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* Action & Tickers */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="col-span-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">Action</label>
                <div className="flex bg-gray-100 p-1 rounded-lg">
                  {['BUY', 'SELL'].map(opt => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setAction(opt)}
                      className={`flex-1 py-2 rounded-md text-sm font-bold transition-all ${
                        action === opt 
                          ? (opt === 'BUY' ? 'bg-green-500 text-white' : 'bg-red-500 text-white') 
                          : 'text-gray-500 hover:bg-gray-200'
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Tickers (Space Separated)</label>
                <input 
                  required
                  type="text" 
                  placeholder="AAPL TSLA MSFT" 
                  value={tickers}
                  onChange={e => setTickers(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none uppercase"
                />
              </div>

              <div className="col-span-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                <input 
                  type="number" 
                  min="1"
                  value={quantity}
                  onChange={e => setQuantity(parseInt(e.target.value))}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
            </div>

            {/* Brokerage Select */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Target Brokerages</label>
              <div className="flex flex-wrap gap-2">
                {BROKERS.map(broker => (
                  <button
                    key={broker}
                    type="button"
                    onClick={() => {
                      selectedBrokers.includes(broker)
                        ? setSelectedBrokers(selectedBrokers.filter(b => b !== broker))
                        : setSelectedBrokers([...selectedBrokers, broker]);
                    }}
                    className={`px-4 py-2 rounded-full text-sm font-medium border transition-colors ${
                      selectedBrokers.includes(broker)
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {broker}
                  </button>
                ))}
              </div>
            </div>

            <button 
              disabled={loading || !tickers}
              className="w-full bg-gray-900 text-white py-3 rounded-lg font-bold hover:bg-gray-800 disabled:opacity-50 flex justify-center items-center gap-2"
            >
              {loading ? <RefreshCw className="animate-spin h-5 w-5" /> : <PlayCircle className="h-5 w-5" />}
              Execute Order
            </button>
          </form>
        </div>

        {/* Status Board */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
            <h3 className="font-bold text-gray-700">Execution Log</h3>
            <button onClick={handleClear} className="text-xs text-red-600 hover:text-red-800 flex items-center gap-1">
              <Trash2 className="h-3 w-3" /> Clear History
            </button>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3">Time</th>
                  <th className="px-4 py-3">Brokerage</th>
                  <th className="px-4 py-3">Action</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Details</th>
                  <th className="px-4 py-3 text-right">Retry</th>
                </tr>
              </thead>
              <tbody>
                {trades.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-8 text-gray-400">No active trades</td></tr>
                ) : trades.map((trade) => (
                  <tr key={trade.id} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-500">{new Date(trade.created_at).toLocaleTimeString()}</td>
                    <td className="px-4 py-3 font-medium">{trade.brokerage}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-xs font-bold ${trade.action === 'BUY' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {trade.action} {trade.quantity} {trade.ticker}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`flex items-center gap-1 font-medium ${
                        trade.status === 'COMPLETED' ? 'text-green-600' :
                        trade.status === 'FAILED' ? 'text-red-600' :
                        trade.status === 'RUNNING' ? 'text-blue-600' : 'text-yellow-600'
                      }`}>
                        {trade.status === 'COMPLETED' && <CheckCircle2 className="h-4 w-4" />}
                        {trade.status === 'FAILED' && <AlertCircle className="h-4 w-4" />}
                        {trade.status === 'RUNNING' && <RefreshCw className="h-4 w-4 animate-spin" />}
                        {trade.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 max-w-xs truncate">{trade.log || '-'}</td>
                    <td className="px-4 py-3 text-right">
                      {trade.status === 'FAILED' && (
                        <button onClick={() => handleRetry(trade)} className="text-blue-600 hover:underline text-xs">
                          Retry
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}