"use client";
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { TapToolsService } from '@/algos/taptools';

const tapTools = new TapToolsService(process.env.NEXT_PUBLIC_TAPTOOLS_API_KEY || '');

interface Trade {
  action: string;
  tokenName: string;
  amount: number;
  time: string;
  hash: string;
}

export default function Profile() {
  const searchParams = useSearchParams();
  const address = searchParams.get('address');
  const [trades, setTrades] = useState<Trade[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchTrades() {
      if (!address) {
        setError('No address provided');
        setIsLoading(false);
        return;
      }

      try {
        // Get all trades for this address
        const response = await tapTools.getAddressHistory(address, '*');
        
        const formattedTrades = response.map(trade => ({
          action: trade.action,
          tokenName: trade.tokenName || trade.tokenAName,
          amount: trade.amount || trade.tokenAAmount,
          time: new Date(trade.time).toLocaleString(),
          hash: trade.hash
        }));

        setTrades(formattedTrades);
      } catch (err: any) {
        console.error('Error fetching trades:', err);
        setError(err.message || 'Failed to fetch trades');
      } finally {
        setIsLoading(false);
      }
    }

    fetchTrades();
  }, [address]);

  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      {/* Header */}
      <header className="relative z-10 p-6">
        <Link href="/WalletTracking">
          <h1 className="text-4xl font-bold text-white tracking-widest cursor-pointer hover:text-blue-500 transition-colors">
            SOONAMI
          </h1>
        </Link>
      </header>

      <main className="relative z-10 container mx-auto px-4 py-8">
        <div className="bg-black/40 backdrop-blur-lg rounded-xl border border-blue-500/30 p-8">
          <h2 className="text-2xl font-bold text-blue-500 mb-6">
            Wallet Profile: {address?.substring(0, 8)}...
          </h2>

          {isLoading ? (
            <div className="text-blue-500">Loading trades...</div>
          ) : error ? (
            <div className="text-red-500">{error}</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-blue-500/30">
                    <th className="text-blue-500 p-4 text-left">Time</th>
                    <th className="text-blue-500 p-4 text-left">Action</th>
                    <th className="text-blue-500 p-4 text-left">Token</th>
                    <th className="text-blue-500 p-4 text-left">Amount</th>
                    <th className="text-blue-500 p-4 text-left">Transaction</th>
                  </tr>
                </thead>
                <tbody>
                  {trades.map((trade, index) => (
                    <tr key={index} className="border-b border-blue-500/10">
                      <td className="text-white p-4">{trade.time}</td>
                      <td className={`p-4 ${
                        trade.action.toLowerCase().includes('buy') ? 'text-green-500' :
                        trade.action.toLowerCase().includes('sell') ? 'text-red-500' :
                        'text-blue-500'
                      }`}>
                        {trade.action}
                      </td>
                      <td className="text-white p-4">{trade.tokenName}</td>
                      <td className="text-white p-4">{trade.amount.toLocaleString()}</td>
                      <td className="text-white p-4">
                        <a
                          href={`https://cardanoscan.io/transaction/${trade.hash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-500 hover:text-blue-400 underline"
                        >
                          View
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

