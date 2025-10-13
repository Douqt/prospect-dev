"use client";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import Sidebar from "@/components/Sidebar";
import Navbar from "@/components/Navbar";
import { GridBackground } from "@/components/GridBackground";
import { DiscussionForum } from "@/components/discussions/DiscussionForum";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BarChart3, MessageSquare, Users, TrendingUp, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { PolygonChart } from "@/components/PolygonChart";

// Mock stock data - in real app this would come from an API
const getStockData = (symbol: string) => {
  const stockData: { [key: string]: any } = {
    nvda: {
      symbol: "NVDA",
      name: "Nvidia",
      price: "$1,234.56",
      change: "+12.34%",
      changeColor: "text-green-600",
      posts: 1247,
      members: "2.1M",
      description: "World leader in graphics processing units and AI computing"
    },
    amd: {
      symbol: "AMD",
      name: "Advanced Micro Devices",
      price: "$234.56",
      change: "-2.34%",
      changeColor: "text-red-600",
      posts: 892,
      members: "987K",
      description: "Semiconductor company specializing in computer processors and graphics processors"
    },
    appl: {
      symbol: "AAPL",
      name: "Apple Inc",
      price: "$195.43",
      change: "+0.87%",
      changeColor: "text-green-600",
      posts: 2156,
      members: "3.2M",
      description: "Technology company that designs, manufactures, and markets smartphones, personal computers, tablets, wearables, and accessories"
    },
    tsla: {
      symbol: "TSLA",
      name: "Tesla Inc",
      price: "$789.01",
      change: "-5.67%",
      changeColor: "text-red-600",
      posts: 3241,
      members: "4.1M",
      description: "Electric vehicle and clean energy company"
    },
    googl: {
      symbol: "GOOGL",
      name: "Alphabet Inc",
      price: "$2,890.12",
      change: "+1.23%",
      changeColor: "text-green-600",
      posts: 1876,
      members: "2.8M",
      description: "Parent company of Google and other subsidiaries"
    },
    msft: {
      symbol: "MSFT",
      name: "Microsoft",
      price: "$456.78",
      change: "+3.45%",
      changeColor: "text-green-600",
      posts: 2893,
      members: "3.5M",
      description: "Technology corporation that produces computer software, consumer electronics, personal computers, and related services"
    }
  };

  return stockData[symbol.toLowerCase()] || {
    symbol: symbol.toUpperCase(),
    name: symbol.toUpperCase(),
    price: "N/A",
    change: "N/A",
    changeColor: "text-gray-600",
    posts: 0,
    members: "1",
    description: `Discussions about ${symbol.toUpperCase()}`
  };
};

interface StockPageProps {
  params: { symbol: string };
}

export default function StockPage({ params }: StockPageProps) {
  const stock = getStockData(params.symbol);

  // Check if this stock forum exists in our database
  const { data: forumExists } = useQuery({
    queryKey: ["forum-exists", params.symbol],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("discussions")
        .select("id")
        .eq("category", params.symbol.toLowerCase())
        .limit(1);

      if (error) return false;
      return data && data.length > 0;
    }
  });

  if (forumExists === false) {
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
                The forum for ${params.symbol.toUpperCase()} doesn't have any discussions yet.
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
                  <h1 className="text-4xl font-bold">{stock.symbol}</h1>
                  <p className="text-muted-foreground text-lg">{stock.name}</p>
                  <p className="text-muted-foreground">{stock.description}</p>
                </div>
              </div>

              {/* Stock Stats */}
              <div className="grid grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-[#e0a815]">{stock.price}</div>
                    <div className="text-xs text-muted-foreground">Current Price</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className={`text-2xl font-bold ${stock.changeColor}`}>{stock.change}</div>
                    <div className="text-xs text-muted-foreground">Change</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold">{stock.posts.toLocaleString()}</div>
                    <div className="text-xs text-muted-foreground">Posts</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold">{stock.members}</div>
                    <div className="text-xs text-muted-foreground">Members</div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Join Forum Button */}
            <div className="mb-6">
              <Button size="lg" className="bg-[#e0a815] hover:bg-[#f2c74b] text-black">
                Join {stock.symbol} Forum
              </Button>
            </div>

            {/* Discussion Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-2xl">
                  <MessageSquare className="h-6 w-6 text-[#e0a815]" />
                  {stock.symbol} Discussions
                  <Badge variant="secondary" className="ml-2">Forum Activity</Badge>
                </CardTitle>
                <p className="text-muted-foreground">
                  Join fellow traders discussing {stock.name}
                </p>
              </CardHeader>
              <CardContent className="p-0">
                <DiscussionForum category={params.symbol.toLowerCase()} />
              </CardContent>
            </Card>
          </div>
        </main>

        {/* Stock Chart Sidebar - Right Side */}
        <aside className="w-96 bg-card border-l border-border min-h-screen p-6 overflow-y-auto">
          <div className="sticky top-6 space-y-6">
            {/* Stock Chart Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-[#e0a815]" />
                  {stock.symbol} Chart
                </CardTitle>
              </CardHeader>
              <CardContent>
                <PolygonChart symbol={stock.symbol} />
              </CardContent>
            </Card>

            {/* Quick Stats */}
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
