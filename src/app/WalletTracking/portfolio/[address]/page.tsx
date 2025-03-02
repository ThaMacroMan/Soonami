"use client";
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { TapToolsService } from '@/algos/taptools';
import axios from 'axios';

interface PortfolioData {
  adaBalance: number;
  adaValue: number;
  liquidValue: number;
  numFTs: number;
  numNFTs: number;
  positionsFt: {
    policyId: string;
    assetName: string;
    quantity: number;
    adaValue: number;
  }[];
  positionsLp: any[];
  positionsNft: any[];
}

export default function PortfolioPage() {
  const params = useParams();
  const [isLoading, setIsLoading] = useState(false);
  const [portfolioData, setPortfolioData] = useState<PortfolioData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const address = typeof params.address === 'string' ? params.address : '';

  const fetchPortfolioData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      console.log('Fetching data for address:', address);

      const response = await axios.get('/api/portfolio-positions', {
        params: { address }
      });
      
      console.log('API Response:', response.data);
      setPortfolioData(response.data);
      
    } catch (error: any) {
      console.error('Error fetching portfolio data:', error);
      const errorDetails = error.response?.data?.details || error.message;
      setError(`Failed to fetch portfolio data: ${errorDetails}`);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    console.log('useEffect triggered with address:', address);
    if (address) {
      fetchPortfolioData();
    }
  }, [address]);

  return (
    <div className="min-h-screen">
      {/* Background effect */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(56,56,255,0.15),transparent_50%)]"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(120,0,255,0.15),transparent_50%)]"></div>
      </div>

      {/* Content container */}
      <div className="relative z-10 max-w-7xl mx-auto py-4">
        <div className="flex flex-col gap-4 p-6 rounded-[2rem] border border-purple-500/30 shadow-[0_0_15px_rgba(168,85,247,0.2)] bg-[#0A0B2E]/90 backdrop-blur-sm h-[920px]">
          <h1 className="text-2xl font-bold text-purple-400">Token Portfolio</h1>
          
          {isLoading ? (
            <div className="flex items-center justify-center h-20 space-x-2">
              <div className="w-2 h-2 bg-purple-500 rounded-full animate-ping"></div>
              <div className="w-2 h-2 bg-purple-500 rounded-full animate-ping delay-100"></div>
              <div className="w-2 h-2 bg-purple-500 rounded-full animate-ping delay-200"></div>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-purple-500/20 scrollbar-track-transparent">
              <table className="w-full">
                <thead className="sticky top-0 bg-[#0A0B2E] z-10">
                  <tr className="bg-purple-500/10">
                    <th className="px-6 py-4 text-left text-sm font-medium text-purple-400">Token</th>
                    <th className="px-6 py-4 text-right text-sm font-medium text-purple-400">Quantity</th>
                    <th className="px-6 py-4 text-right text-sm font-medium text-purple-400">ADA Value</th>
                    <th className="px-6 py-4 text-right text-sm font-medium text-purple-400">Total Bought (ADA)</th>
                    <th className="px-6 py-4 text-right text-sm font-medium text-purple-400">Total Sold (ADA)</th>
                    <th className="px-6 py-4 text-right text-sm font-medium text-purple-400">PNL %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-purple-500/10">
                  {portfolioData?.positionsFt.map((position, index) => (
                    <tr key={index} className="hover:bg-purple-500/5">
                      <td className="px-6 py-4 text-sm text-purple-400">{position.assetName}</td>
                      <td className="px-6 py-4 text-right text-sm text-purple-400">{position.quantity.toLocaleString()}</td>
                      <td className="px-6 py-4 text-right text-sm text-purple-400">{position.adaValue.toLocaleString()} ₳</td>
                      <td className="px-6 py-4 text-right text-sm text-purple-400">UNKNOWN</td>
                      <td className="px-6 py-4 text-right text-sm text-purple-400">UNKNOWN</td>
                      <td className="px-6 py-4 text-right text-sm text-purple-400">UNKNOWN</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 