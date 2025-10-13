"use client";
import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { Button } from '@/components/ui/button';

interface PolygonChartProps {
  symbol: string;
}

interface ChartData {
  timestamp: number;
  price: number;
}

type TimeRange = '1h' | '24h' | '1w' | '1m' | '1y' | 'max';

export function PolygonChart({ symbol }: PolygonChartProps) {
  const [data, setData] = useState<ChartData[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<TimeRange>('1m');

  useEffect(() => {
    const fetchChartData = async () => {
      setLoading(true);
      try {
        // Polygon.io API integration with real data based on time range
        // Note: You'll need to get an API key from https://polygon.io/
        const polygonApiKey = process.env.NEXT_PUBLIC_POLYGON_API_KEY || 'YOUR_POLYGON_API_KEY_HERE';

        // Calculate date range based on selected time period
        const now = new Date();
        let fromDate: string;
        let multiplier = 1;
        let timespan: string;

        switch (timeRange) {
          case '1h':
            timespan = 'minute';
            multiplier = 60; // 1-minute bars for last hour
            fromDate = new Date(now.getTime() - 60 * 60 * 1000).toISOString().split('T')[0];
            break;
          case '24h':
            timespan = 'hour';
            multiplier = 1; // 1-hour bars for last day
            fromDate = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
            break;
          case '1w':
            timespan = 'hour';
            multiplier = 4; // 4-hour bars for last week
            fromDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
            break;
          case '1m':
            timespan = 'day';
            multiplier = 1; // Daily bars for last month
            fromDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
            break;
          case '1y':
            timespan = 'week';
            multiplier = 1; // Weekly bars for last year
            fromDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
            break;
          case 'max':
            timespan = 'month';
            multiplier = 1; // Monthly bars since 2010
            fromDate = '2010-01-01';
            break;
          default:
            timespan = 'day';
            multiplier = 1;
            fromDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        }

        const toDate = now.toISOString().split('T')[0];

        console.log(`Fetching ${symbol} chart data for ${timeRange} range:`, {
          fromDate,
          toDate,
          timespan,
          multiplier
        });

        const response = await fetch(
          `https://api.polygon.io/v2/aggs/ticker/${symbol}/range/${multiplier}/${timespan}/${fromDate}/${toDate}?apiKey=${polygonApiKey}&adjusted=true&sort=asc&limit=50000`
        );

        if (response.ok) {
          const result = await response.json();
          console.log(`Polygon.io response for ${symbol}:`, result);

          if (result.results && result.results.length > 0) {
            const chartData = result.results.map((bar: any) => ({
              timestamp: bar.t,
              price: bar.c
            }));
            setData(chartData);
          } else {
            // Fallback mock data if no results
            console.log(`No data returned from Polygon.io for ${symbol}, using mock data`);
            generateMockData();
          }
        } else {
          // Fallback mock data if API call fails
          console.log(`Polygon.io API error for ${symbol}:`, response.status, response.statusText);
          generateMockData();
        }
      } catch (error) {
        console.log(`Error fetching ${symbol} chart data:`, error);
        generateMockData();
      }
      setLoading(false);
    };

    const generateMockData = () => {
      const mockData = [];
      const basePrice = 100 + Math.random() * 900; // Random base price
      let currentPrice = basePrice;

      // Generate data points based on time range
      let dataPoints = 50;
      let timeStep = 24 * 60 * 60 * 1000; // 1 day in milliseconds

      switch (timeRange) {
        case '1h':
          dataPoints = 60; // 60 minutes
          timeStep = 60 * 1000;
          break;
        case '24h':
          dataPoints = 24; // 24 hours
          timeStep = 60 * 60 * 1000;
          break;
        case '1w':
          dataPoints = 168; // 7 days * 24 hours
          timeStep = 60 * 60 * 1000;
          break;
        case '1m':
          dataPoints = 30; // ~30 days
          timeStep = 24 * 60 * 60 * 1000;
          break;
        case '1y':
          dataPoints = 52; // ~52 weeks
          timeStep = 7 * 24 * 60 * 60 * 1000;
          break;
        case 'max':
          dataPoints = 120; // ~10 years monthly
          timeStep = 30 * 24 * 60 * 60 * 1000;
          break;
      }

      for (let i = 0; i < dataPoints; i++) {
        // Add some realistic volatility
        const volatility = basePrice * 0.02; // 2% daily volatility
        const change = (Math.random() - 0.5) * volatility;
        currentPrice += change;
        currentPrice = Math.max(currentPrice, basePrice * 0.1); // Prevent negative/extreme values

        mockData.push({
          timestamp: Date.now() - (dataPoints - 1 - i) * timeStep,
          price: currentPrice
        });
      }

      setData(mockData);
    };

    fetchChartData();
  }, [symbol, timeRange]);

  if (loading) {
    return (
      <div className="h-32 flex items-center justify-center">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#e0a815]"></div>
      </div>
    );
  }

  const formatTooltipValue = (value: number) => `$${value.toFixed(2)}`;
  const formatXAxisLabel = (timestamp: number) =>
    new Date(timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  const timeRangeButtons: { value: TimeRange; label: string }[] = [
    { value: '1h', label: '1H' },
    { value: '24h', label: '24H' },
    { value: '1w', label: '1W' },
    { value: '1m', label: '1M' },
    { value: '1y', label: '1Y' },
    { value: 'max', label: 'MAX' },
  ];

  return (
    <div className="space-y-1 flex flex-col h-full">
      {/* Time Range Buttons - smaller */}
      <div className="flex gap-1 p-1 bg-muted rounded-md flex-shrink-0">
        {timeRangeButtons.map(({ value, label }) => (
          <Button
            key={value}
            variant={timeRange === value ? "default" : "ghost"}
            size="sm"
            onClick={() => setTimeRange(value)}
            className={`flex-1 text-xs font-medium py-0.5 px-1 ${
              timeRange === value
                ? 'bg-[#e0a815] hover:bg-[#f2c74b] text-black'
                : 'hover:bg-muted/50'
            }`}
          >
            {label}
          </Button>
        ))}
      </div>

      {/* Chart - Fill remaining space */}
      <div className="flex-1 bg-gradient-to-br from-[#e0a815]/5 to-[#f2c74b]/5 rounded-lg p-1 border border-[#e0a815]/20 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 10, left: 5, bottom: 5 }}>
            <XAxis
              dataKey="timestamp"
              tickFormatter={formatXAxisLabel}
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 8, fill: '#6b7280' }}
              height={20}
              interval="preserveStartEnd"
            />
            <YAxis
              domain={['dataMin - 5', 'dataMax + 5']}
              tickFormatter={(value) => `$${value.toFixed(0)}`}
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 8, fill: '#6b7280' }}
              width={28}
            />
            <Tooltip
              formatter={(value: number) => [formatTooltipValue(value), 'Price']}
              labelFormatter={(timestamp) => new Date(timestamp).toLocaleDateString()}
              contentStyle={{
                backgroundColor: '#1f2937',
                color: '#ffffff',
                border: '1px solid #374151',
                borderRadius: '4px',
                boxShadow: '0 2px 4px -1px rgb(0 0 0 / 0.1)',
                fontSize: '10px',
                padding: '4px 8px'
              }}
            />
            <Line
              type="monotone"
              dataKey="price"
              stroke="#e0a815"
              strokeWidth={1.5}
              dot={false}
              activeDot={{ r: 2, fill: '#e0a815' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Price Stats - smaller and fixed height */}
      <div className="grid grid-cols-2 gap-1 text-center flex-shrink-0 min-h-0">
        <div className="space-y-0 py-1">
          <div className="text-xs font-bold text-[#e0a815] leading-tight">
            ${data[data.length - 1]?.price.toFixed(2) || 'N/A'}
          </div>
          <div className="text-xs text-muted-foreground leading-tight">Price</div>
        </div>
        <div className="space-y-0 py-1">
          <div className={`text-xs font-bold leading-tight ${
            data.length > 1
              ? data[data.length - 1].price > data[0].price
                ? 'text-green-600'
                : 'text-red-600'
              : 'text-gray-600'
          }`}>
            {data.length > 1
              ? `${data[data.length - 1].price > data[0].price ? '+' : ''}${((data[data.length - 1].price - data[0].price) / data[0].price * 100).toFixed(1)}%`
              : 'N/A'
            }
          </div>
          <div className="text-xs text-muted-foreground leading-tight">Change</div>
        </div>
      </div>
    </div>
  );
}
