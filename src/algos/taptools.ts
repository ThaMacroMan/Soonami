import axios from 'axios';

export interface TapToolsVolumeToken {
  price: number;
  ticker: string;
  unit: string;
  volume: number;
  [key: string]: any;
}

export class TapToolsService {
  private readonly apiKey: string;
  private readonly baseUrl = 'https://openapi.taptools.io/api/v1';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async getTopVolumeTokens(perPage = 10): Promise<TapToolsVolumeToken[]> {
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
      console.log(`Fetching address info for: ${address}`);
      const url = `${this.baseUrl}/address/info`;
      const resp = await axios.get(url, {
        headers: {
          accept: 'application/json',
          'X-API-Key': this.apiKey
        },
        params: { address }
      });
      
      // Log the response structure to help with debugging
      console.log('Address info response structure:', Object.keys(resp.data || {}));
      
      // Check if the response contains the addresses field
      if (resp.data && !resp.data.addresses && address.startsWith('stake')) {
        console.log('Response does not contain addresses field for stake address, checking account field');
        
        // Some APIs might return the addresses under a different field
        if (resp.data.account && resp.data.account.addresses) {
          console.log('Found addresses in account field');
          resp.data.addresses = resp.data.account.addresses;
        } else {
          console.log('No addresses found in the response for stake address');
        }
      }
      
      return resp.data;
    } catch (err) {
      console.error(`Error fetching address info: ${err}`);
      return null;
    }
  }

  async getTokenPrices(units: string[]): Promise<Record<string, number>> {
    try {
      const url = `${this.baseUrl}/token/prices`;
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
      const url = `${this.baseUrl}/token/prices/chg`;
      const resp = await axios.get(url, {
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
      const url = `${this.baseUrl}/token/pools`;
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
      const url = `${this.baseUrl}/token/ohlcv`;
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
      const url = `${this.baseUrl}/token/trading/stats`;
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
      const url = `${this.baseUrl}/token/mcap`;
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
      
      const url = `${this.baseUrl}/token/trades`;
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
      const response = await axios.get(`${this.baseUrl}/address/trades`, {
        headers: {
          accept: 'application/json',
          'X-API-Key': this.apiKey
        },
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
      const url = `${this.baseUrl}/token/holders`;
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
      
      const apiKey = process.env.NEXT_PUBLIC_TAPTOOLS_API_KEY;
      if (!apiKey) {
        console.error('NEXT_PUBLIC_TAPTOOLS_API_KEY is not set in environment variables');
        return [];
      }

      const response = await axios.get(`${this.baseUrl}/token/holders/top`, {
        headers: {
          'accept': 'application/json',
          'X-API-Key': apiKey
        },
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
      // Check if the address is a stake address
      if (address.startsWith('stake')) {
        console.log('Stake address detected, fetching associated payment addresses for tokens...');
        
        // Get address info to find associated payment addresses
        const addressInfo = await this.getAddressInfo(address);
        
        if (!addressInfo || !addressInfo.addresses || !Array.isArray(addressInfo.addresses) || addressInfo.addresses.length === 0) {
          console.log('No payment addresses found for stake address:', address);
          return []; // Return empty array if no payment addresses found
        }
        
        console.log(`Found ${addressInfo.addresses.length} payment addresses for stake address:`, address);
        
        // Fetch tokens for each payment address and combine results
        const allTokens: any[] = [];
        const processedPolicyIds = new Set(); // To avoid duplicate tokens
        
        for (const paymentAddress of addressInfo.addresses) {
          try {
            console.log(`Fetching tokens for payment address: ${paymentAddress}`);
            const response = await axios.get(`${this.baseUrl}/wallet/tokens`, {
              params: { address: paymentAddress },
              headers: {
                'accept': 'application/json',
                'X-API-Key': this.apiKey
              }
            });
            
            if (response.status === 200) {
              const tokens = response.data.tokens || response.data || [];
              console.log(`Found ${tokens.length} tokens for payment address: ${paymentAddress}`);
              
              // Process tokens and avoid duplicates
              for (const token of tokens) {
                const policyId = token.policyId || '';
                if (!processedPolicyIds.has(policyId)) {
                  processedPolicyIds.add(policyId);
                  allTokens.push({
                    name: token.name || token.ticker || token.policyId || 'Unknown',
                    amount: token.amount || token.balance || 0,
                    value: token.value || token.adaValue || 0,
                    policyId: policyId
                  });
                }
              }
            }
          } catch (error) {
            console.error(`Error fetching tokens for payment address ${paymentAddress}:`, error);
            // Continue with other addresses even if one fails
          }
        }
        
        console.log(`Total unique tokens found across all payment addresses: ${allTokens.length}`);
        return allTokens;
      }
      
      // If not a stake address, proceed with the original implementation
      const response = await axios.get(`${this.baseUrl}/wallet/tokens`, {
        params: { address },
        headers: {
          'accept': 'application/json',
          'X-API-Key': this.apiKey
        }
      });

      if (response.status === 200) {
        // Handle different response formats
        const tokens = response.data.tokens || response.data || [];
        return tokens.map((token: any) => ({
          name: token.name || token.ticker || token.policyId || 'Unknown',
          amount: token.amount || token.balance || 0,
          value: token.value || token.adaValue || 0,
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
    const { unit = '', page = '1', perPage = '100' } = options;

    try {
      // Check if the address is a stake address
      if (address.startsWith('stake')) {
        console.log('Stake address detected, fetching associated payment addresses...');
        
        // Get address info to find associated payment addresses
        const addressInfo = await this.getAddressInfo(address);
        
        if (!addressInfo || !addressInfo.addresses || !Array.isArray(addressInfo.addresses) || addressInfo.addresses.length === 0) {
          console.log('No payment addresses found for stake address:', address);
          
          // Try direct API call even for stake addresses as a fallback
          try {
            console.log('Attempting direct API call for stake address');
            const response = await axios.get(`${this.baseUrl}/wallet/trades/tokens`, {
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
            
            if (response.data && Array.isArray(response.data)) {
              console.log(`Found ${response.data.length} trades directly for stake address`);
              return response.data;
            }
          } catch (directError) {
            console.error('Direct API call for stake address failed:', directError);
          }
          
          return []; // Return empty array if no payment addresses found and direct call failed
        }
        
        console.log(`Found ${addressInfo.addresses.length} payment addresses for stake address:`, address);
        console.log('Payment addresses:', addressInfo.addresses);
        
        // Fetch trades for each payment address and combine results
        let allTrades: any[] = [];
        
        for (const paymentAddress of addressInfo.addresses) {
          try {
            console.log(`Fetching trades for payment address: ${paymentAddress}, unit: ${unit}`);
            const response = await axios.get(`${this.baseUrl}/wallet/trades/tokens`, {
              headers: {
                'accept': 'application/json',
                'X-API-Key': this.apiKey
              },
              params: {
                address: paymentAddress,
                unit,
                page,
                perPage
              }
            });
            
            if (response.data && Array.isArray(response.data)) {
              console.log(`Found ${response.data.length} trades for payment address: ${paymentAddress}`);
              allTrades = [...allTrades, ...response.data];
            }
          } catch (error) {
            console.error(`Error fetching trades for payment address ${paymentAddress}:`, error);
            // Continue with other addresses even if one fails
          }
        }
        
        console.log(`Total trades found across all payment addresses: ${allTrades.length}`);
        return allTrades;
      }
      
      // If not a stake address, proceed with the original implementation
      console.log(`Fetching trades for payment address: ${address}, unit: ${unit}`);
      const response = await axios.get(`${this.baseUrl}/wallet/trades/tokens`, {
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

  async getPortfolioPositions(address: string): Promise<any> {
    try {
      console.log(`[getPortfolioPositions] Fetching portfolio positions for address: ${address}`);
      console.log(`[getPortfolioPositions] API URL: ${this.baseUrl}/wallet/portfolio/positions`);
      console.log(`[getPortfolioPositions] API Key: ${this.apiKey ? this.apiKey.substring(0, 4) + '...' : 'missing'}`);
      
      const response = await axios.get(`${this.baseUrl}/wallet/portfolio/positions`, {
        headers: {
          accept: 'application/json',
          'X-API-Key': this.apiKey
        },
        params: {
          address
        }
      });

      console.log(`[getPortfolioPositions] Response status: ${response.status}`);
      console.log(`[getPortfolioPositions] Response data keys: ${Object.keys(response.data || {})}`);
      
      return response.data;
    } catch (err: any) {
      console.error('Error fetching portfolio positions:', err);
      console.log(`[getPortfolioPositions] Error status: ${err.response?.status}`);
      console.log(`[getPortfolioPositions] Error data: ${JSON.stringify(err.response?.data || {})}`);
      
      // Try an alternative endpoint if the first one fails with 404
      if (err.response?.status === 404) {
        try {
          console.log(`[getPortfolioPositions] Trying alternative endpoint: ${this.baseUrl}/wallet/portfolio`);
          
          const altResponse = await axios.get(`${this.baseUrl}/wallet/portfolio`, {
            headers: {
              accept: 'application/json',
              'X-API-Key': this.apiKey
            },
            params: {
              address
            }
          });
          
          console.log(`[getPortfolioPositions] Alternative response status: ${altResponse.status}`);
          console.log(`[getPortfolioPositions] Alternative response data keys: ${Object.keys(altResponse.data || {})}`);
          
          return altResponse.data;
        } catch (altErr: any) {
          console.error('Error fetching from alternative endpoint:', altErr);
          console.log(`[getPortfolioPositions] Alternative error status: ${altErr.response?.status}`);
          console.log(`[getPortfolioPositions] Alternative error data: ${JSON.stringify(altErr.response?.data || {})}`);
        }
      }
      
      return null;
    }
  }

  async getPortfolioTrend(address: string, timeframe = '30d'): Promise<any> {
    try {
      console.log(`[getPortfolioTrend] Fetching portfolio trend for address: ${address}, timeframe: ${timeframe}`);
      console.log(`[getPortfolioTrend] API URL: ${this.baseUrl}/wallet/value/trended`);
      console.log(`[getPortfolioTrend] API Key: ${this.apiKey ? this.apiKey.substring(0, 4) + '...' : 'missing'}`);
      
      const response = await axios.get(`${this.baseUrl}/wallet/value/trended`, {
        headers: {
          accept: 'application/json',
          'X-API-Key': this.apiKey
        },
        params: {
          address,
          timeframe
        }
      });

      console.log(`[getPortfolioTrend] Response status: ${response.status}`);
      console.log(`[getPortfolioTrend] Response data type: ${typeof response.data}`);
      console.log(`[getPortfolioTrend] Response data length: ${Array.isArray(response.data) ? response.data.length : 'not an array'}`);
      
      return response.data;
    } catch (err: any) {
      console.error('Error fetching portfolio trend:', err);
      console.log(`[getPortfolioTrend] Error status: ${err.response?.status}`);
      console.log(`[getPortfolioTrend] Error data: ${JSON.stringify(err.response?.data || {})}`);
      
      // If the API doesn't support this endpoint, use our own implementation
      try {
        console.log(`[getPortfolioTrend] Falling back to calculating trend from wallet trades`);
        // Get wallet trades to calculate portfolio value over time
        const trades = await this.getWalletTrades(address);
        console.log(`[getPortfolioTrend] Retrieved ${trades?.length || 0} trades for calculation`);
        
        if (trades && trades.length > 0) {
          return this.calculatePortfolioTrend(trades, timeframe);
        } else {
          console.log(`[getPortfolioTrend] No trades found for calculation`);
        }
      } catch (innerErr: any) {
        console.error('Error calculating portfolio trend from trades:', innerErr);
        console.log(`[getPortfolioTrend] Inner error message: ${innerErr.message}`);
      }
      
      // Return empty array if all methods fail
      console.log(`[getPortfolioTrend] All methods failed, returning empty array`);
      return [];
    }
  }

  // Calculate portfolio trend from trades
  private calculatePortfolioTrend(trades: any[], timeframe: string): any[] {
    console.log('Calculating portfolio trend from trades:', trades.length);
    
    // Sort trades by date
    const sortedTrades = [...trades].sort((a, b) => 
      new Date(a.time).getTime() - new Date(b.time).getTime()
    );
    
    // Get start date based on timeframe
    const now = new Date();
    let days = 30;
    
    if (timeframe === '7d') days = 7;
    if (timeframe === '14d') days = 14;
    if (timeframe === '30d') days = 30;
    if (timeframe === '90d') days = 90;
    if (timeframe === '180d') days = 180;
    if (timeframe === '1y') days = 365;
    if (timeframe === 'all') days = 1825; // 5 years
    
    const startDate = new Date(now);
    startDate.setDate(startDate.getDate() - days);
    
    // Filter trades by date
    const filteredTrades = sortedTrades.filter(trade => 
      new Date(trade.time) >= startDate
    );
    
    console.log('Filtered trades:', filteredTrades.length);
    
    // Calculate cumulative portfolio value
    let portfolioValue = 0;
    const dataPoints: {time: number; value: number}[] = [];
    
    // Group trades by day
    const tradesByDay = new Map<string, number>();
    
    filteredTrades.forEach(trade => {
      const date = new Date(trade.time);
      const dateKey = Math.floor(date.getTime() / 1000); // Convert to seconds
      
      const isBuy = trade.action.toLowerCase().includes('buy');
      const changeAmount = trade.adaAmount || 0;
      
      if (isBuy) {
        portfolioValue += changeAmount;
      } else {
        portfolioValue -= changeAmount;
      }
      
      tradesByDay.set(dateKey.toString(), portfolioValue);
    });
    
    // Convert to array of data points
    for (const [time, value] of tradesByDay.entries()) {
      dataPoints.push({
        time: parseInt(time),
        value: Math.max(0, value) // Ensure value is not negative
      });
    }
    
    console.log('Generated data points:', dataPoints.length);
    
    // If we have no data points, create a default one
    if (dataPoints.length === 0) {
      dataPoints.push({
        time: Math.floor(Date.now() / 1000),
        value: 0
      });
    }
    
    return dataPoints;
  }
} 