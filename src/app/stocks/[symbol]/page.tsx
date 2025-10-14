"use client";
import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import Sidebar from "@/components/Sidebar";
import Navbar from "@/components/Navbar";
import { GridBackground } from "@/components/GridBackground";
import { DiscussionForum } from "@/components/discussions/DiscussionForum";
import { DiscussionList } from "@/components/discussions/DiscussionList";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BarChart3, MessageSquare, Users, TrendingUp, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { PolygonChartDynamic } from "@/components/PolygonChartDynamic";
import FollowForumButton from "@/components/FollowForumButton";

interface StockData {
  symbol: string;
  name: string;
  price: string;
  change: string;
  changeColor: string;
  posts: number;
  members: string;
  description: string;
}

// Basic stock metadata - only for display purposes when stats are loading
const getStockMetadata = (symbol: string) => {
  const upperSymbol = symbol.toUpperCase();
  return {
    symbol: upperSymbol,
    name: upperSymbol, // Will be updated with real data when available
    description: `Discussions about ${upperSymbol}`
  };
};

interface StockPageProps {
  params: Promise<{ symbol: string }>;
}

export default function StockPage({ params }: StockPageProps) {
  // Unwrap the params Promise - this is needed in Next.js 15
  const [resolvedParams, setResolvedParams] = useState<{ symbol: string } | null>(null);

  useEffect(() => {
    params.then(setResolvedParams);
  }, [params]);

  const metadata = resolvedParams ? getStockMetadata(resolvedParams.symbol) : null;

  // Default stock data with loading states for real-time data
  const fallbackStock: StockData = {
    symbol: metadata?.symbol || '',
    name: metadata?.name || '',
    price: "Loading...",
    change: "Loading...",
    changeColor: "text-gray-600",
    posts: 0,
    members: "Loading...",
    description: metadata?.description || ''
  };

  // Check if this stock forum exists in our database
  const { data: forumExists } = useQuery({
    queryKey: ["forum-exists", resolvedParams?.symbol],
    queryFn: async () => {
      if (!resolvedParams?.symbol) return true; // Show forum while loading

      const { data, error } = await supabase
        .from("discussions")
        .select("id")
        .eq("category", resolvedParams.symbol.toLowerCase())
        .limit(1);

      if (error) return false;
      return data && data.length > 0;
    },
    enabled: !!resolvedParams?.symbol
  });

  // Fetch real-time forum stats
  const { data: forumStats, isLoading: statsLoading } = useQuery({
    queryKey: ["forum-stats", resolvedParams?.symbol],
    queryFn: async () => {
      if (!resolvedParams?.symbol) return null;

      try {
        const response = await fetch(`/api/forum-stats?symbol=${resolvedParams.symbol.toUpperCase()}`);
        const data = await response.json();

        return data;
      } catch (error) {
        console.warn('Failed to fetch forum stats, using fallback:', error);
        // Fallback to basic stats if API fails
        return {
          price: "N/A",
          change: "N/A",
          changeColor: "text-gray-600",
          posts: 0,
          members: "0"
        };
      }
    },
    enabled: !!resolvedParams?.symbol,
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
    refetchOnWindowFocus: false,
  });

  // Use real stats if available, otherwise show loading
  const displayStock = forumStats ? { ...fallbackStock, ...forumStats } : fallbackStock;

  if (forumExists === false && resolvedParams) {
    return (
      <div className="min-h-screen bg-background relative overflow-hidden text-foreground">
        <Sidebar />
        <GridBackground />
        <Navbar />
        <main className="relative z-10 pt-24 pl-64 pr-6">
          <div className="h-[calc(100vh-6rem)] flex items-center justify-center">
            <div className="text-center">
              <div className="text-6xl mb-4">📈</div>
              <h1 className="text-2xl font-bold mb-2">Forum Not Found</h1>
              <p className="text-muted-foreground mb-4">
                The forum for ${resolvedParams.symbol.toUpperCase()} doesn't have any discussions yet.
              </p>
              <Link href="/stocks">
                <Button>
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to All Forums
                </Button>
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!resolvedParams) {
    return (
      <div className="min-h-screen bg-background relative overflow-hidden text-foreground">
        <Sidebar />
        <GridBackground />
        <Navbar />
        <main className="relative z-10 pt-24 pl-64 pr-6">
          <div className="h-[calc(100vh-6rem)] flex items-center justify-center">
            <div className="text-muted-foreground">Loading forum...</div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background relative overflow-hidden text-foreground">
      <Sidebar />
      <GridBackground />
      <Navbar />

      <div className="flex">
        {/* Main Content - Left Side */}
        <main className="flex-1 relative z-10 pt-24 pl-64 pr-0">
          <div className="max-w-6xl mx-auto p-6">
            {/* Back Button */}
            <Link href="/stocks" className="inline-flex items-center gap-2 mb-6 text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="w-4 h-4" />
              Back to Stocks
            </Link>

            {/* Stock Header */}
            <div className="mb-8">
              <div className="flex items-start gap-4 mb-4">
                <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-[#e0a815]/10 to-[#f2c74b]/10 border border-[#e0a815]/20 flex items-center justify-center">
                  <BarChart3 className="h-8 w-8 text-[#e0a815]" />
                </div>
                <div className="space-y-1">
                  <h1 className="text-4xl font-bold">{displayStock.symbol}</h1>
                  <p className="text-muted-foreground text-lg">{displayStock.name}</p>
                  <p className="text-muted-foreground">{displayStock.description}</p>
                </div>
              </div>

              {/* Stock Stats */}
              <div className="grid grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-[#e0a815]">{displayStock.price}</div>
                    <div className="text-xs text-muted-foreground">Current Price</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className={`text-2xl font-bold ${displayStock.changeColor}`}>{displayStock.change}</div>
                    <div className="text-xs text-muted-foreground">Change</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold">{displayStock.posts.toLocaleString()}</div>
                    <div className="text-xs text-muted-foreground">Posts</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold">{displayStock.members}</div>
                    <div className="text-xs text-muted-foreground">Members</div>
                  </CardContent>
                </Card>
              </div>
            </div>



            {/* Follow Forum Button */}
            <FollowForumButton stockSymbol={resolvedParams.symbol.toLowerCase()} />

            {/* Discussion Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-2xl">
                  <MessageSquare className="h-6 w-6 text-[#e0a815]" />
                  {displayStock.symbol} Discussions
                  <Badge variant="secondary" className="ml-2">Forum Activity</Badge>
                </CardTitle>
                <p className="text-muted-foreground">
                  Join fellow traders discussing {displayStock.name}
                </p>
              </CardHeader>
              <CardContent className="p-0">
                <DiscussionForum category={resolvedParams.symbol.toLowerCase()} />
              </CardContent>
            </Card>

            {/* Infinite scroll container that allows full page scrolling */}
            <div className="pt-6">
              <DiscussionList category={resolvedParams.symbol.toLowerCase()} />
            </div>
          </div>
        </main>

        {/* Chart and Stats Sidebar - Right Side */}
        <aside className="w-80 pt-24 bg-transparent min-h-screen p-6 overflow-y-auto">
          <div className="space-y-6">
            {/* Stock Chart - Top of sidebar */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-[#e0a815]" />
                  {displayStock.symbol} Chart
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64 w-full">
                  <PolygonChartDynamic symbol={resolvedParams.symbol} />
                </div>
              </CardContent>
            </Card>

            {/* Key Statistics */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Key Statistics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Market Cap</span>
                  <span className="font-medium">$3.2T</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">P/E Ratio</span>
                  <span className="font-medium">28.5</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Dividend Yield</span>
                  <span className="font-medium">0.48%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">52 Week High</span>
                  <span className="font-medium">$1,408.00</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">52 Week Low</span>
                  <span className="font-medium">$726.00</span>
                </div>
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Recent Activity</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                  <div className="space-y-1">
                    <div className="text-sm font-medium">New analysis post</div>
                    <div className="text-xs text-muted-foreground">5 minutes ago</div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                  <div className="space-y-1">
                    <div className="text-sm font-medium">Price target discussion</div>
                    <div className="text-xs text-muted-foreground">12 minutes ago</div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-orange-500 rounded-full mt-2"></div>
                  <div className="space-y-1">
                    <div className="text-sm font-medium">Earnings call summary</div>
                    <div className="text-xs text-muted-foreground">1 hour ago</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </aside>
      </div>
    </div>
  );
}
