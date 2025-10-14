import { createServerClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

// Server-side API for forum statistics
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get('symbol');

  if (!symbol) {
    return NextResponse.json({ error: 'Symbol required' }, { status: 400 });
  }

  try {
    const supabase = await createServerClient();

    // Get forum posts count
    const { count: postsCount, error: postsError } = await supabase
      .from('discussions')
      .select('id', { count: 'exact' })
      .eq('category', symbol.toLowerCase());

    if (postsError) {
      console.error('Error fetching posts count:', postsError);
    }

    // Get forum members count (followers)
    const { count: membersCount, error: membersError } = await supabase
      .from('community_memberships')
      .select('id', { count: 'exact' })
      .eq('community_symbol', symbol.toUpperCase());

    if (membersError) {
      console.error('Error fetching members count:', membersError);
    }

    // Fetch price and change from Yahoo Finance
    let price = "N/A";
    let change = "N/A";
    let changeColor = "text-gray-600";

    try {
      // Use the existing Yahoo Finance endpoint to get price data
      const financeUrl = `${request.headers.get('origin') || 'http://localhost:3000'}/api/yahoo-finance?symbol=${symbol}&range=1d&interval=5m`;
      const financeResponse = await fetch(financeUrl);

      if (financeResponse.ok) {
        const financeData = await financeResponse.json();

        if (financeData.data && financeData.data.length > 0) {
          // Get the most recent data point
          const latestData = financeData.data[financeData.data.length - 1];

          if (latestData.c) {
            price = `$${latestData.c.toFixed(2)}`;

            // Calculate change percentage from the first data point of the day
            if (financeData.data.length > 1) {
              const firstData = financeData.data[0];
              if (firstData.c) {
                const changePercent = ((latestData.c - firstData.c) / firstData.c) * 100;
                change = `${changePercent >= 0 ? '+' : ''}${changePercent.toFixed(2)}%`;
                changeColor = changePercent >= 0 ? "text-green-600" : "text-red-600";
              }
            }
          }
        }
      }
    } catch (financeError) {
      console.error('Error fetching finance data:', financeError);
      // Continue with N/A values
    }

    // For crypto, modify symbol if needed (BTC -> BTC-USD, etc.)
    if (!price || price === "N/A") {
      // Try with -USD suffix for crypto
      try {
        const cryptoSymbol = symbol.includes('-') ? symbol : `${symbol}-USD`;
        const financeUrl = `${request.headers.get('origin') || 'http://localhost:3000'}/api/yahoo-finance?symbol=${cryptoSymbol}&range=1d&interval=5m`;
        const financeResponse = await fetch(financeUrl);

        if (financeResponse.ok) {
          const financeData = await financeResponse.json();

          if (financeData.data && financeData.data.length > 0) {
            const latestData = financeData.data[financeData.data.length - 1];

            if (latestData.c) {
              price = `$${latestData.c.toFixed(2)}`;

              if (financeData.data.length > 1) {
                const firstData = financeData.data[0];
                if (firstData.c) {
                  const changePercent = ((latestData.c - firstData.c) / firstData.c) * 100;
                  change = `${changePercent >= 0 ? '+' : ''}${changePercent.toFixed(2)}%`;
                  changeColor = changePercent >= 0 ? "text-green-600" : "text-red-600";
                }
              }
            }
          }
        }
      } catch (cryptoFinanceError) {
        console.error('Error fetching crypto finance data:', cryptoFinanceError);
      }
    }

    return NextResponse.json({
      price: price,
      change: change,
      changeColor: changeColor,
      posts: postsCount || 0,
      members: membersCount ? (membersCount >= 1000000 ? `${(membersCount / 1000000).toFixed(1)}M` : membersCount >= 1000 ? `${(membersCount / 1000).toFixed(1)}K` : membersCount.toString()) : "1"
    });
  } catch (error) {
    console.error('Forum stats API error:', error);
    return NextResponse.json({
      error: 'Failed to fetch forum stats',
      price: "N/A",
      change: "N/A",
      changeColor: "text-gray-600",
      posts: 0,
      members: "1"
    }, { status: 500 });
  }
}
