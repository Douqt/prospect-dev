"use client";
import { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Mail, TrendingUp, Users, BookOpen, Cpu, Trophy, Lightbulb, Target, Sparkles, ArrowRight, CheckCircle } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

interface Stats {
  activeTraders: number;
  dailyTrades: number;
  successRate: number;
}

export default function AboutPage() {
  const [stats, setStats] = useState<Stats>({
    activeTraders: 0,
    dailyTrades: 0,
    successRate: 0
  });

  useEffect(() => {
    const fetchRealStats = async () => {
      try {
        // Get total users (profiles)
        const { count: tradersCount, error: tradersError } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true });

        // Get today's discussions count
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const { count: tradesCount, error: tradesError } = await supabase
          .from('discussions')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', today.toISOString())
          .lt('created_at', tomorrow.toISOString());

        // Get success rate (upvotes/total votes ratio)
        const { data: discussionData, error: discussionError } = await supabase
          .from('discussions')
          .select('upvotes, downvotes')
          .limit(100); // Sample of recent posts

        if (!tradersError && tradersCount !== null) {
          let successRate = 0; // Default fallback

          if (!discussionError && discussionData && discussionData.length > 0) {
            const totalVotes = discussionData.reduce((sum, post) =>
              sum + (post.upvotes || 0) + (post.downvotes || 0), 0);
            const totalUpvotes = discussionData.reduce((sum, post) =>
              sum + (post.upvotes || 0), 0);

            if (totalVotes > 0) {
              successRate = Math.round((totalUpvotes / totalVotes) * 100 * 10) / 10;
            }
          }

          setStats({
            activeTraders: tradersCount > 0 ? tradersCount : 0,
            dailyTrades: tradesCount || Math.floor(tradersCount * 10.27) || 0, // Rough estimate based on active users
            successRate: Math.max(successRate, 0) // Ensure reasonable minimum
          });
        }
      } catch (error) {
        console.log('Using fallback stats due to error:', error);
        // Keep default stats if fetching fails
      }
    };

    fetchRealStats();
  }, []);
  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <div
        className="absolute inset-0 z-0 pointer-events-none grid-background"
        style={{
          backgroundImage: `linear-gradient(to right, rgba(128, 128, 128, 0.2) 1px, transparent 1px), linear-gradient(to bottom, rgba(128, 128, 128, 0.2) 1px, transparent 1px)`,
          backgroundSize: "50px 50px",
        }}
      />
      <Navbar />

      <main className="relative z-10 pt-20 pr-6">
        <div className="max-w-7xl mx-auto py-12 space-y-16">

          {/* Hero Section */}
          <section className="text-center space-y-8 relative">
            {/* Floating badge */}
            <div className="inline-flex items-center gap-2 bg-muted/50 backdrop-blur-sm border rounded-full px-6 py-3">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">The Future of Social Trading</span>
            </div>

            {/* Title - Use logo or waitlist-style title */}
            <div className="space-y-2 mt-6">
              <h1 className="text-7xl font-bold animate-gold-cycle text-center leading-none">
                The Free Social Trading App
              </h1>
              <div className="w-16 h-1 bg-gradient-to-r from-[#e0a815] to-[#f2c74b] mx-auto rounded-full mt-2"></div>
            </div>

            <p className="text-2xl text-muted-foreground max-w-4xl mx-auto leading-relaxed mt-4">
              Connect, share, and trade smarter with a community of active investors.
            </p>

            {/* Statistics - Dynamic from app usage */}
            <div className="flex justify-center gap-12 pt-6">
              {[
                { label: 'Active Traders', value: stats.activeTraders.toLocaleString(), prefix: '' },
                { label: 'Daily Trades', value: stats.dailyTrades.toLocaleString(), prefix: '' },
                { label: 'Success Rate', value: stats.successRate.toFixed(1), suffix: '%' }
              ].map((stat, index) => (
                <div key={index} className="text-center">
                  <div className="text-5xl font-bold text-[#e0a815] mb-1">
                    {stat.prefix}{stat.value}{stat.suffix}
                  </div>
                  <div className="text-sm text-muted-foreground font-medium">
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Mission & Vision */}
          <section className="grid lg:grid-cols-2 gap-8">
            <Card className="border-2 border-[#e0a815]/20 bg-gradient-to-br from-[#e0a815]/5 to-[#f2c74b]/5">
              <CardContent className="p-10">
                <div className="flex items-start gap-6">
                  <div className="p-4 rounded-2xl bg-gradient-to-br from-[#e0a815] to-[#f2c74b] shadow-xl">
                    <Target className="h-10 w-10 text-black" />
                  </div>
                  <div className="space-y-4">
                    <Badge variant="secondary" className="bg-[#e0a815]/10 text-[#e0a815] border border-[#e0a815]/20">
                      Our Mission
                    </Badge>
                    <h2 className="text-4xl font-bold text-foreground">
                      Democratize Trading Knowledge
                    </h2>
                    <p className="text-lg text-muted-foreground leading-relaxed">
                      To democratize trading knowledge and create a supportive community where every trader
                      can achieve their financial goals through collaboration and learning from peers.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-2 border-[#e0a815]/20 bg-gradient-to-br from-[#e0a815]/5 to-[#f2c74b]/5">
              <CardContent className="p-10">
                <div className="flex items-start gap-6">
                  <div className="p-4 rounded-2xl bg-gradient-to-br from-[#e0a815] to-[#f2c74b] shadow-xl">
                    <Lightbulb className="h-10 w-10 text-black" />
                  </div>
                  <div className="space-y-4">
                    <Badge variant="secondary" className="bg-[#e0a815]/10 text-[#e0a815] border border-[#e0a815]/20">
                      Our Vision
                    </Badge>
                    <h2 className="text-4xl font-bold text-foreground">
                      Trading for Everyone
                    </h2>
                    <p className="text-lg text-muted-foreground leading-relaxed">
                      A world where trading knowledge is accessible to everyone, fostering a community that
                      helps individuals grow both financially and personally through shared experiences.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>

          {/* Features Section */}
          <section className="space-y-16">
            <div className="text-center space-y-6">
              <div className="inline-flex items-center gap-3 bg-muted/50 backdrop-blur-sm border rounded-full px-6 py-2">
                <CheckCircle className="h-5 w-5 text-[#e0a815]" />
                <span className="text-[#e0a815] font-medium">Complete Trading Solution</span>
              </div>
              <h2 className="text-6xl font-black text-foreground">
                Everything You Need to Succeed
              </h2>
              <p className="text-2xl text-muted-foreground max-w-3xl mx-auto">
                Prospect provides cutting-edge tools and a vibrant community to help you master trading
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {[
                <TrendingUp className="h-8 w-8" />,
                <Users className="h-8 w-8" />,
                <Trophy className="h-8 w-8" />,
                <BookOpen className="h-8 w-8" />,
                <Cpu className="h-8 w-8" />,
                <Trophy className="h-8 w-8" />
              ].map((icon, index) => (
                <Card key={index} className="group relative overflow-hidden border border-border bg-card hover:shadow-xl transition-all duration-300 hover:-translate-y-2">
                  <CardContent className="p-8 text-center space-y-6">
                    <div className="mx-auto w-16 h-16 rounded-xl bg-gradient-to-br from-[#e0a815]/10 to-[#f2c74b]/10 border border-[#e0a815]/20 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                      <div className="text-[#e0a815]">
                        {icon}
                      </div>
                    </div>
                    <div className="space-y-3">
                      <h3 className="text-2xl font-bold text-card-foreground">
                        {
                          [
                            "Real-Time Trading",
                            "Community Discussions",
                            "Smart Betting System",
                            "Guided Learning",
                            "AI-Powered Insights",
                            "Monthly Contests"
                          ][index]
                        }
                      </h3>
                      <p className="text-muted-foreground leading-relaxed">
                        {
                          [
                            "Access live market data, make predictions, and learn from every trade.",
                            "Talk stocks, share strategies, and learn directly from other traders in real time.",
                            "Practice with our prediction system to build confidence before real investments.",
                            "Access courses, simulations, and direct guidance from verified trading experts.",
                            "Get personalized recommendations and market predictions powered by advanced algorithms.",
                            "Compete with other traders, earn rewards, and climb the leaderboards for monthly prizes."
                          ][index]
                        }
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>

          {/* CTA Section - Use black card like others */}
          <section className="relative">
            <Card className="border border-border bg-card hover:shadow-xl transition-shadow duration-300">
              <CardContent className="p-16 text-center space-y-8">
                <div className="space-y-6">
                  <Badge variant="secondary" className="bg-[#e0a815]/10 text-[#e0a815] border border-[#e0a815]/30 text-lg px-6 py-2">
                    Join Thousands of Traders
                  </Badge>
                  <h2 className="text-5xl font-bold leading-tight text-foreground">
                    Ready to Start Your Trading Journey?
                  </h2>
                  <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                    Join the Prospect community today and access everything you need to become a successful trader.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-8">
                  <Button
                    asChild
                    size="lg"
                    className="bg-gradient-to-r from-[#e0a815] to-[#f2c74b] text-black hover:from-[#f2c74b] hover:to-[#e0a815] text-lg px-12 py-4 font-bold shadow-xl hover:shadow-2xl transition-all duration-300"
                  >
                    <a href="/stocks">Get Started Free <ArrowRight className="ml-2 h-5 w-5 inline" /></a>
                  </Button>
                  <Button
                    variant="outline"
                    size="lg"
                    className="border-[#e0a815]/30 text-[#e0a815] hover:bg-[#e0a815]/10 text-lg px-12 py-4"
                    asChild
                  >
                    <a href="/features">Watch Demo</a>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </section>

          {/* Contact Section */}
          <section className="bg-muted/30 rounded-3xl p-16 text-center space-y-8">
            <div className="space-y-6">
              <div className="p-4 rounded-full bg-gradient-to-br from-[#e0a815] to-[#f2c74b] w-fit mx-auto">
                <Mail className="h-12 w-12 text-black" />
              </div>
              <h3 className="text-4xl font-bold">Have Questions?</h3>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                We're here to help you succeed. Reach out to our support team for any inquiries.
                Get personalized assistance and expert guidance.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-8">
              <Button asChild variant="default" size="lg" className="bg-gradient-to-r from-[#e0a815] to-[#f2c74b] hover:from-[#f2c74b] hover:to-[#e0a815] text-black text-lg px-8 py-4">
                <a href="mailto:contact@prospect.money" className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5" />
                  contact@prospect.money
                </a>
              </Button>
            </div>
          </section>

        </div>
      </main>
    </div>
  );
}
