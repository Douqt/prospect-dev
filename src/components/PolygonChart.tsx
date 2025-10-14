"use client";
import { useState, useEffect, useCallback } from 'react';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { Button } from '@/components/ui/button';
import { fetchPolygonData, fetchMultiplePolygonData } from '@/lib/polygon-cache';

interface PolygonChartProps {
  symbol: string;
  symbols?: string[]; // For batch loading context
  enableBatchLoading?: boolean; // Enable if part of a batch
}

interface ChartData {
  timestamp: number;
  price: number;
}

type TimeRange = '24h' | '1w' | '1m' | '1y' | 'max';

export function PolygonChart({ symbol, symbols, enableBatchLoading = false }: PolygonChartProps) {
  const [data, setData] = useState<ChartData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<TimeRange>('1m');
  const [lastUpdate, setLastUpdate] = useState<number | null>(null);

  // Batch loading effect for social feed optimization
  const fetchBatchData = useCallback(async () => {
    if (!enableBatchLoading || !symbols || symbols.length === 0) {
      return false;
    }

    try {
      console.log(`🔄 Batch loading ${symbols.length} symbols for social feed`);
      const batchResults = await fetchMultiplePolygonData(symbols, timeRange);

      // Find our symbol's data
      const symbolData = batchResults[symbol];
      if (symbolData && symbolData.length > 0) {
        const chartData: ChartData[] = symbolData.map((bar) => ({
          timestamp: bar.t,
          price: typeof bar.c === 'string' ? parseFloat(bar.c) : bar.c || 0
        }));
        setData(chartData);
        setLastUpdate(Date.now());
        setError(null);
        return true;
      }
    } catch (error) {
      console.warn(`⚠️ Batch loading failed for ${symbol}:`, error);
    }
    return false;
  }, [symbols, timeRange, symbol, enableBatchLoading]);

  // Individual symbol loading (fallback)
  const fetchIndividualData = useCallback(async () => {
    try {
      setError(null);
      const rawData = await fetchPolygonData(symbol, timeRange);

      const chartData: ChartData[] = rawData.map((bar) => ({
        timestamp: bar.t,
        price: typeof bar.c === 'string' ? parseFloat(bar.c) : (bar.c || 0)
      }));

      setData(chartData);
      setLastUpdate(Date.now());
    } catch (error) {
      console.log(`❌ Error fetching ${symbol} chart data:`, error);
      setError('Failed to load chart data');
    }
  }, [symbol, timeRange]);

  // Main data fetching logic
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);

      // Try batch loading first if enabled
      if (enableBatchLoading && symbols) {
        const batchSuccess = await fetchBatchData();
        if (batchSuccess) {
          setLoading(false);
          return;
        }
      }

      // Fall back to individual loading
      await fetchIndividualData();
      setLoading(false);
    };

    fetchData();
  }, [symbol, timeRange, fetchBatchData, fetchIndividualData, enableBatchLoading, symbols]);

  const generateMockData = useCallback(() => {
    const mockData = [];
    const basePrice = 100 + Math.random() * 900; // Random base price
    let currentPrice = basePrice;

    // Generate data points based on time range
    let dataPoints = 50;
    let timeStep = 24 * 60 * 60 * 1000; // 1 day in milliseconds

    switch (timeRange) {
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
  }, [timeRange]);

  if (loading) {
    return (
      <div className="h-32 flex items-center justify-center">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#e0a815]"></div>
      </div>
    );
  }

  // Debug logging for data inspection
  console.log(`📊 Chart data for ${symbol}:`, data);
  console.log(`📈 Price range: ${data.length > 0 ? Math.min(...data.map(d => d.price)) : 'N/A'} - ${data.length > 0 ? Math.max(...data.map(d => d.price)) : 'N/A'}`);

  // Calculate dynamic Y-axis domain for better scaling
  const calculateYAxisDomain = () => {
    if (data.length === 0) return ['auto', 'auto'];

    const prices = data.map(d => d.price).filter(p => p != null && !isNaN(p));
    if (prices.length === 0) return ['auto', 'auto'];

    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const range = max - min;

    // If range is very small, create artificial buffer
    if (range < 0.01) {
      const center = (min + max) / 2;
      return [center - 1, center + 1];
    }

    // Otherwise use small buffer
    return [min - range * 0.1, max + range * 0.1];
  };

  const formatTooltipValue = (value: number) => `$${value.toFixed(2)}`;
  const formatXAxisLabel = (timestamp: number) =>
    new Date(timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  const timeRangeButtons: { value: TimeRange; label: string }[] = [
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
            onClick={(e) => {
              e.stopPropagation();
              setTimeRange(value);
            }}
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

      {/* Error display for production debugging */}
      {error && (
        <div className="text-xs text-red-600 text-center py-1 bg-red-50 rounded flex-shrink-0">
          {error}
        </div>
      )}

      {/* Chart - Compact but readable */}
      <div className="flex-1 bg-gradient-to-br from-[#e0a815]/5 to-[#f2c74b]/5 rounded-lg p-1 border border-[#e0a815]/20" style={{ height: 180 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
            <XAxis
              dataKey="timestamp"
              tickFormatter={formatXAxisLabel}
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 8, fill: '#6b7280' }}
              height={15}
              interval="preserveStartEnd"
            />
            <YAxis
              domain={calculateYAxisDomain()}
              tickFormatter={(value: number) => `$${value.toFixed(0)}`}
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 8, fill: '#6b7280' }}
              width={30}
              stroke="#6b7280"
            />
            <Tooltip
              formatter={(value: number) => [formatTooltipValue(value), 'Price']}
              labelFormatter={(timestamp): string => new Date(timestamp).toLocaleDateString()}
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
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 3, fill: '#e0a815' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Price Stats - smaller and fixed height */}
      <div className="grid grid-cols-2 gap-1 text-center flex-shrink-0">
        <div className="space-y-0 py-1">
          <div className="text-xs font-bold text-[#e0a815] leading-tight">
            {data?.length > 0 && data[data.length - 1]?.price != null
              ? `$${data[data.length - 1].price.toFixed(2)}`
              : 'N/A'}
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
