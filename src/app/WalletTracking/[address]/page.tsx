"use client";
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { TapToolsService } from '@/algos/taptools';
import { Autocomplete as HeroAutocomplete, AutocompleteItem } from "@heroui/autocomplete";
import tokenListData from '@/algos/data/token_list.json';
import axios from 'axios';

const tapTools = new TapToolsService(process.env.NEXT_PUBLIC_TAPTOOLS_API_KEY || '');

const timeFrameOptions = [
  { label: "All Time", value: "all" },
  { label: "30 Days", value: "30d" },
  { label: "7 Days", value: "7d" },
  { label: "24 Hours", value: "24h" }
];

const actionOptions = [
  { label: "All Actions", value: "all" },
  { label: "Buy", value: "buy" },
  { label: "Sell", value: "sell" },
  { label: "Add Liquidity", value: "add" },
  { label: "Remove Liquidity", value: "remove" },
  { label: "ZAP", value: "zap" }
];

const tokenList = tokenListData.tokens;

// Define the Token interface
interface Token {
  liquidity: number;
  price: number;
  ticker: string;
  unit: string;
}

interface AutocompleteProps {
  onSelect: (unit: string) => void;
}

const TokenAutocomplete: React.FC<AutocompleteProps> = ({ onSelect }) => {
  const [query, setQuery] = useState('');
  const [filteredTokens, setFilteredTokens] = useState<Token[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (query) {
      const results = tokenList.filter(token =>
        token.ticker.toLowerCase().includes(query.toLowerCase())
      );
      setFilteredTokens(results);
      setIsOpen(true);
    } else {
      setFilteredTokens([]);
      setIsOpen(false);
    }
  }, [query]);

  const handleSelect = (token: Token) => {
    setQuery(token.ticker);
    onSelect(token.unit);
    setIsOpen(false); // Close dropdown after selection
  };

  return (
    <div className="relative">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search for a token"
        className="w-full bg-[#0A0B2E]/60 text-white/90 p-1 rounded border border-purple-500/20"
      />
      {isOpen && filteredTokens.length > 0 && (
        <ul className="absolute z-50 w-full mt-1 max-h-48 overflow-auto bg-[#0A0B2E] border border-blue-500/20 rounded-lg shadow-lg">
          {filteredTokens.map((token) => (
            <li 
              key={token.unit}
              onClick={() => handleSelect(token)}
              className="px-3 py-2 text-purple-400 hover:bg-purple-500/10 cursor-pointer"
            >
              {token.ticker}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default function AddressPage() {
  const params = useParams();
  const router = useRouter();
  const [selectedToken, setSelectedToken] = useState<string>("");
  const [trades, setTrades] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tokens, setTokens] = useState<any[]>([]);
  const [showVault, setShowVault] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(5); // Set this based on your API response

  // Add new state for filtered trades
  const [filteredTrades, setFilteredTrades] = useState<any[]>([]);

  // Extract address and ensure it's a string
  const address = typeof params.address === 'string' ? params.address : '';
  
  // Log initial state
  useEffect(() => {
    console.log('Initial state:', {
      address,
      timeFrame: selectedToken,
      action: selectedToken,
      token: selectedToken
    });
  }, [address, selectedToken]);

  // Keep only the filters state
  const [filters, setFilters] = useState({
    timeFrame: "30d",
    action: "all",
    token: "all"
  });

  // Update fetchTradeData function
  const fetchTradeData = async (page: number = 1) => {
    try {
      setIsLoading(true);
      console.log('Fetching trades with params:', {
        address,
        timeFrame: filters.timeFrame,
        unit: filters.token,
        page,
      });

      const response = await axios.get('/api/address-trades', {
        params: {
          address,
          unit: filters.token === 'all' ? '' : filters.token, // Don't filter by token if 'all' is selected
          page,
          perPage: 100, // Increased to get more trades
        }
      });

      console.log('API Response data length:', response.data.length);
      
      // Store all trades in state
      const allTrades = response.data;
      setTrades(allTrades); // Store original trades
      
      // Apply filters to the new data
      filterTrades(allTrades);
    } catch (error) {
      console.error('Error fetching trade data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Update filterTrades function to handle all action types
  const filterTrades = (tradesToFilter: any[]) => {
    let filtered = [...tradesToFilter];

    // Filter by action type if not "all"
    if (filters.action !== 'all') {
      filtered = filtered.filter(trade => 
        trade.action.toLowerCase() === filters.action.toLowerCase()
      );
    } else {
      // When "all" is selected, show all trades including Add Liquidity, Remove Liquidity, and ZAP
      filtered = tradesToFilter;
    }

    console.log('Original trades count:', tradesToFilter.length);
    console.log('Filtered trades count:', filtered.length);
    console.log('Action types in filtered data:', [...new Set(filtered.map(t => t.action))]);
    
    setFilteredTrades(filtered);
  };

  // Update handleFilterChange function
  const handleFilterChange = (type: 'timeFrame' | 'action' | 'token', value: string) => {
    const newFilters = { ...filters, [type]: value };
    setFilters(newFilters);
    
    if (type === 'action') {
      // Re-filter using original trades data
      filterTrades(trades);
    }
  };

  const fetchTokens = async () => {
    if (!address) return;
    
    try {
      setIsLoading(true);
      const tokenList = await tapTools.getWalletTokens(address as string);
      setTokens(tokenList);
      setShowVault(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(prev => prev + 1);
      fetchTradeData(currentPage + 1);
    }
  };

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(prev => prev - 1);
      fetchTradeData(currentPage - 1);
    }
  };

  return (
    <div className="min-h-screen">
      {/* Background effect - only keep the radial gradients */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(56,56,255,0.15),transparent_50%)]"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(120,0,255,0.15),transparent_50%)]"></div>
      </div>

      {/* Content container */}
      <div className="relative z-10 max-w-7xl mx-auto py-4">
        <div className="flex flex-col gap-4 p-6 rounded-[2rem] border border-purple-500/30 shadow-[0_0_15px_rgba(168,85,247,0.2)] bg-[#0A0B2E]/90 backdrop-blur-sm">
          {/* Wallet Info Section - fixed height */}
          <div className="h-[80px] flex items-center justify-between rounded-xl p-4 border border-blue-500/20">
            <div className="flex items-center space-x-4">
              <div className="h-12 w-12 rounded-full bg-purple-500/20 border border-purple-500/50 flex items-center justify-center">
                <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
              </div>
              <div>
                <div className="text-sm text-purple-400">Wallet Address</div>
                <div className="font-mono text-white/90 text-sm">
                  {typeof address === 'string' ? 
                    `${address.substring(0, 8)}...${address.substring(address.length - 8)}` : 
                    ''}
                </div>
              </div>
            </div>
            <div className="flex gap-4">
              <button
                onClick={() => fetchTradeData(currentPage)}
                disabled={isLoading}
                className="px-4 py-2 bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/50 rounded-lg text-purple-400 transition-colors disabled:opacity-50"
              >
                {isLoading ? 'Loading...' : 'Apply Filters'}
              </button>
              <button 
                onClick={() => router.push(`/WalletTracking/portfolio/${address}`)}
                className="px-4 py-2 bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/50 rounded-lg text-purple-400 transition-colors"
              >
                Vault
              </button>
            </div>
          </div>

          {/* Filters Section - fixed height */}
          <div className="h-[90px] grid grid-cols-3 gap-4">
            {/* Time Frame Filter */}
            <div className="bg-[#0A0B2E]/40 rounded-xl p-2 border border-blue-500/20">
              <div className="text-sm text-purple-400 mb-1">Time Frame</div>
              <select 
                value={filters.timeFrame}
                onChange={(e) => handleFilterChange('timeFrame', e.target.value)}
                className="w-full bg-[#0A0B2E]/60 text-purple-400 p-1 rounded border border-purple-500/20"
              >
                {timeFrameOptions.map(option => (
                  <option key={option.value} value={option.value} className="bg-[#0A0B2E]">
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Action Type Filter */}
            <div className="bg-[#0A0B2E]/40 rounded-xl p-2 border border-blue-500/20">
              <div className="text-sm text-purple-400 mb-1">Action Type</div>
              <select 
                value={filters.action}
                onChange={(e) => handleFilterChange('action', e.target.value)}
                className="w-full bg-[#0A0B2E]/60 text-purple-400 p-1 rounded border border-purple-500/20"
              >
                {actionOptions.map(option => (
                  <option key={option.value} value={option.value} className="bg-[#0A0B2E]">
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Token Filter */}
            <div className="bg-[#0A0B2E]/40 rounded-xl p-2 border border-blue-500/20">
              <div className="text-sm text-purple-400 mb-1">Token</div>
              <TokenAutocomplete onSelect={(unit) => handleFilterChange('token', unit)} />
            </div>
          </div>

          {/* Transactions Table - fixed height with scroll */}
          <div className="h-[608px] rounded-xl border border-blue-500/20"> {/* Height for 10 rows (56px each) plus header (48px) */}
            <div className="h-full overflow-y-auto scrollbar-thin scrollbar-thumb-purple-500/20 scrollbar-track-transparent">
              <table className="w-full">
                <thead className="sticky top-0 bg-[#0A0B2E] z-10">
                  <tr className="bg-purple-500/10">
                    <th className="px-6 py-4 text-left text-sm font-medium text-purple-400">Time</th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-purple-400">Action</th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-purple-400">Token</th>
                    <th className="px-6 py-4 text-right text-sm font-medium text-purple-400">Amount</th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-purple-400">Exchange</th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-purple-400">Transaction</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-purple-500/10">
                  {isLoading ? (
                    <tr>
                      <td colSpan={6} className="h-[560px]"> {/* Height for 10 rows */}
                        <div className="flex items-center justify-center h-full">
                          <div className="flex space-x-2">
                            <div className="w-2 h-2 bg-purple-500 rounded-full animate-ping"></div>
                            <div className="w-2 h-2 bg-purple-500 rounded-full animate-ping delay-100"></div>
                            <div className="w-2 h-2 bg-purple-500 rounded-full animate-ping delay-200"></div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ) : filteredTrades.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="h-[560px]">
                        <div className="flex items-center justify-center h-full text-purple-400">
                          No transactions found
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredTrades.map((trade, index) => (
                      <tr key={index} className="transition-colors hover:bg-purple-500/5">
                        <td className="px-6 py-4 text-left text-sm font-medium text-purple-400">{trade.time}</td>
                        <td className="px-6 py-4 text-left text-sm font-medium text-purple-400">{trade.action}</td>
                        <td className="px-6 py-4 text-left text-sm font-medium text-purple-400">{trade.tokenAName}</td>
                        <td className="px-6 py-4 text-right text-sm font-medium text-purple-400">{Number(trade.tokenAAmount).toLocaleString()}</td>
                        <td className="px-6 py-4 text-left text-sm font-medium text-purple-400">
                          {trade.exchange}
                        </td>
                        <td className="px-6 py-4 text-left text-sm font-medium text-purple-400">
                          <a href={`https://cardanoscan.io/transaction/${trade.hash}`} target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:text-purple-300 underline">View</a>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {showVault && (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center">
              <div className="bg-black/90 border border-blue-500/30 rounded-xl p-8 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl text-blue-500">Token Vault</h2>
                  <button 
                    onClick={() => setShowVault(false)}
                    className="text-blue-500 hover:text-blue-400"
                  >
                    Close
                  </button>
                </div>
                
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-blue-500/30">
                      <th className="text-blue-500 p-4 text-left">Token</th>
                      <th className="text-blue-500 p-4 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tokens.map((token, index) => (
                      <tr key={index} className="border-b border-blue-500/10">
                        <td className="text-white p-4">{token.name}</td>
                        <td className="text-white p-4 text-right">{Number(token.amount).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Pagination - fixed height */}
          <div className="h-[50px] flex justify-between items-center">
            <button onClick={handlePreviousPage} disabled={currentPage === 1} className="px-4 py-2 bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/50 rounded-lg text-purple-400">
              Previous
            </button>
            <button onClick={handleNextPage} disabled={currentPage === totalPages} className="px-4 py-2 bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/50 rounded-lg text-purple-400">
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}