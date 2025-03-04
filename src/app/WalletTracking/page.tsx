"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { TapToolsService } from '@/algos/taptools';
import Image from 'next/image';
import tokenListData from '@/algos/data/token_list.json';

const tapTools = new TapToolsService(process.env.NEXT_PUBLIC_TAPTOOLS_API_KEY || '');

// Define interfaces
interface TokenData {
  ticker: string;
  unit: string;
  category: string;
  imageUrl?: string;
  liquidity: number;
  price: number;
}

interface TokenListData {
  tokens: TokenData[];
  timestamp: string;
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
  category: string;
  imageUrl?: string;
}

// Define view modes
type ViewMode = 'tokens' | 'holders' | 'analysis';

export default function WalletTracking() {
  const router = useRouter();
  const [selectedToken, setSelectedToken] = useState<TokenOption | null>(null);

  const [holders, setHolders] = useState<TokenHolder[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [, setSelectedAddress] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('tokens');

  // Type assertion for imported JSON
  const typedTokenList = tokenListData as TokenListData;
  
  // Group tokens by category
  const tokensByCategory = typedTokenList.tokens.reduce((acc, token) => {
    const category = token.category || 'Other';
    if (!acc[category]) acc[category] = [];
    acc[category].push({
      label: token.ticker,
      value: token.unit,
      description: token.ticker,
      category: token.category,
      imageUrl: token.imageUrl
    });
    return acc;
  }, {} as Record<string, TokenOption[]>);

  // Use the grouped tokens directly
  const tokenOptions = Object.values(tokensByCategory).flat();

  // Get unique categories
  const categories = ['All', ...new Set(Object.keys(tokensByCategory))];

  // Filter tokens based on search and category
  const filteredTokens = Object.entries(tokensByCategory).reduce((acc, [category, tokens]) => {
    if (selectedCategory !== 'All' && category !== selectedCategory) {
      return acc;
    }
    
    const filtered = tokens.filter(token => 
      token.label.toLowerCase().includes(searchQuery.toLowerCase())
    );
    
    if (filtered.length > 0) {
      acc[category] = filtered;
    }
    return acc;
  }, {} as Record<string, TokenOption[]>);

  // Check URL parameters on component mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const tokenParam = urlParams.get('token');
      
      if (tokenParam) {
        // Find the token in our options
        const token = tokenOptions.find(t => t.value === tokenParam);
        
        if (token) {
          setSelectedToken(token);
          fetchTokenHolders(token);
        }
      }
    }
  }, []);

  const fetchTokenHolders = async (token: TokenOption) => {
    setIsLoading(true);
    setViewMode('holders');
    
    try {
      console.log('Fetching holders for token unit:', token.value);
      const topHolders = await tapTools.getTokenHolders(token.value, {
        perPage: 20,
        sortBy: 'amount',
        order: 'desc'
      });
      setHolders(topHolders);
      
      // Scroll to top of page
      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    } catch (error) {
      console.error('Error fetching holders:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCardClick = async (token: TokenOption) => {
    setSelectedToken(token);
    fetchTokenHolders(token);
  };

  const handleHolderClick = (address: string) => {
    setSelectedAddress(address);
    router.push(`/WalletTracking/${address}?token=${selectedToken?.value}&tokenName=${selectedToken?.label}`);
  };

  const handleBackClick = () => {
    setViewMode('tokens');
  };

  // Render the token selection view
  const renderTokensView = () => (
    <div className="min-h-screen p-8 space-y-8">
      {/* Search and Filter Controls */}
      <div className="flex gap-4 mb-8">
        <input
          type="text"
          placeholder="Search tokens..."
          className="px-4 py-2 bg-purple-900/20 border border-purple-500/20 rounded-lg focus:outline-none focus:border-purple-500 text-white"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="px-4 py-2 bg-purple-900/20 border border-purple-500/20 rounded-lg focus:outline-none focus:border-purple-500 text-white"
        >
          {categories.map(category => (
            <option key={category} value={category}>{category}</option>
          ))}
        </select>
      </div>

      {/* Token Grid */}
      {Object.entries(filteredTokens).map(([category, tokens]) => (
        <div key={category} className="space-y-4">
          <h2 className="text-xl font-semibold text-purple-400 border-b border-purple-500/20 pb-2">
            {category}
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {tokens.map((token) => (
              <button
                key={token.value}
                onClick={() => handleCardClick(token)}
                className="p-4 bg-purple-900/20 hover:bg-purple-900/30 rounded-lg border border-purple-500/20 transition-colors flex flex-col items-center space-y-2"
              >
                {token.imageUrl ? (
                  <Image
                    src={token.imageUrl}
                    alt={token.label}
                    width={40}
                    height={40}
                    className="rounded-full"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-purple-500/20" />
                )}
                <span className="text-purple-300 font-semibold">{token.label}</span>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );

  // Render the holders view
  const renderHoldersView = () => (
    <div className="min-h-screen p-8">
      <div className="max-w-7xl mx-auto bg-[#0A0B2E] border border-purple-500/20 rounded-lg shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-purple-500/20">
          <div className="flex items-center space-x-4">
            <button
              onClick={handleBackClick}
              className="h-12 w-12 rounded-full bg-purple-500/20 border border-purple-500/50 flex items-center justify-center hover:bg-purple-500/30 transition-colors"
              title="Back to Tokens"
            >
              <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
            <h3 className="text-xl font-semibold text-purple-300">
              Top Holders - {selectedToken?.label} - Click a wallet to view their holdings
            </h3>
          </div>
        </div>
        
        {/* Body */}
        <div className="p-4">
          <div className="h-[800px] overflow-y-auto scrollbar-thin scrollbar-thumb-purple-500/20 scrollbar-track-transparent">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <div className="flex flex-col items-center space-y-4">
                  <div className="flex space-x-3">
                    <div className="w-3 h-3 bg-purple-500 rounded-full animate-bounce"></div>
                    <div className="w-3 h-3 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    <div className="w-3 h-3 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                  </div>
                  <p className="text-purple-300">Loading token holders...</p>
                </div>
              </div>
            ) : (
              <table className="w-full">
                <thead className="sticky top-0 bg-[#0A0B2E]">
                  <tr className="border-b border-blue-500/20">
                    <th className="text-blue-400 p-4 text-left">Rank</th>
                    <th className="text-blue-400 p-4 text-left">Address</th>
                    <th className="text-blue-400 p-4 text-left">Token</th>
                    <th className="text-blue-400 p-4 text-right">Amount</th>
                    <th className="text-blue-400 p-4 text-right">Percentage</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-blue-500/10">
                  {holders.map((holder, index) => (
                    <tr 
                      key={holder.address} 
                      className="hover:bg-purple-500/5 cursor-pointer transition-colors"
                      onClick={() => handleHolderClick(holder.address)}
                    >
                      <td className="p-4 text-white/80">#{index + 1}</td>
                      <td className="p-4">
                        <a 
                          href={`https://cardanoscan.io/address/${holder.address}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-400 hover:text-blue-300"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {`${holder.address.substring(0, 8)}...${holder.address.substring(holder.address.length - 8)}`}
                        </a>
                      </td>
                      <td className="p-4 text-white/80">
                        {selectedToken?.label || ''}
                      </td>
                      <td className="p-4 text-right font-mono text-white/80">
                        {holder.amount.toLocaleString()}
                      </td>
                      <td className="p-4 text-right font-mono text-white/80">
                        {(holder.percentage * 100).toFixed(2)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  // Main render
  return (
    <>
      {viewMode === 'tokens' && renderTokensView()}
      {viewMode === 'holders' && renderHoldersView()}
    </>
  );
}
