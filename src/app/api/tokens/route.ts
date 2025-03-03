import { NextResponse } from 'next/server';
import axios from 'axios';

const baseUrl = 'https://openapi.taptools.io/api/v1';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const address = searchParams.get('address');
  
  if (!address) {
    return NextResponse.json({ error: 'Address is required' }, { status: 400 });
  }

  const apiKey = process.env.NEXT_PUBLIC_TAPTOOLS_API_KEY;
  if (!apiKey) {
    console.error('API key is missing');
    return NextResponse.json({ error: 'API configuration error' }, { status: 500 });
  }

  try {
    console.log('Fetching tokens for address:', address);
    
    const response = await axios.get(`${baseUrl}/address/tokens`, {
      headers: {
        'accept': 'application/json',
        'X-API-Key': apiKey
      },
      params: {
        address,
        sortBy: 'amount',
        order: 'desc',
        perPage: 100
      }
    });

    console.log('API Response status:', response.status);
    console.log('API Response data:', response.data);

    return NextResponse.json(response.data);
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
        error: 'Failed to fetch tokens',
        details: error.message 
      },
      { status: error.response?.status || 500 }
    );
  }
} 