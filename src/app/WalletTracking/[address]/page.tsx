"use client";
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import tokenListData from '@/algos/data/token_list.json';
import axios from 'axios';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';

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

// Add type definition for token list data
interface TokenListData {
  tokens: TokenData[];
  timestamp: string;
}

interface TokenData {
  ticker: string;
  unit: string;
  category: string;
  imageUrl?: string;
  liquidity: number;
  price: number;
}

// Type assertion for token list
const tokenList = (tokenListData as TokenListData).tokens;


interface AutocompleteProps {
  onSelect: (unit: string) => void;
}

const TokenAutocomplete: React.FC<AutocompleteProps> = ({ onSelect }) => {
  const [query, setQuery] = useState('');
  const [filteredTokens, setFilteredTokens] = useState<TokenData[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (query) {
      const results = tokenList.filter((token: TokenData) =>
        token.ticker.toLowerCase().includes(query.toLowerCase())
      );
      setFilteredTokens(results);
      setIsOpen(true);
    } else {
      setFilteredTokens([]);
      setIsOpen(false);
    }
  }, [query]);

  const handleSelect = (token: TokenData | 'all' = 'all') => {
    setQuery(token === 'all' ? 'All Tokens' : token.ticker);
    onSelect(token === 'all' ? 'all' : token.unit);
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search for a token or type 'all'"
        className="w-full bg-[#0A0B2E]/60 text-white/90 p-1 rounded border border-purple-500/20"
      />
      {isOpen && (
        <ul className="absolute z-50 w-full mt-1 max-h-48 overflow-auto bg-[#0A0B2E] border border-blue-500/20 rounded-lg shadow-lg">
          <li 
            onClick={() => handleSelect('all')}
            className="px-3 py-2 text-purple-400 hover:bg-purple-500/10 cursor-pointer font-semibold"
          >
            All Tokens
          </li>
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

type ViewMode = 'portfolio' | 'transactions' | 'holdings';

export default function AddressPage() {
  const params = useParams();
  const router = useRouter();
  const [viewMode, setViewMode] = useState<ViewMode>('portfolio');
  const [trades, setTrades] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentPage, ] = useState(1);
  const [totalPages, ] = useState(5);
  const [tokenName, setTokenName] = useState<string | null>(null);

  // Add new state for filtered trades
  const [filteredTrades, setFilteredTrades] = useState<any[]>([]);

  // Add new state for holdings
  const [holdings, setHoldings] = useState<any[]>([]);

  // Add new state for portfolio trend
  const [portfolioTrend, setPortfolioTrend] = useState<any>({ 
    data: [], 
    totalChange: { value: 0, percentage: 0 },
    transactions: []
  });
  const [isLoadingPortfolio, setIsLoadingPortfolio] = useState(false);

  // Extract address and ensure it's a string
  const address = typeof params.address === 'string' ? params.address : '';
  
  // Keep only the filters state
  const [filters, setFilters] = useState({
    timeFrame: "all",
    action: "all",
    token: "all"
  });

  // Get token from URL query parameters
  useEffect(() => {
    // Check if we're in the browser environment
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const tokenParam = urlParams.get('token');
      const tokenNameParam = urlParams.get('tokenName');
      
      if (tokenParam && tokenParam !== 'all') {
        setFilters(prev => ({ ...prev, token: tokenParam }));
      }
      
      if (tokenNameParam) {
        setTokenName(tokenNameParam);
      }
    }
  }, []);

  // Fetch data when component mounts or filters change
  useEffect(() => {
    fetchTradeData(1);
    // Also fetch portfolio trend data on initial load
    fetchPortfolioTrend();
  }, [filters.token, address]);

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

  // Toggle buttons
  const ViewToggle = () => (
    <div className="flex gap-2 mb-4">
      <button
        onClick={() => setViewMode('transactions')}
        className={`px-4 py-2 rounded-lg transition-colors ${
          viewMode === 'transactions' 
            ? 'bg-purple-500 text-white' 
            : 'bg-purple-500/20 text-purple-300 hover:bg-purple-500/30'
        }`}
      >
        Transactions
      </button>
      <button
        onClick={() => setViewMode('holdings')}
        className={`px-4 py-2 rounded-lg transition-colors ${
          viewMode === 'holdings' 
            ? 'bg-purple-500 text-white' 
            : 'bg-purple-500/20 text-purple-300 hover:bg-purple-500/30'
        }`}
      >
        Holdings
      </button>
      <button
        onClick={() => setViewMode('portfolio')}
        className={`px-4 py-2 rounded-lg transition-colors ${
          viewMode === 'portfolio' 
            ? 'bg-purple-500 text-white' 
            : 'bg-purple-500/20 text-purple-300 hover:bg-purple-500/30'
        }`}
      >
        Portfolio Trend
      </button>
    </div>
  );

  // Add function to fetch holdings
  const fetchHoldings = async () => {
    try {
      setIsLoading(true);
      const response = await axios.get(`/api/wallet-holdings?address=${address}`);
      setHoldings(response.data);
    } catch (error) {
      console.error('Error fetching holdings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Add function to fetch portfolio trend
  const fetchPortfolioTrend = async () => {
    try {
      setIsLoadingPortfolio(true);
      const response = await axios.get(`/api/portfolio-trend?address=${address}&timeFrame=${filters.timeFrame}&token=${filters.token}`);
      setPortfolioTrend(response.data);
    } catch (error) {
      console.error('Error fetching portfolio trend:', error);
    } finally {
      setIsLoadingPortfolio(false);
    }
  };

  // Update useEffect to fetch holdings when tab changes
  useEffect(() => {
    if (viewMode === 'holdings') {
      fetchHoldings();
    }
    if (viewMode === 'portfolio') {
      fetchPortfolioTrend();
    }
  }, [viewMode, address]);

  // Update useEffect to fetch portfolio trend when timeFrame changes
  useEffect(() => {
    if (viewMode === 'portfolio') {
      fetchPortfolioTrend();
    }
  }, [filters.timeFrame, filters.token]);

  // Content display based on view mode
  const ContentDisplay = () => {
    if (viewMode === 'transactions') {
      return (
        <div className="bg-purple-900/20 rounded-lg p-4">
          {/* Current transaction view */}
          <div className="h-[608px] rounded-xl border border-blue-500/20"> {/* Height for 10 rows (56px each) plus header (48px) */}
            <div className="h-full overflow-y-auto scrollbar-thin scrollbar-thumb-purple-500/20 scrollbar-track-transparent">
              <table className="w-full">
                <thead className="sticky top-0 bg-[#0A0B2E] z-10">
                  <tr className="bg-purple-500/10">
                    <th className="px-6 py-4 text-left text-base font-medium text-purple-400">Time</th>
                    <th className="px-6 py-4 text-left text-base font-medium text-purple-400">Action</th>
                    <th className="px-6 py-4 text-left text-base font-medium text-purple-400">Token</th>
                    <th className="px-6 py-4 text-right text-base font-medium text-purple-400">Amount</th>
                    <th className="px-6 py-4 text-left text-base font-medium text-purple-400">Exchange</th>
                    <th className="px-6 py-4 text-left text-base font-medium text-purple-400">Transaction</th>
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
                        <div className="flex items-center justify-center h-full text-purple-400 text-base">
                          No transactions found
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredTrades.map((trade, index) => (
                      <tr key={index} className="transition-colors hover:bg-purple-500/5">
                        <td className="px-6 py-4 text-left text-base font-medium text-purple-400">{trade.time}</td>
                        <td className="px-6 py-4 text-left text-base font-medium text-purple-400">{trade.action}</td>
                        <td className="px-6 py-4 text-left text-base font-medium text-purple-400">{trade.tokenAName}</td>
                        <td className="px-6 py-4 text-right text-base font-medium text-purple-400">{Number(trade.tokenAAmount).toLocaleString()}</td>
                        <td className="px-6 py-4 text-left text-base font-medium text-purple-400">
                          {trade.exchange}
                        </td>
                        <td className="px-6 py-4 text-left text-base font-medium text-purple-400">
                          <a href={`https://cardanoscan.io/transaction/${trade.hash}`} target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:text-purple-300 underline">View</a>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      );
    }

    if (viewMode === 'portfolio') {
      return (
        <div className="bg-purple-900/20 rounded-lg p-4">
          <div className="h-[608px] rounded-xl border border-blue-500/20">
            <div className="h-full p-6">
              {isLoadingPortfolio ? (
                <div className="flex items-center justify-center h-full">
                  <div className="flex space-x-2">
                    <div className="w-2 h-2 bg-purple-500 rounded-full animate-ping"></div>
                    <div className="w-2 h-2 bg-purple-500 rounded-full animate-ping delay-100"></div>
                    <div className="w-2 h-2 bg-purple-500 rounded-full animate-ping delay-200"></div>
                  </div>
                </div>
              ) : (
                <div className="h-full flex flex-col">
                  <div className="flex justify-between items-center mb-6">
                    <div>
                      <h3 className="text-xl font-semibold text-purple-400">Portfolio Value</h3>
                      <div className="flex items-center mt-2">
                        <span className="text-3xl font-bold text-white">
                          {portfolioTrend.data && portfolioTrend.data.length > 0 
                            ? `${portfolioTrend.data[portfolioTrend.data.length - 1].value.toLocaleString()} ₳` 
                            : '0 ₳'}
                        </span>
                        <span className={`ml-3 px-3 py-1 rounded text-base font-semibold ${
                          portfolioTrend.totalChange && portfolioTrend.totalChange.percentage >= 0 
                            ? 'bg-green-500/20 text-green-400' 
                            : 'bg-red-500/20 text-red-400'
                        }`}>
                          {portfolioTrend.totalChange && portfolioTrend.totalChange.percentage >= 0 ? '+' : ''}
                          {portfolioTrend.totalChange ? portfolioTrend.totalChange.percentage : 0}%
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end">
                      <div className="flex gap-2 mb-2">
                        {['7d', '30d', '90d', '1y', 'all'].map((period) => (
                          <button
                            key={period}
                            onClick={() => setFilters(prev => ({ ...prev, timeFrame: period }))}
                            className={`px-3 py-1 rounded-lg text-sm transition-colors ${
                              filters.timeFrame === period
                                ? 'bg-purple-500 text-white'
                                : 'bg-purple-500/20 text-purple-300 hover:bg-purple-500/30'
                            }`}
                          >
                            {period === 'all' ? 'ALL' : period}
                          </button>
                        ))}
                      </div>
                      <div className="flex items-center gap-4 text-sm">
                        <div className="flex items-center">
                          <div className="w-3 h-3 bg-green-500 mr-1"></div>
                          <span className="text-green-400">Buy</span>
                        </div>
                        <div className="flex items-center">
                          <div className="w-3 h-3 bg-red-500 mr-1"></div>
                          <span className="text-red-400">Sell</span>
                        </div>
                        <div className="text-purple-400">
                          {portfolioTrend.transactions ? portfolioTrend.transactions.length : 0} transactions
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex-grow">
                    {portfolioTrend.data && portfolioTrend.data.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart
                          data={portfolioTrend.data}
                          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="#333366" />
                          <XAxis 
                            dataKey="date" 
                            stroke="#a78bfa"
                            tickFormatter={(value) => {
                              const date = new Date(value);
                              return `${date.getMonth() + 1}/${date.getDate()}`;
                            }}
                          />
                          <YAxis 
                            stroke="#a78bfa"
                            tickFormatter={(value) => value.toLocaleString()}
                          />
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: '#1a1a4a', 
                              borderColor: '#6d28d9',
                              color: '#a78bfa'
                            }}
                            formatter={(value: any) => [`${value.toLocaleString()} ₳`, 'Value']}
                            labelFormatter={(label) => {
                              const date = new Date(label);
                              return date.toLocaleDateString();
                            }}
                          />
                          <Line 
                            type="monotone" 
                            dataKey="value" 
                            stroke="#8884d8" 
                            strokeWidth={2}
                            dot={false}
                            activeDot={{ r: 6, strokeWidth: 2 }}
                          />
                          
                          {/* Add transaction markers */}
                          {portfolioTrend.transactions && portfolioTrend.transactions.map((tx: any, index: number) => {
                            // Find the closest data point to this transaction date
                            const txDate = new Date(tx.date).toISOString().split('T')[0];
                            const dataPoint = portfolioTrend.data.find((d: any) => d.date === txDate);
                            
                            if (!dataPoint) return null;
                            
                            const isBuy = tx.action.toLowerCase().includes('buy');
                            const color = isBuy ? '#10b981' : '#ef4444';
                            
                            return (
                              <ReferenceLine
                                key={`tx-${index}`}
                                x={txDate}
                                stroke={color}
                                strokeWidth={2}
                                label={{
                                  position: 'top',
                                  value: isBuy ? 'Buy' : 'Sell',
                                  fill: color,
                                  fontSize: 12,
                                  fontWeight: 'bold'
                                }}
                              />
                            );
                          })}
                        </LineChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <div className="text-center">
                          <p className="text-purple-400 text-lg">No portfolio data available</p>
                          <p className="text-purple-300 text-sm mt-2">Try a different time period or check back later</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="bg-purple-900/20 rounded-lg p-4">
        <div className="h-[608px] rounded-xl border border-blue-500/20">
          <div className="h-full overflow-y-auto scrollbar-thin scrollbar-thumb-purple-500/20 scrollbar-track-transparent">
            <table className="w-full">
              <thead className="sticky top-0 bg-[#0A0B2E] z-10">
                <tr className="bg-purple-500/10">
                  <th className="px-6 py-4 text-left text-sm font-medium text-purple-400">Token</th>
                  <th className="px-6 py-4 text-right text-sm font-medium text-purple-400">Quantity</th>
                  <th className="px-6 py-4 text-right text-sm font-medium text-purple-400">ADA Value</th>
                  <th className="px-6 py-4 text-right text-sm font-medium text-purple-400">Total Bought (ADA)</th>
                  <th className="px-6 py-4 text-right text-sm font-medium text-purple-400">Total Sold (ADA)</th>
                  <th className="px-6 py-4 text-right text-sm font-medium text-purple-400">24h Change</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-purple-500/10">
                {holdings.map((holding, index) => (
                  <tr key={index} className="transition-colors hover:bg-purple-500/5">
                    <td className="px-6 py-4 text-left text-sm font-medium text-purple-400">{holding.token}</td>
                    <td className="px-6 py-4 text-right text-sm font-medium text-purple-400">{Number(holding.quantity).toLocaleString()}</td>
                    <td className="px-6 py-4 text-right text-sm font-medium text-purple-400">{Number(holding.adaValue).toLocaleString()} ₳</td>
                    <td className="px-6 py-4 text-right text-sm font-medium text-purple-400">{Number(holding.totalBought).toLocaleString()} ₳</td>
                    <td className="px-6 py-4 text-right text-sm font-medium text-purple-400">{Number(holding.totalSold).toLocaleString()} ₳</td>
                    <td className="px-6 py-4 text-right text-sm font-medium text-purple-400">{holding.pnl}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  useEffect(() => {
    console.log('Initial state:', {
      address,
      timeFrame: filters.timeFrame,
      action: filters.action,
      token: filters.token
    });
  }, [address, filters]);

  // Function to handle back button click
  const handleBackClick = () => {
    router.push(`/WalletTracking?token=${filters.token}&tokenName=${tokenName}`);
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
              <button
                onClick={handleBackClick}
                className="h-12 w-12 rounded-full bg-purple-500/20 border border-purple-500/50 flex items-center justify-center hover:bg-purple-500/30 transition-colors mr-2"
                title="Back to Token"
              >
                <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </button>
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
              {tokenName && (
                <div className="ml-4 px-3 py-1 bg-purple-500/20 rounded-full border border-purple-500/30">
                  <span className="text-purple-300 font-medium">{tokenName}</span>
                </div>
              )}
            </div>
            <div className="flex gap-4">
              <button
                onClick={() => fetchTradeData(currentPage)}
                disabled={isLoading}
                className="px-4 py-2 bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/50 rounded-lg text-purple-400 transition-colors disabled:opacity-50"
              >
                {isLoading ? 'Loading...' : 'Apply Filters'}
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

          {/* Toggle and Token Selector */}
          <ViewToggle />

          {/* Transactions Table - fixed height with scroll */}
          <ContentDisplay />

          {/* Pagination - fixed height */}
          <div className="h-[50px] flex justify-between items-center">
            <button onClick={() => fetchTradeData(currentPage - 1)} disabled={currentPage === 1} className="px-4 py-2 bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/50 rounded-lg text-purple-400">
              Previous
            </button>
            <button onClick={() => fetchTradeData(currentPage + 1)} disabled={currentPage === totalPages} className="px-4 py-2 bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/50 rounded-lg text-purple-400">
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}