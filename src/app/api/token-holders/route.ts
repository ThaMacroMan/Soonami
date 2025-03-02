import { NextResponse } from 'next/server';
import axios from 'axios';

export const dynamic = 'force-dynamic';
export const runtime = 'edge';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const unit = searchParams.get('unit');
  const limit = searchParams.get('limit') || '50';
  
  if (!unit) {
    return NextResponse.json({ error: 'Unit is required' }, { status: 400 });
  }

  try {
    console.log('Fetching holders for:', { unit, limit });

    const response = await axios.get('https://openapi.taptools.io/api/v1/token/holders/top', {
      headers: {
        'accept': 'application/json',
        'X-API-Key': process.env.NEXT_PUBLIC_TAPTOOLS_API_KEY || ''
      },
      params: {
        unit,
        limit: parseInt(limit)
      }
    });

    if (!response.data) {
      throw new Error('No data received from API');
    }

    const holders = Array.isArray(response.data) ? response.data : [];
    const totalAmount = holders.reduce((sum, holder) => sum + (parseFloat(holder.amount) || 0), 0);
    
    const formattedHolders = holders.map(holder => ({
      address: holder.address,
      amount: parseFloat(holder.amount) || 0,
      percentage: totalAmount > 0 ? ((parseFloat(holder.amount) || 0) / totalAmount) * 100 : 0
    }));

    return NextResponse.json(formattedHolders);
  } catch (error: any) {
    console.error('Token holders API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch token holders' },
      { status: 500 }
    );
  }
} 