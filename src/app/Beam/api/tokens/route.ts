import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'marketcap'; // marketcap, liquidity, volume
    const limit = parseInt(searchParams.get('limit') || '100');
    const apiKey = process.env.NEXT_PUBLIC_TAPTOOLS_API_KEY;

    if (!apiKey) {
      return NextResponse.json({ error: 'API key is missing' }, { status: 401 });
    }

    // Define the base URL and endpoint based on the type
    const baseUrl = 'https://openapi.taptools.io/api/v1';
    let endpoint = '';
    
    switch (type) {
      case 'marketcap':
        endpoint = '/token/top/mcap';
        break;
      case 'liquidity':
        endpoint = '/token/top/liquidity';
        break;
      case 'volume':
        endpoint = '/token/top/volume';
        break;
      default:
        endpoint = '/token/top/mcap';
    }
    
    const url = `${baseUrl}${endpoint}`;
    console.log('Attempting to fetch from:', url);
    
    // Log detailed request info
    console.log(`API Request Details:
      - Type: ${type}
      - Limit: ${limit}
      - perPage: ${Math.min(limit, 100)}
      - Full URL: ${url}
    `);

    try {
      const headers = {
        'x-api-key': apiKey,
        'Accept': 'application/json'
      };
      
      console.log('Request Headers:', JSON.stringify(headers, null, 2));
      
      // Add perPage parameter to the URL with the limit value (max 100)
      const perPage = Math.min(limit, 100);
      const apiUrl = `${url}?perPage=${perPage}`;
      console.log(`Adding perPage parameter: ${perPage}`);
      console.log(`Final API URL: ${apiUrl}`);
      
      const response = await fetch(apiUrl, {
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
        
        return NextResponse.json(
          { error: `TapTools API error: ${response.status} ${response.statusText}` },
          { status: response.status }
        );
      }

      const data = await response.json();
      console.log(`Successfully fetched token data from TapTools API`);
      console.log(`Raw data length: ${Array.isArray(data) ? data.length : 'not an array'}`);
      
      // Ensure we're handling the response data correctly
      const tokens = Array.isArray(data) ? data.slice(0, limit) : [];
      console.log(`Tokens after slicing to limit (${limit}): ${tokens.length}`);
      
      // Log the first few tokens to see what we're getting
      if (tokens.length > 0) {
        console.log(`First 3 tokens from API:`);
        tokens.slice(0, 3).forEach((token, index) => {
          console.log(`  ${index + 1}. ${token.ticker || 'Unknown'} - Unit: ${token.unit ? token.unit.substring(0, 12) + '...' : 'None'}`);
        });
      }
      
      // Transform the data to match our expected token format
      const formattedTokens = tokens.map(token => {
        return {
          ticker: token.ticker || 'Unknown',
          unit: token.unit || '',
          price: token.price || 0,
          liquidity: token.liquidity || token.volume || 0, // Use volume as fallback for liquidity
          marketCap: token.marketCap || 0,
          volume: token.volume || 0
        };
      });
      
      // Check for tokens without unit identifiers
      const tokensWithoutUnit = formattedTokens.filter(token => !token.unit);
      if (tokensWithoutUnit.length > 0) {
        console.log(`⚠️ Found ${tokensWithoutUnit.length} tokens without unit identifiers`);
        tokensWithoutUnit.slice(0, 3).forEach((token, index) => {
          console.log(`  ${index + 1}. ${token.ticker || 'Unknown'} - Missing unit identifier`);
        });
      }
      
      // Log some summary information about the response
      console.log(`API Response Summary:
        - Status: ${response.status} ${response.statusText}
        - Raw Token Count: ${Array.isArray(data) ? data.length : 'N/A'}
        - Formatted Token Count: ${formattedTokens.length}
        - Requested Limit: ${limit}
        - Requested perPage: ${Math.min(limit, 100)}
      `);
      
      // Return the tokens array in the expected format
      return NextResponse.json({ 
        tokens: formattedTokens,
        timestamp: new Date().toISOString()
      });
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