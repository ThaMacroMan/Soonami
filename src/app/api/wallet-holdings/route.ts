import { NextResponse } from 'next/server';
import { TapToolsService } from '@/algos/taptools';

interface WalletPosition {
  adaBalance: number;
  adaValue: number;
  liquidValue: number;
  numFTs: number;
  numNFTs: number;
  positionsFt: {
    '24h': number;
    '30d': number;
    '7d': number;
    adaValue: number;
    balance: number;
    fingerprint: string;
    liquidBalance: number;
    liquidValue: number;
    price: number;
    ticker: string;
    unit: string;
  }[];
}

interface Trade {
  token?: string;
  action?: string;
  adaAmount?: string | number;
  tokenUnit?: string;
  tokenAUnit?: string;
  tokenBUnit?: string;
  tokenAName?: string;
  tokenBName?: string;
  tokenAAmount?: string | number;
  tokenBAmount?: string | number;
}

const tapTools = new TapToolsService(process.env.NEXT_PUBLIC_TAPTOOLS_API_KEY || '');

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const address = searchParams.get('address');

  if (!address) {
    return NextResponse.json({ error: 'Address is required' }, { status: 400 });
  }

  try {
    // Get wallet portfolio positions
    console.log('Fetching portfolio positions for address:', address);
    const positions = await tapTools.getPortfolioPositions(address).catch(error => {
      console.error('Error fetching portfolio positions:', error);
      return null;
    });
    
    // Get all trades directly using the TapTools service
    console.log('Fetching trades directly from TapTools API');
    const allTrades: Trade[] = await tapTools.getWalletTrades(address, {
      perPage: '1000',
      page: '1'
    }).catch(error => {
      console.error('Error fetching wallet trades:', error);
      return [];
    });
    
    if (!Array.isArray(allTrades)) {
      console.error('Invalid trades data:', allTrades);
      return NextResponse.json({ error: 'Invalid trades data received' }, { status: 500 });
    }
    
    console.log(`Found ${allTrades.length} trades for wallet`);
    
    // If positions data is valid, use it
    if (positions && positions.positionsFt && Array.isArray(positions.positionsFt)) {
      console.log(`Found ${positions.positionsFt.length} positions in wallet`);
      
      // Process positions and calculate totals from trades
      const holdings = positions.positionsFt.map((position) => {
        console.log('Processing position:', {
          ticker: position.ticker,
          unit: position.unit
        });
        
        // Filter trades for this specific token by ticker
        const tokenTrades = allTrades.filter((trade: Trade) => {
          // Check if the token ticker matches (case insensitive)
          const tradeTokenTicker = trade.token || trade.tokenAName || '';
          const positionTicker = position.ticker || '';
          
          return tradeTokenTicker.toLowerCase() === positionTicker.toLowerCase();
        });
        
        console.log(`Found ${tokenTrades.length} trades for token ${position.ticker}`);
        
        // Calculate total bought and sold
        let totalBought = 0;
        let totalSold = 0;
        
        tokenTrades.forEach((trade: Trade) => {
          if (trade.action && trade.action.toLowerCase() === 'buy') {
            totalBought += parseFloat(String(trade.adaAmount || 0));
          } else if (trade.action && trade.action.toLowerCase() === 'sell') {
            totalSold += parseFloat(String(trade.adaAmount || 0));
          }
        });
        
        return {
          token: position.ticker || 'Unknown',
          quantity: position.balance || 0,
          adaValue: position.adaValue || 0,
          totalBought: totalBought || 0,
          totalSold: totalSold || 0,
          pnl: position['24h'] || 0
        };
      });

      return NextResponse.json(holdings);
    }
    
    // Fallback to wallet tokens if positions data is not available
    console.log('Falling back to wallet tokens');
    const walletTokens = await tapTools.getWalletTokens(address).catch(error => {
      console.error('Error fetching wallet tokens:', error);
      return [];
    });
    
    if (!Array.isArray(walletTokens)) {
      console.error('Invalid wallet tokens data:', walletTokens);
      return NextResponse.json({ error: 'Invalid wallet tokens data received' }, { status: 500 });
    }
    
    console.log(`Found ${walletTokens.length} tokens in wallet`);
    
    // If no tokens found, return an empty array with a message
    if (walletTokens.length === 0) {
      // Try to get ADA balance from address info
      try {
        const addressInfo = await tapTools.getAddressInfo(address);
        if (addressInfo && addressInfo.lovelace) {
          const adaBalance = addressInfo.lovelace / 1000000; // Convert lovelace to ADA
          return NextResponse.json([{
            token: 'ADA',
            quantity: adaBalance,
            adaValue: adaBalance,
            totalBought: 0,
            totalSold: 0,
            pnl: 0
          }]);
        }
      } catch (error) {
        console.error('Error fetching address info:', error);
      }
      
      return NextResponse.json([]);
    }
    
    // Create a map of token tickers to trades
    const tokenTradesMap = new Map();
    allTrades.forEach(trade => {
      const ticker = trade.token || trade.tokenAName || '';
      if (!ticker) return;
      
      if (!tokenTradesMap.has(ticker)) {
        tokenTradesMap.set(ticker, []);
      }
      tokenTradesMap.get(ticker).push(trade);
    });
    
    // Process wallet tokens and calculate totals from trades
    const holdings = walletTokens.map(token => {
      const tokenName = token.name || 'Unknown';
      console.log('Processing token:', tokenName);
      
      // Get trades for this token
      const tokenTrades = tokenTradesMap.get(tokenName) || [];
      console.log(`Found ${tokenTrades.length} trades for token ${tokenName}`);
      
      // Calculate total bought and sold
      let totalBought = 0;
      let totalSold = 0;
      
      tokenTrades.forEach((trade: Trade) => {
        if (trade.action && trade.action.toLowerCase() === 'buy') {
          totalBought += parseFloat(String(trade.adaAmount || 0));
        } else if (trade.action && trade.action.toLowerCase() === 'sell') {
          totalSold += parseFloat(String(trade.adaAmount || 0));
        }
      });
      
      return {
        token: tokenName,
        quantity: token.amount || 0,
        adaValue: token.value || 0,
        totalBought: totalBought || 0,
        totalSold: totalSold || 0,
        pnl: 0 // We don't have 24h change data in this fallback
      };
    });

    return NextResponse.json(holdings);
  } catch (error: any) {
    console.error('Error fetching wallet holdings:', error);
    const errorMessage = error.response?.data?.message || error.message || 'Failed to fetch holdings';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}