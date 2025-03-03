import { TapToolsService } from './taptools';
import axios from 'axios';

const API_KEY = process.env.NEXT_PUBLIC_TAPTOOLS_API_KEY || '';
const baseUrl = 'https://openapi.taptools.io/api/v1';
const tapTools = new TapToolsService(API_KEY);

interface TradeHistory {
  action: string;
  hash: string;
  time: number;
  tokenA: string;
  tokenAAmount: number;
  tokenAName: string;
  tokenB: string;
  tokenBAmount: number;
  tokenBName: string;
}

export async function getTokenTradeHistory(address?: string, unit?: string) {
  try {
    // Only check for top holders if both unit and address are provided
    if (unit && address) {
      console.log('Checking trades for:', { unit, address });
      
      const url = `${baseUrl}/token/trades`;
      const response = await axios.get(url, {
        headers: {
          'Content-Type': 'application/json',
          'accept': 'application/json',
          'X-API-Key': API_KEY
        },
        params: {
          unit,
          address,
          timeframe: '30d',
          sortBy: 'amount',
          order: 'desc',
          perPage: 100
        }
      });

      if (response.status !== 200) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return response.data;
    }
    
    return [];
  } catch (error) {
    console.error('Error fetching trade history:', error);
    throw error;
  }
}