'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { RefreshCw, Trash2, PlayCircle, AlertCircle, CheckCircle2, CheckSquare, Square } from 'lucide-react';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!, 
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY! 
);

const BROKERS = ['Fidelity', 'Schwab', 'WellsFargo', 'Robinhood', 'TRowe', 'TastyTrade', 'Sofi'];

export default function Dashboard() {
  // --- Auth State ---
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  
  // --- Form State ---
  const [tickers, setTickers] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [action, setAction] = useState('BUY');
  
  // Initialize with ALL brokers selected by default
  const [selectedBrokers, setSelectedBrokers] = useState<string[]>(BROKERS);
  const [loading, setLoading] = useState(false);

  // --- History State ---
  const [trades, setTrades] = useState<any[]>([]);

  useEffect(() => {
    if (!isAuthenticated) return;
    fetchTrades();
    const channel = supabase
      .channel('realtime trades')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'trades' }, () => fetchTrades())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [isAuthenticated]);

  const fetchTrades = async () => {
    const { data } = await supabase.from('trades').select('*').order('created_at', { ascending: false });
    if (data) setTrades(data);
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // Replace with your actual password logic or env variable check
    if(passwordInput) setIsAuthenticated(true); 
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if(selectedBrokers.length === 0) return alert("Please select at least one brokerage.");
    
    setLoading(true);
    await fetch('/api/trade', {
      method: 'POST',
      body: JSON.stringify({ tickers, action, quantity, brokerages: selectedBrokers }),
    });
    setTickers('');
    setLoading(false);
  };

  const handleRetry = async (trade: any) => {
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

  // Checkbox Logic
  const toggleBroker = (broker: string) => {
    setSelectedBrokers(prev => 
      prev.includes(broker) 
        ? prev.filter(b => b !== broker) 
        : [...prev, broker]
    );
  };

  const toggleAllBrokers = () => {
    if (selectedBrokers.length === BROKERS.length) {
      setSelectedBrokers([]); // Deselect All
    } else {
      setSelectedBrokers(BROKERS); // Select All
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
        <form onSubmit={handleLogin} className="p-8 bg-gray-800 rounded-lg shadow-xl space-y-4 w-96">
          <h1 className="text-2xl font-bold text-center">Trading Command</h1>
          <input 
            type="password" 
            placeholder="Access Code" 
            className="w-full p-2 rounded bg-gray-700 border border-gray-600 focus:outline-none focus:border-blue-500"
            onChange={(e) => setPasswordInput(e.target.value)}
          />
          <button className="w-full bg-blue-600 py-2 rounded hover:bg-blue-500 font-bold">Enter</button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8 font-sans text-gray-900">
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Bot Control Center</h1>
            <p className="text-gray-500 text-sm mt-1">Multi-Brokerage Automation Interface</p>
          </div>
          <div className="px-4 py-2 bg-green-100 text-green-800 rounded-full text-sm font-bold flex items-center gap-2">
             <span className="relative flex h-3 w-3">
               <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
               <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
             </span>
             System Online
          </div>
        </div>

        {/* Control Panel */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <form onSubmit={handleSubmit} className="space-y-8">
            
            {/* Top Row: Action, Ticker, Qty */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
              
              {/* Action Selector */}
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-gray-500 uppercase mb-2 tracking-wider">Action</label>
                <div className="flex bg-gray-100 p-1 rounded-lg">
                  {['BUY', 'SELL'].map(opt => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setAction(opt)}
                      className={`flex-1 py-2 rounded-md text-sm font-bold transition-all ${
                        action === opt 
                          ? (opt === 'BUY' ? 'bg-green-600 text-white shadow-sm' : 'bg-red-600 text-white shadow-sm') 
                          : 'text-gray-500 hover:bg-gray-200'
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>

              {/* Ticker Input */}
              <div className="md:col-span-8">
                <label className="block text-xs font-bold text-gray-500 uppercase mb-2 tracking-wider">Tickers (Space Separated)</label>
                <input 
                  required
                  type="text" 
                  placeholder="AAPL TSLA MSFT" 
                  value={tickers}
                  onChange={e => setTickers(e.target.value)}
                  className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none uppercase font-mono text-lg tracking-wide"
                />
              </div>

              {/* Quantity Input */}
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-gray-500 uppercase mb-2 tracking-wider">Quantity</label>
                <input 
                  type="number" 
                  min="1"
                  value={quantity}
                  onChange={e => setQuantity(parseInt(e.target.value))}
                  className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-mono text-lg"
                />
              </div>
            </div>

            <hr className="border-gray-100" />

            {/* Brokerage Selection Checkboxes */}
            <div>
              <div className="flex justify-between items-end mb-3">
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">Target Brokerages</label>
                <button 
                  type="button" 
                  onClick={toggleAllBrokers}
                  className="text-xs font-medium text-blue-600 hover:text-blue-800 hover:underline"
                >
                  {selectedBrokers.length === BROKERS.length ? 'Deselect All' : 'Select All'}
                </button>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
                {BROKERS.map(broker => {
                  const isSelected = selectedBrokers.includes(broker);
                  return (
                    <label 
                      key={broker}
                      className={`flex items-center space-x-3 p-3 rounded-lg border cursor-pointer transition-all select-none ${
                        isSelected 
                          ? 'bg-blue-50 border-blue-200 text-blue-800 shadow-sm' 
                          : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'
                      }`}
                    >
                      <input 
                        type="checkbox" 
                        checked={isSelected}
                        onChange={() => toggleBroker(broker)}
                        className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" 
                      />
                      <span className="font-medium text-sm">{broker}</span>
                    </label>
                  )
                })}
              </div>
            </div>

            {/* Execute Button */}
            <button 
              disabled={loading || !tickers || selectedBrokers.length === 0}
              className="w-full bg-gray-900 text-white py-4 rounded-xl font-bold text-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-3 shadow-lg hover:shadow-xl transition-all transform active:scale-[0.99]"
            >
              {loading ? <RefreshCw className="animate-spin h-6 w-6" /> : <PlayCircle className="h-6 w-6" />}
              {loading ? 'Processing Order...' : 'Execute Trade Command'}
            </button>
          </form>
        </div>

        {/* Status Board */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
            <div className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4 text-gray-400" />
              <h3 className="font-bold text-gray-700">Execution Log</h3>
            </div>
            <button onClick={handleClear} className="text-xs text-red-600 hover:text-red-800 hover:bg-red-50 px-3 py-1 rounded flex items-center gap-1 transition-colors">
              <Trash2 className="h-3 w-3" /> Clear History
            </button>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3">Time</th>
                  <th className="px-6 py-3">Brokerage</th>
                  <th className="px-6 py-3">Order</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Details</th>
                  <th className="px-6 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {trades.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-12 text-gray-400">No active trades found in database.</td></tr>
                ) : trades.map((trade) => (
                  <tr key={trade.id} className="border-b hover:bg-gray-50 transition-colors group">
                    <td className="px-6 py-4 text-gray-500 whitespace-nowrap font-mono text-xs">
                      {new Date(trade.created_at).toLocaleTimeString()}
                    </td>
                    <td className="px-6 py-4 font-bold text-gray-800">{trade.brokerage}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-md text-xs font-bold border ${
                        trade.action === 'BUY' 
                          ? 'bg-green-50 text-green-700 border-green-200' 
                          : 'bg-red-50 text-red-700 border-red-200'
                      }`}>
                        {trade.action} {trade.quantity} {trade.ticker}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${
                        trade.status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
                        trade.status === 'FAILED' ? 'bg-red-100 text-red-700' :
                        trade.status === 'RUNNING' ? 'bg-blue-100 text-blue-700' : 
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {trade.status === 'COMPLETED' && <CheckCircle2 className="h-3.5 w-3.5" />}
                        {trade.status === 'FAILED' && <AlertCircle className="h-3.5 w-3.5" />}
                        {trade.status === 'RUNNING' && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
                        {trade.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-500 max-w-xs truncate text-xs">
                      {trade.log || <span className="text-gray-300 italic">No logs</span>}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {trade.status === 'FAILED' && (
                        <button 
                          onClick={() => handleRetry(trade)} 
                          className="text-blue-600 hover:text-blue-800 text-xs font-medium border border-blue-200 hover:bg-blue-50 px-3 py-1 rounded-md transition-all"
                        >
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