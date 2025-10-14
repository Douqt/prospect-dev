import { NextRequest, NextResponse } from 'next/server';

// Server-side Yahoo Finance data fetching (bypasses CORS)
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get('symbol');
  const range = searchParams.get('range') || '1mo';
  const interval = searchParams.get('interval') || '1d';

  if (!symbol) {
    return NextResponse.json({ error: 'Symbol required' }, { status: 400 });
  }

  try {
    console.log(`📡 Server fetch: ${symbol} (${range}, ${interval})`);

    // Construct Yahoo Finance API URL
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?range=${range}&interval=${interval}&includeAdjustedClose=true`;

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    if (!response.ok) {
      console.warn(`📭 ${symbol}: HTTP ${response.status} from Yahoo Finance`);
      return NextResponse.json({ error: `HTTP ${response.status}` }, { status: response.status });
    }

    const data = await response.json();

    if (!data.chart?.result?.[0]?.indicators?.quote?.[0]?.close) {
      console.warn(`📭 ${symbol}: No quote data in response`);
      return NextResponse.json({ data: [] });
    }

    const result = data.chart.result[0];
    const timestamps = result.timestamp;
    const quotes = result.indicators.quote[0];
    const closes = quotes.close;
    const opens = quotes.open;
    const highs = quotes.high;
    const lows = quotes.low;
    const volumes = quotes.volume;

    if (!timestamps || !closes || closes.length === 0) {
      console.warn(`📭 ${symbol}: No valid data points`);
      return NextResponse.json({ data: [] });
    }

    console.log(`✅ ${symbol}: Got ${closes.length} data points from Yahoo Finance`);

    // Transform to our expected format
    const transformedData = closes.map((close: number, index: number) => ({
      t: timestamps[index] * 1000, // Convert to milliseconds
      c: close,
      o: opens[index] || close,
      h: highs[index] || close,
      l: lows[index] || close,
      v: volumes[index] || 0,
    }));

    return NextResponse.json({ data: transformedData });
  } catch (error) {
    console.error(`❌ Yahoo Finance server error for ${symbol}:`, error);
    return NextResponse.json({ error: 'Failed to fetch data', data: [] }, { status: 500 });
  }
}
