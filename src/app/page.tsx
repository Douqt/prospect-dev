import WaitlistForm from "@/components/WaitlistForm";
import FeatureCard from "@/components/FeatureCard";
import prospectLogo from "@/assets/prospect-logo.png";
import { TrendingUp, Users, Trophy, Zap, DollarSign, BookOpen } from "lucide-react";

export default function Page() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary">
            {/* Hero Section */}
            <section className="container mx-auto px-4 py-16 text-center">
                <div className="max-w-4xl mx-auto">
                                <img
                                    src={prospectLogo.src}
                        alt="Prospect"
                        className="mx-auto mb-8 h-16 w-auto filter drop-shadow-lg"
                    />

                    <h1 className="mb-6 text-5xl md:text-6xl font-bold bg-gradient-to-r from-prospect-gold via-prospect-gold-light to-prospect-gold bg-clip-text text-transparent relative z-10 leading-snug pb-2">
                        The Stock Community 
                        <br />
                        Built for Traders Like You
                    </h1>

                    <p className="mb-8 text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                        Connect, learn, and grow with real conversations, expert mentors, and tools that turn market chatter into trading confidence.
                    </p>

                    <div className="mb-12">
                        <WaitlistForm />
                    </div>

                    <div className="flex flex-wrap justify-center gap-6 text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-prospect-gold rounded-full"></div>
                            <span>Real-time market data</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-prospect-gold rounded-full"></div>
                            <span>Expert mentorship</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-prospect-gold rounded-full"></div>
                            <span>Social trading community</span>
                        </div>
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section className="container mx-auto px-4 py-16">
                <div className="text-center mb-12">
                    <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">Everything You Need to Succeed</h2>
                    <p className="text-lg text-muted-foreground max-w-2xl mx-auto">From real-time market analysis to expert mentorship and gamified learning</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
                    <FeatureCard
                        icon={<TrendingUp className="h-8 w-8" />}
                        title="Real-Time Trading"
                        description="Access live market data, make predictions, and learn from every trade with our intuitive platform."
                    />

                    <FeatureCard
                        icon={<Users className="h-8 w-8" />}
                        title="Expert Mentorship"
                        description="Connect with verified trading experts who provide personalized guidance and proven strategies."
                    />

                    <FeatureCard
                        icon={<DollarSign className="h-8 w-8" />}
                        title="Smart Betting System"
                        description="Practice with our 50-cent prediction system to build confidence before real investments."
                    />

                    <FeatureCard
                        icon={<BookOpen className="h-8 w-8" />}
                        title="Interactive Courses"
                        description="Learn through structured courses, video content, and hands-on trading simulations."
                    />

                    <FeatureCard
                        icon={<Zap className="h-8 w-8" />}
                        title="AI-Powered Insights"
                        description="Get personalized recommendations and market predictions powered by advanced algorithms."
                    />

                    <FeatureCard
                        icon={<Trophy className="h-8 w-8" />}
                        title="Monthly Contests"
                        description="Compete with other traders, earn rewards, and climb the leaderboards for exclusive prizes."
                    />
                </div>
            </section>

            {/* CTA Section */}
            <section className="container mx-auto px-4 py-16 text-center">
                <div className="max-w-3xl mx-auto bg-card border border-border rounded-2xl p-8 shadow-xl">
                    <h3 className="text-2xl md:text-3xl font-bold text-foreground mb-4">Ready to Transform Your Trading Journey?</h3>
                    <p className="text-lg text-muted-foreground mb-6">Join thousands of traders who are already on our waitlist. Be the first to access Prospect when we launch.</p>
                    <div className="text-sm text-muted-foreground">🎯 Early access to all features • 🚀 Exclusive launch bonuses • 💎 Priority mentor matching</div>
                </div>
            </section>
        </div>
    );
}