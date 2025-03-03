import axios from 'axios';

export interface TapToolsVolumeToken {
  price: number;
  ticker: string;
  unit: string;
  volume: number;
  [key: string]: any;
}

export class TapToolsService {
  private apiKey: string;
  private baseUrl: string = 'https://openapi.taptools.io/api/v1';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  private async fetchWithAuth(endpoint: string, params: Record<string, any> = {}) {
    try {
      // Build query string from params
      const queryParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          queryParams.append(key, value.toString());
        }
      });

      const url = `${this.baseUrl}${endpoint}${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey
        }
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('TapTools API error:', error);
      throw error;
    }
  }

  async getTopVolumeTokens(perPage = 100): Promise<TapToolsVolumeToken[]> {
    try {
      const url = `${this.baseUrl}/token/top/volume`;
      const resp = await axios.get<TapToolsVolumeToken[]>(url, {
        headers: {
          accept: 'application/json',
          'X-API-Key': this.apiKey
        }
      });
      return resp.data.slice(0, perPage);
    } catch (err) {
      console.error('Error fetching top volume tokens:', err);
      return [];
    }
  }

  async getAddressInfo(address: string): Promise<Record<string, any> | null> {
    try {
      const baseUrl = 'https://openapi.taptools.io/api/v1/address/info';
      const resp = await axios.get(baseUrl, {
        headers: {
          accept: 'application/json',
          'X-API-Key': this.apiKey
        },
        params: { address }
      });
      return resp.data;
    } catch (err) {
      console.error(`Error fetching address info: ${err}`);
      return null;
    }
  }

  async getTokenPrices(units: string[]): Promise<Record<string, number>> {
    try {
      const url = 'https://openapi.taptools.io/api/v1/token/prices';
      const resp = await axios.post(url, units, {
        headers: {
          'Content-Type': 'application/json',
          accept: 'application/json',
          'X-API-Key': this.apiKey
        },
      });
      return resp.data;
    } catch (err) {
      console.error('Error fetching token prices:', err);
      return {};
    }
  }

  async getTokenPriceChg(unit: string, timeframes = '1h,4h,24h,7d,30d'): Promise<Record<string, number>> {
    try {
      const baseUrl = 'https://openapi.taptools.io/api/v1/token/prices/chg';
      const resp = await axios.get(baseUrl, {
        headers: {
          accept: 'application/json',
          'X-API-Key': this.apiKey
        },
        params: { unit, timeframes }
      });
      return resp.data;
    } catch (err) {
      console.error('Error fetching price change:', err);
      return {};
    }
  }

  async getTokenPools(unit: string, adaOnly = 1): Promise<any[]> {
    try {
      const url = 'https://openapi.taptools.io/api/v1/token/pools';
      const resp = await axios.get(url, {
        headers: {
          accept: 'application/json',
          'X-API-Key': this.apiKey
        },
        params: { unit, adaOnly }
      });
      return resp.data;
    } catch (err) {
      console.error('Error fetching token pools:', err);
      return [];
    }
  }

  async getTokenOhlcv(unit: string, interval = '1d', numIntervals = 30): Promise<any[]> {
    try {
      const url = 'https://openapi.taptools.io/api/v1/token/ohlcv';
      const resp = await axios.get(url, {
        headers: {
          accept: 'application/json',
          'X-API-Key': this.apiKey
        },
        params: { unit, interval, numIntervals }
      });
      return resp.data;
    } catch (err) {
      console.error('Error fetching OHLCV:', err);
      return [];
    }
  }

  async getTokenTradingStats(unit: string, timeframe = '24h'): Promise<Record<string, any>> {
    try {
      const url = 'https://openapi.taptools.io/api/v1/token/trading/stats';
      const resp = await axios.get(url, {
        headers: {
          accept: 'application/json',
          'X-API-Key': this.apiKey
        },
        params: { unit, timeframe }
      });
      return resp.data;
    } catch (err) {
      console.error('Error fetching trading stats:', err);
      return {};
    }
  }

  async getTokenMcap(unit: string): Promise<Record<string, any>> {
    try {
      const url = 'https://openapi.taptools.io/api/v1/token/mcap';
      const resp = await axios.get(url, {
        headers: {
          accept: 'application/json',
          'X-API-Key': this.apiKey
        },
        params: { unit }
      });
      return resp.data;
    } catch (err) {
      console.error('Error fetching mcap:', err);
      return {};
    }
  }

  async getTokenTrades(
    tokenUnit: string, 
    startTime?: number, 
    endTime?: number, 
    limit: number = 100
  ) {
    try {
      console.log(`Fetching trades for token ${tokenUnit} from ${startTime || 'beginning'} to ${endTime || 'now'}`);
      
      const params: Record<string, any> = {
        limit
      };
      
      if (startTime) {
        params.startTime = startTime;
      }
      
      if (endTime) {
        params.endTime = endTime;
      }
      
      const data = await this.fetchWithAuth(`/token/${tokenUnit}/trades`, params);
      
      if (!data || !Array.isArray(data.trades)) {
        console.warn('Invalid response format for token trades:', data);
        return [];
      }
      
      // Process and normalize the trade data
      return data.trades.map((trade: any) => ({
        hash: trade.txHash,
        time: trade.timestamp,
        tokenAAmount: trade.tokenAmount,
        tokenAName: trade.tokenTicker || trade.tokenName,
        tokenBAmount: trade.adaAmount,
        price: trade.price,
        action: trade.side === 'sell' ? 'sell' : 'buy',
        exchange: trade.dex || 'Unknown'
      }));
    } catch (error) {
      console.error(`Error fetching trades for token ${tokenUnit}:`, error);
      return [];
    }
  }

  async getTokenTradesInTimeRange(
    tokenUnit: string,
    startTime: number,
    endTime: number,
    limit: number = 100
  ) {
    return this.getTokenTrades(tokenUnit, startTime, endTime, limit);
  }

  async getTopTokenHolders(tokenUnit: string, limit: number = 50) {
    try {
      const data = await this.fetchWithAuth(`/token/${tokenUnit}/holders`, { limit });
      
      if (!data || !Array.isArray(data.holders)) {
        console.warn('Invalid response format for token holders:', data);
        return [];
      }
      
      return data.holders.map((holder: any) => ({
        address: holder.address,
        amount: holder.amount,
        percentage: holder.percentage,
        value: holder.value
      }));
    } catch (error) {
      console.error(`Error fetching holders for token ${tokenUnit}:`, error);
      return [];
    }
  }

  async getTokenDetails(tokenUnit: string) {
    try {
      const data = await this.fetchWithAuth(`/token/${tokenUnit}`);
      
      if (!data || !data.token) {
        console.warn('Invalid response format for token details:', data);
        return null;
      }
      
      return data.token;
    } catch (error) {
      console.error(`Error fetching details for token ${tokenUnit}:`, error);
      return null;
    }
  }

  async getTokenPriceHistory(
    tokenUnit: string,
    interval: 'hour' | 'day' | 'week' = 'day',
    limit: number = 30
  ) {
    try {
      const data = await this.fetchWithAuth(`/token/${tokenUnit}/price-history`, {
        interval,
        limit
      });
      
      if (!data || !Array.isArray(data.priceHistory)) {
        console.warn('Invalid response format for token price history:', data);
        return [];
      }
      
      return data.priceHistory;
    } catch (error) {
      console.error(`Error fetching price history for token ${tokenUnit}:`, error);
      return [];
    }
  }

  async getTokenMarketData(tokenUnit: string) {
    try {
      const data = await this.fetchWithAuth(`/token/${tokenUnit}/market-data`);
      
      if (!data || !data.marketData) {
        console.warn('Invalid response format for token market data:', data);
        return null;
      }
      
      return data.marketData;
    } catch (error) {
      console.error(`Error fetching market data for token ${tokenUnit}:`, error);
      return null;
    }
  }

  async getTopTokens(
    sortBy: 'marketCap' | 'liquidity' | 'volume' = 'marketCap',
    limit: number = 100,
    offset: number = 0
  ) {
    try {
      const data = await this.fetchWithAuth('/tokens', {
        sortBy,
        limit,
        offset
      });
      
      if (!data || !Array.isArray(data.tokens)) {
        console.warn('Invalid response format for top tokens:', data);
        return [];
      }
      
      return data.tokens;
    } catch (error) {
      console.error(`Error fetching top tokens by ${sortBy}:`, error);
      return [];
    }
  }
} 