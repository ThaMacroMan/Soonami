import { NextResponse } from 'next/server';
import { TapToolsService } from '@/algos/taptools';

export const dynamic = 'force-dynamic';
export const runtime = 'edge';

const tapTools = new TapToolsService(process.env.NEXT_PUBLIC_TAPTOOLS_API_KEY || '');

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const address = searchParams.get('address');
  const unit = searchParams.get('unit') || ''; // Ensure this is the correct parameter
  const page = searchParams.get('page') || '1'; // Default to page 1
  const perPage = searchParams.get('perPage') || '100'; // Default to 100 items

  if (!address) {
    return NextResponse.json({ error: 'Address is required' }, { status: 400 });
  }

  try {
    console.log(`Fetching trades for address: ${address}, unit: ${unit}, page: ${page}, perPage: ${perPage}`);

    // Use the TapTools service to get wallet trades
    const response = await tapTools.getWalletTrades(address, { unit, page, perPage });
    
    // Log the entire response
    console.log('Raw trades response:', response);

    // Transform the response into the desired format
    const trades = response.map((trade: any) => ({
      action: trade.action,
      hash: trade.hash,
      time: new Date(trade.time * 1000).toLocaleString(),
      tokenA: trade.tokenA,
      tokenAAmount: trade.tokenAAmount,
      tokenAName: trade.tokenAName,
      tokenB: trade.tokenB,
      tokenBAmount: trade.tokenBAmount,
      tokenBName: trade.tokenBName,
      exchange: trade.exchange
    }));

    console.log(`Transformed ${trades.length} trades`);
    return NextResponse.json(trades);
  } catch (error: any) {
    console.error('API Route Error:', {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data,
      url: error.config?.url
    });

    return NextResponse.json(
      { error: 'Failed to fetch trades', details: error.response?.data?.message || error.message },
      { status: error.response?.status || 500 }
    );
  }
} 