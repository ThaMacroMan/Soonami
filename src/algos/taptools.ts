import axios from 'axios';

export interface TapToolsVolumeToken {
  price: number;
  ticker: string;
  unit: string;
  volume: number;
  [key: string]: any;
}

interface PortfolioPosition {
  tokenName?: string;
  policyId?: string;
  amount?: number;
  liquidValue?: number;
}

interface PortfolioResponse {
  positionsFt: PortfolioPosition[];
}

export class TapToolsService {
  private readonly apiKey: string;
  private readonly baseUrl = 'https://api.taptools.io/api/v1';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async getTopVolumeTokens(perPage = 10): Promise<TapToolsVolumeToken[]> {
    try {
      const url = 'https://openapi.taptools.io/api/v1/token/top/volume';
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

  async getTokenPriceChg(unit: string, timeframes = '1h,4h,24h'): Promise<Record<string, number>> {
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

  async getTokenTrades(unit: string, timeframe = '30d', minAmount = 1000, perPage = 100): Promise<{trades: any[], addresses: string[]}> {
    try {
      console.log('Getting trades for unit:', unit);
      
      const url = 'https://openapi.taptools.io/api/v1/token/trades';
      const resp = await axios.get(url, {
        headers: {
          'accept': 'application/json',
          'X-API-Key': this.apiKey
        },
        params: {
          unit,
          timeframe,
          minAmount,
          sortBy: 'amount',
          order: 'desc',
          perPage: Math.min(perPage, 50)
        }
      });

      if (resp.status === 200) {
        console.log('Trade response:', resp.data);
        const trades = Array.isArray(resp.data) ? resp.data : [];
        
        // Get unique addresses and their total trade amounts
        const addressMap = new Map<string, number>();
        
        trades.forEach(trade => {
          if (trade.address) {
            const currentAmount = addressMap.get(trade.address) || 0;
            addressMap.set(trade.address, currentAmount + (trade.amount || trade.tokenAmount || 0));
          }
        });

        // Convert to array and sort by total amount
        const sortedAddresses = Array.from(addressMap.entries())
          .sort((a, b) => b[1] - a[1])
          .map(([address]) => address);

        console.log('Sorted addresses:', sortedAddresses);
        return { trades, addresses: sortedAddresses };
      }

      if (resp.status === 429) {
        console.log('Rate limited, waiting before retry...');
        await new Promise(resolve => setTimeout(resolve, 1000));
        return this.getTokenTrades(unit, timeframe, minAmount, perPage);
      }

      return { trades: [], addresses: [] };
    } catch (err: any) {
      if (err.response?.status === 429) {
        console.log('Rate limited, waiting before retry...');
        await new Promise(resolve => setTimeout(resolve, 1000));
        return this.getTokenTrades(unit, timeframe, minAmount, perPage);
      }
      console.error('getTokenTrades error:', err);
      return { trades: [], addresses: [] };
    }
  }

  async getAddressHistory(address: string, unit: string): Promise<any[]> {
    try {
      const response = await axios.get('/api/address-trades', {
        params: {
          address,
          unit
        }
      });

      if (response.status === 200) {
        const trades = Array.isArray(response.data) ? response.data : [];
        return trades.map(trade => ({
          time: trade.time * 1000,
          action: trade.action || 'Unknown',
          tokenName: trade.tokenName || trade.tokenAName || 'Unknown',
          amount: trade.amount || trade.tokenAAmount || 0,
          hash: trade.hash,
          exchange: trade.exchange || 'Unknown',
          address: trade.counterparty || trade.address || 'Unknown'
        }));
      }
      return [];
    } catch (err) {
      console.error('getAddressHistory error:', err);
      return [];
    }
  }

  async getTopTokenHolders(unit: string, page = 1, perPage = 20): Promise<any[]> {
    try {
      const url = 'https://openapi.taptools.io/api/v1/token/holders';
      const resp = await axios.get(url, {
        headers: {
          accept: 'application/json',
          'X-API-Key': this.apiKey
        },
        params: {
          unit,
          page,
          perPage,
          sortBy: 'amount',
          order: 'desc'
        }
      });
      if (resp.status === 200) {
        return resp.data;
      } else {
        console.error(`Error ${resp.status} fetching top holders for ${unit}:`, resp.data);
        return [];
      }
    } catch (err: any) {
      console.error('getTopTokenHolders error:', err);
      if (axios.isAxiosError(err) && err.response?.status === 429) {
        console.log('Rate limited, waiting before retry...');
        await new Promise(resolve => setTimeout(resolve, 1000));
        return this.getTopTokenHolders(unit, page, perPage);
      }
      return [];
    }
  }

  async getTokenHolders(unit: string, options: {
    perPage?: number;
    sortBy?: string;
    order?: 'asc' | 'desc';
  } = {}): Promise<any[]> {
    try {
      console.log('Getting holders for unit:', unit, 'with options:', options);
      
      const response = await axios.get('/api/token-holders', {
        params: {
          unit,
          limit: options.perPage || 50
        }
      });

      if (response.status === 200 && Array.isArray(response.data)) {
        console.log('Holders response:', response.data);
        return response.data;
      }

      console.error('Unexpected response format:', response.data);
      return [];
    } catch (err: any) {
      console.error('getTokenHolders error:', err);
      return [];
    }
  }

  async getWalletTokens(address: string) {
    try {
      const response = await axios.get(`${this.baseUrl}/wallet/tokens`, {
        params: { address },
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      });

      if (response.status === 200) {
        return response.data.tokens.map((token: any) => ({
          name: token.name || token.policyId || 'Unknown',
          amount: token.amount || 0,
          value: token.value || 0,
          policyId: token.policyId || ''
        }));
      }
      return [];
    } catch (err) {
      console.error('getWalletTokens error:', err);
      return [];
    }
  }

  async getWalletTrades(address: string, options: { unit?: string; page?: string; perPage?: string } = {}): Promise<any> {
    const { unit, page = '1', perPage = '100' } = options;

    try {
      const response = await axios.get('https://openapi.taptools.io/api/v1/wallet/trades/tokens', {
        headers: {
          'accept': 'application/json',
          'X-API-Key': this.apiKey
        },
        params: {
          address,
          unit,
          page,
          perPage
        }
      });

      return response.data; // Return the data from the response
    } catch (error) {
      console.error('Error fetching wallet trades:', error);
      throw error; // Rethrow the error for handling in the calling function
    }
  }
} 