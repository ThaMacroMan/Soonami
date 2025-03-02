"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Autocomplete, AutocompleteItem } from "@heroui/autocomplete";
import { TapToolsService } from '@/algos/taptools';
import Link from 'next/link';
import tokenListData from '@/algos/data/token_list.json';

const tapTools = new TapToolsService(process.env.NEXT_PUBLIC_TAPTOOLS_API_KEY || '');

// Define interfaces
interface Token {
  liquidity: number;
  price: number;
  ticker: string;
  unit: string;
}

interface TokenHolder {
  address: string;
  amount: number;
  percentage: number;
}

interface TokenOption {
  label: string;
  value: string;
  description: string;
}

export default function WalletTracking() {
  const router = useRouter();
  const [selectedToken, setSelectedToken] = useState<TokenOption | null>(null);
  const [showHolders, setShowHolders] = useState(false);
  const [holders, setHolders] = useState<TokenHolder[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const tokenOptions = tokenListData.tokens.map(token => ({
    label: token.ticker,
    value: token.unit,
    description: token.ticker
  }));

  const handleTokenSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const token = tokenOptions.find(t => t.value === e.target.value);
    setSelectedToken(token || null);
  };

  const handleSubmit = async () => {
    if (!selectedToken?.value) {
      console.log('No token selected');
      return;
    }

    setIsLoading(true);
    try {
      console.log('Fetching holders for token unit:', selectedToken.value);
      const topHolders = await tapTools.getTokenHolders(selectedToken.value, {
        perPage: 20,
        sortBy: 'amount',
        order: 'desc'
      });
      setHolders(topHolders);
      setShowHolders(true);
    } catch (error) {
      console.error('Error fetching holders:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4">
      <div className="bg-[#0A0B2E]/40 rounded-2xl border border-blue-500/20 p-8 w-full max-w-lg">
        <div className="space-y-6">
          <div>
            <label 
              htmlFor="token-select" 
              className="text-purple-400 text-sm mb-2 block"
            >
              Select Token
            </label>
            <select
              id="token-select"
              value={selectedToken?.value || ''}
              onChange={handleTokenSelect}
              className="w-full bg-[#0A0B2E]/60 text-purple-400 p-1 rounded border border-purple-500/20"
            >
              <option value="" className="bg-[#0A0B2E]">Select a token...</option>
              {tokenOptions.map(token => (
                <option key={token.value} value={token.value} className="bg-[#0A0B2E]">
                  {token.label}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={handleSubmit}
            className="w-full py-3 rounded-lg transition-colors bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 border border-purple-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isLoading || !selectedToken?.value}
          >
            {isLoading ? 'Loading...' : 'Track Token'}
          </button>
        </div>
      </div>

      {/* Holders Modal */}
      {showHolders && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
        >
          {/* Dark overlay */}
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" />
          
          {/* Modal content */}
          <div className="relative z-[101] bg-[#0A0B2E]/90 border border-blue-500/20 rounded-xl p-8 max-w-4xl w-full mx-4">
            <div className="flex justify-between items-center mb-6">
              <div className="space-y-2">
                <h2 id="modal-title" className="text-2xl font-bold text-blue-400">Selected Options</h2>
                <div className="text-blue-400">Selected Token: {selectedToken?.label || ''}</div>
              </div>
              <button 
                onClick={() => setShowHolders(false)}
                className="text-blue-400 hover:text-blue-300"
              >
                ✕
              </button>
            </div>
            
            <div className="h-[608px] overflow-y-auto scrollbar-thin scrollbar-thumb-purple-500/20 scrollbar-track-transparent">
              <table className="w-full">
                <thead className="sticky top-0 bg-[#0A0B2E]">
                  <tr className="border-b border-blue-500/20">
                    <th className="text-blue-400 p-4 text-left">Rank</th>
                    <th className="text-blue-400 p-4 text-center">Follow</th>
                    <th className="text-blue-400 p-4 text-left">Address</th>
                    <th className="text-blue-400 p-4 text-left">Token</th>
                    <th className="text-blue-400 p-4 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-blue-500/10">
                  {holders.map((holder, index) => (
                    <tr key={holder.address} className="hover:bg-purple-500/5">
                      <td className="p-4 text-white/80">#{index + 1}</td>
                      <td className="p-4 text-center">
                        <Link 
                          href={`/WalletTracking/${holder.address}`}
                          className="px-4 py-1 bg-blue-500 hover:bg-blue-600 rounded text-white text-sm transition-colors"
                        >
                          Follow
                        </Link>
                      </td>
                      <td className="p-4">
                        <a 
                          href={`https://cardanoscan.io/address/${holder.address}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-400 hover:text-blue-300"
                        >
                          {`${holder.address.substring(0, 8)}...${holder.address.substring(holder.address.length - 8)}`}
                        </a>
                      </td>
                      <td className="p-4 text-white/80">
                        {selectedToken?.label || ''}
                      </td>
                      <td className="p-4 text-right font-mono text-white/80">
                        {holder.amount.toLocaleString()}
                        {typeof holder.percentage === 'number' && ` (${holder.percentage.toFixed(2)}%)`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
