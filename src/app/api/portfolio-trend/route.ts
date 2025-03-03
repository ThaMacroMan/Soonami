import { NextResponse } from 'next/server';
import { TapToolsService } from '@/algos/taptools';

const tapTools = new TapToolsService(process.env.NEXT_PUBLIC_TAPTOOLS_API_KEY || '');

// Define transaction type
interface Transaction {
  date: string;
  action: string;
  amount: number;
  value: number;
  hash: string;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const address = searchParams.get('address');
  const timeFrame = searchParams.get('timeFrame') || '30d';
  const token = searchParams.get('token') || 'all';

  if (!address) {
    return NextResponse.json({ error: 'Address is required' }, { status: 400 });
  }

  try {
    // Fetch real portfolio trend data
    const trendResponse = await tapTools.getPortfolioTrend(address, timeFrame);
    console.log('Portfolio trend response:', trendResponse);
    
    // Format the data for our chart
    const portfolioData = Array.isArray(trendResponse) ? trendResponse.map(point => ({
      date: new Date(point.time * 1000).toISOString().split('T')[0],
      value: point.value
    })) : [];
    
    console.log('Formatted portfolio data:', portfolioData);
    
    // Calculate total change
    let totalChange = { value: 0, percentage: 0 };
    if (portfolioData.length >= 2) {
      const firstValue = portfolioData[0].value;
      const lastValue = portfolioData[portfolioData.length - 1].value;
      const change = lastValue - firstValue;
      const percentage = firstValue !== 0 ? (change / firstValue) * 100 : 0;
      
      totalChange = {
        value: Math.round(change * 100) / 100,
        percentage: Math.round(percentage * 100) / 100
      };
    }
    
    // Fetch transaction data
    let transactions: Transaction[] = [];
    try {
      // Get transactions for this address and token
      const response = await tapTools.getAddressHistory(address, token === 'all' ? '*' : token);
      
      // Format transactions for chart display
      transactions = response.map(trade => ({
        date: new Date(trade.time).toISOString().split('T')[0],
        action: trade.action,
        amount: trade.tokenAAmount,
        value: trade.adaAmount || 0,
        hash: trade.hash
      }));
      
      // Filter transactions based on timeFrame
      const oldestDate = getOldestDateFromTimeFrame(timeFrame);
      transactions = transactions.filter(tx => new Date(tx.date) >= oldestDate);
      
    } catch (error) {
      console.error('Error fetching transactions:', error);
      // Continue with empty transactions array if fetch fails
    }
    
    return NextResponse.json({
      data: portfolioData,
      timeFrame,
      totalChange,
      transactions
    });
  } catch (error: any) {
    console.error('Error fetching portfolio trend:', error);
    const errorMessage = error.response?.data?.message || error.message || 'Failed to fetch portfolio trend';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

function getOldestDateFromTimeFrame(timeFrame: string) {
  const now = new Date();
  let days = 30;
  
  if (timeFrame === '7d') days = 7;
  if (timeFrame === '14d') days = 14;
  if (timeFrame === '30d') days = 30;
  if (timeFrame === '90d') days = 90;
  if (timeFrame === '180d') days = 180;
  if (timeFrame === '1y') days = 365;
  if (timeFrame === 'all') days = 1825; // 5 years
  
  const oldestDate = new Date(now);
  oldestDate.setDate(oldestDate.getDate() - days);
  return oldestDate;
} 