import { NextResponse } from 'next/server';
import axios from 'axios';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const address = searchParams.get('address');
  
  if (!address) {
    return NextResponse.json({ error: 'Address is required' }, { status: 400 });
  }

  try {
    const response = await axios.get('https://openapi.taptools.io/api/v1/wallet/portfolio/positions', {
      headers: {
        'accept': 'application/json',
        'X-API-Key': process.env.NEXT_PUBLIC_TAPTOOLS_API_KEY || ''
      },
      params: { address }
    });

    return NextResponse.json(response.data);
  } catch (error: any) {
    console.error('Portfolio API error:', error);
    return NextResponse.json({ error: 'Failed to fetch portfolio' }, { status: 500 });
  }
} 