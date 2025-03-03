import { NextResponse } from 'next/server';
import axios from 'axios';

const baseUrl = 'https://openapi.taptools.io/api/v1';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const address = searchParams.get('address');
  const unit = searchParams.get('unit');
  
  if (!address) {
    return NextResponse.json({ error: 'Address is required' }, { status: 400 });
  }

  try {
    console.log('Fetching trades for:', { address, unit });
    
    const response = await axios.get(`${baseUrl}/address/trades`, {
      headers: {
        'accept': 'application/json',
        'X-API-Key': process.env.NEXT_PUBLIC_TAPTOOLS_API_KEY || ''
      },
      params: {
        address,
        unit: unit || '*',
        timeframe: '30d',
        sortBy: 'time',
        order: 'desc'
      }
    });

    if (response.status === 200) {
      console.log('API response:', response.data);
      return NextResponse.json(response.data);
    }

    throw new Error(`API returned status ${response.status}`);
  } catch (error: any) {
    console.error('API error details:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status
    });

    // Handle rate limiting
    if (error.response?.status === 429) {
      return NextResponse.json(
        { error: 'Rate limit exceeded, please try again' },
        { status: 429 }
      );
    }

    return NextResponse.json(
      { 
        error: 'Failed to fetch trades',
        details: error.message 
      }, 
      { status: error.response?.status || 500 }
    );
  }
} 