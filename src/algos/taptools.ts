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

  async getTokenTrades(unit: string, timeframe = '7d', minAmount = 1000, perPage = 50): Promise<any[]> {
    try {
      const url = 'https://openapi.taptools.io/api/v1/token/trades';
      const resp = await axios.get(url, {
        headers: {
          accept: 'application/json',
          'X-API-Key': this.apiKey
        },
        params: {
          unit,
          timeframe,
          minAmount,
          sortBy: 'amount',
          order: 'desc',
          perPage
        }
      });
      if (resp.status === 200) {
        return resp.data;
      } else {
        console.error(`Error ${resp.status} fetching trades for ${unit}:`, resp.data);
        return [];
      }
    } catch (err) {
      console.error('getTokenTrades error:', err);
      return [];
    }
  }

  async getTopTokenHolders(unit: string, page = 1, perPage = 20): Promise<any[]> {
    try {
      const url = 'https://openapi.taptools.io/api/v1/token/holders/top';
      const resp = await axios.get(url, {
        headers: {
          accept: 'application/json',
          'X-API-Key': this.apiKey
        },
        params: {
          unit,
          page,
          perPage
        }
      });
      if (resp.status === 200) {
        return resp.data;
      } else {
        console.error(`Error ${resp.status} fetching top holders for ${unit}:`, resp.data);
        return [];
      }
    } catch (err) {
      console.error('getTopTokenHolders error:', err);
      return [];
    }
  }
} 