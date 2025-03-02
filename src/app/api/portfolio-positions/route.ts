import { NextResponse } from 'next/server';
import axios from 'axios';

const BASE_URL = 'https://openapi.taptools.io/api/v1';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const address = searchParams.get('address');

  console.log('=== API Route Debug Logs ===');
  console.log('1. Request received for address:', address);

  if (!address) {
    return NextResponse.json({ error: 'Address is required' }, { status: 400 });
  }

  try {
    // Using the address/info endpoint that's working in taptools.ts
    const response = await axios.get(`${BASE_URL}/address/info`, {
      headers: {
        'accept': 'application/json',
        'X-API-Key': process.env.NEXT_PUBLIC_TAPTOOLS_API_KEY
      },
      params: { address }
    });

    console.log('2. Raw API Response:', response.data);

    // Transform the response into our portfolio format
    const tokens = response.data.tokens || [];
    const portfolioData = {
      adaBalance: response.data.lovelace || 0,
      adaValue: response.data.totalValue || 0,
      liquidValue: response.data.totalValue || 0,
      numFTs: tokens.length,
      numNFTs: 0,
      positionsFt: tokens.map((token: any) => ({
        adaValue: token.value || 0,
        balance: token.quantity || 0,
        fingerprint: token.fingerprint || '',
        liquidBalance: token.quantity || 0,
        liquidValue: token.value || 0,
        price: token.price || 0,
        ticker: token.ticker || token.name || 'Unknown',
        unit: token.unit || token.policyId || '',
        '24h': 0,
        '7d': 0,
        '30d': 0
      })),
      positionsLp: [],
      positionsNft: []
    };

    console.log('3. Transformed Data:', portfolioData);

    return NextResponse.json(portfolioData);

  } catch (error: any) {
    console.error('=== API Route Error Details ===');
    console.error('Error:', {
      type: error.constructor.name,
      message: error.message,
      status: error.response?.status,
      data: error.response?.data,
      config: {
        url: error.config?.url,
        method: error.config?.method,
        params: error.config?.params,
        headers: {
          ...error.config?.headers,
          'X-API-Key': '[HIDDEN]'
        }
      }
    });

    return NextResponse.json(
      { 
        error: 'Failed to fetch portfolio data', 
        details: error.response?.data?.error || error.message
      }, 
      { status: error.response?.status || 500 }
    );
  }
} 