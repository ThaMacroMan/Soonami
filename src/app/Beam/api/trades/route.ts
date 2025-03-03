import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const unit = searchParams.get('unit');
    const timeframe = searchParams.get('timeframe') || '24h';
    const from = searchParams.get('from');
    const page = searchParams.get('page') || '1';
    const perPage = searchParams.get('perPage') || '1';
    const apiKey = process.env.NEXT_PUBLIC_TAPTOOLS_API_KEY;

    if (!apiKey) {
      return NextResponse.json({ error: 'API key is missing' }, { status: 401 });
    }

    // Log partial API key for debugging
    const apiKeyLength = apiKey.length;
    const maskedApiKey = apiKey.substring(0, 4) + '...' + apiKey.substring(apiKeyLength - 4, apiKeyLength);
    console.log(`Using API Key: ${maskedApiKey} (length: ${apiKeyLength})`);

    if (!unit) {
      return NextResponse.json({ error: 'Token unit parameter is required' }, { status: 400 });
    }

    // Build the TapTools API URL
    const params = new URLSearchParams({
      unit,
      timeframe,
      sortBy: 'time',
      order: 'asc',
      page,
      perPage
    });

    if (from) {
      // Validate the from timestamp to ensure it's not in the future
      const fromTimestamp = parseInt(from);
      const now = Math.floor(Date.now() / 1000);
      
      if (fromTimestamp > now) {
        console.warn(`API received future 'from' timestamp: ${fromTimestamp} (${new Date(fromTimestamp * 1000).toLocaleString()}). Using 24 hours ago instead.`);
        const safeFrom = (now - 86400).toString(); // 24 hours ago
        params.append('from', safeFrom);
        console.log(`Replaced with safe timestamp: ${safeFrom} (${new Date(parseInt(safeFrom) * 1000).toLocaleString()})`);
      } else {
        params.append('from', from);
      }
    }

    // Define the base URL and endpoint
    const baseUrl = 'https://openapi.taptools.io/api/v1';
    const url = `${baseUrl}/token/trades?${params.toString()}`;
    console.log('Attempting to fetch from:', url);
    
    // Log detailed request info
    console.log(`API Request Details:
      - Token Unit: ${unit}
      - Timeframe: ${timeframe}
      - From: ${from ? new Date(parseInt(from) * 1000).toLocaleString() : 'Not specified'}
      - Page: ${page}
      - Per Page: ${perPage}
      - Full URL: ${url}
    `);

    try {
      const headers = {
        'x-api-key': apiKey,
        'Accept': 'application/json'
      };
      
      console.log('Request Headers:', JSON.stringify(headers, null, 2));
      
      const response = await fetch(url, {
        headers
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Error from TapTools API:`, errorText);
        console.error(`Error Details:
          - Status: ${response.status} ${response.statusText}
          - URL: ${url}
          - Headers: ${JSON.stringify(Object.fromEntries(response.headers.entries()), null, 2)}
        `);
        
        try {
          // Try to parse error as JSON if possible
          const errorJson = JSON.parse(errorText);
          console.error('Parsed Error JSON:', JSON.stringify(errorJson, null, 2));
        } catch (e) {
          // If it's not JSON, just log the text
          console.error('Error Text (not JSON):', errorText);
        }
        
        return NextResponse.json(
          { error: `TapTools API error: ${response.status} ${response.statusText}` },
          { status: response.status }
        );
      }

      const data = await response.json();
      console.log('Successfully fetched data');
      
      // Log the full response data for debugging
      console.log('API Response Data:', JSON.stringify(data, null, 2));
      
      // Ensure we're handling the response data correctly - it's an array of trades
      const trades = Array.isArray(data) ? data : [];
      const tradeCount = trades.length;
      
      // Log some summary information about the response
      console.log(`API Response Summary:
        - Status: ${response.status} ${response.statusText}
        - Trade Count: ${tradeCount}
        - First Trade Time: ${tradeCount > 0 ? new Date(trades[0].time * 1000).toLocaleString() : 'N/A'}
        - Last Trade Time: ${tradeCount > 0 ? new Date(trades[tradeCount-1].time * 1000).toLocaleString() : 'N/A'}
      `);
      
      // Return the trades array in the expected format
      return NextResponse.json({ trades });
    } catch (error) {
      console.error(`Network error:`, error);
      return NextResponse.json(
        { error: 'Failed to fetch from TapTools API' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Proxy error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 