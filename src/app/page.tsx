import WaitlistForm from "@/components/WaitlistForm";
import FeatureCard from "@/components/FeatureCard";
import prospectLogo from "@/assets/prospect-logo.png";
import { TrendingUp, Users, Trophy, Zap, DollarSign, BookOpen } from "lucide-react";

export default function Page() {
    return (
      <div className="min-h-screen bg-black relative overflow-hidden">
      {/* Grid lines - behind everything */}
      <div 
        className="absolute inset-0 z-0 pointer-events-none grid-background"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(128, 128, 128, 0.2) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(128, 128, 128, 0.2) 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px',
        }}
      />
            {/* Header with Logo */}
            <header className="container mx-auto pl-8 pt-8 flex items-center">
                <img
                    src={prospectLogo.src}
                    alt="Prospect"
                    className="h-8 w-auto filter drop-shadow-lg"
                />
            </header>

            {/* Hero Section */}
            <section className="container mx-auto px-4 py-8 pt-8 text-center">
                <div className="max-w-4xl mx-auto">
                   <h1 className="mb-6 text-5xl md:text-6xl font-bold relative z-10 leading-snug pb-2">
                        The Free{" "}
                        <span className="animate-gold-cycle">
                            Social Trading
                        </span>
                        {" "} App
                    </h1>

                    <p className="mb-8 text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                        Connect, share, and trade smarter with a community of active investors.
                    </p>

                    <section className="container mx-auto px-4 py-8">
                        <div className="flex justify-center items-center">
                            <WaitlistForm />
                        </div>
                    </section>


                    {/* <div className="flex flex-wrap justify-center gap-6 text-sm text-muted-foreground">
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 bg-prospect-gold rounded-full"></div>
                                <span>Real-time market data</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 bg-prospect-gold rounded-full"></div>
                                <span>Active Trader Discussions</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 bg-prospect-gold rounded-full"></div>
                                <span>Expert Mentorship</span>
                            </div>
                    </div> */}
                </div>
            </section>

            {/* Features Section */}
            <section className="container mx-auto px-4">
                <div className="text-center mb-12">
                    <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">Everything You Need to Succeed</h2>
                    <p className="text-lg text-muted-foreground max-w-2xl mx-auto">Prospect gives traders a platform to share, learn, and grow smarter.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
                    <FeatureCard
                        icon={<TrendingUp className="h-8 w-8" />}
                        title="Real-Time Trading"
                        description="Access live market data, make predictions, and learn from every trade."
                    />

                    <FeatureCard
                        icon={<Users className="h-8 w-8" />}
                        title="Community Discussions"
                        description="Talk stocks, share strategies, and learn directly from other traders in real time."
                    />

                    <FeatureCard
                        icon={<DollarSign className="h-8 w-8" />}
                        title="Smart Betting System"
                        description="Practice with our 50-cent prediction system to build confidence before real investments."
                    />

                    <FeatureCard
                        icon={<BookOpen className="h-8 w-8" />}
                        title="Guided Learning"
                        description="Access courses, simulations, and direct guidance from verified trading experts."
                    />

                    <FeatureCard
                        icon={<Zap className="h-8 w-8" />}
                        title="AI-Powered Insights"
                        description="Get personalized recommendations and market predictions powered by advanced algorithms."
                    />

                    <FeatureCard
                        icon={<Trophy className="h-8 w-8 relative" />}
                        title="Monthly Contests"
                        description="Compete with other traders, earn rewards, and climb the leaderboards for monthly prizes."
                    />
                </div>
            </section>

            {/* CTA Section */}
            <section className="container mx-auto px-4 py-16 text-center relative z-10">
                <div className="max-w-3xl mx-auto bg-card border border-border rounded-2xl p-8 shadow-xl">
                    <h3 className="text-2xl md:text-3xl font-bold text-foreground mb-4">Have any questions?</h3>
                    <p className="text-lg text-muted-foreground mb-6">We're here to help! Reach out to our support team for any inquiries.</p>
                    {/* <div className="text-sm text-muted-foreground">🎯 Early access to all features • 🚀 Exclusive launch bonuses • 💎 Priority mentor matching</div> */}
                    <div className="flex items-center justify-center" style={{ gap: '1rem' }}>
                        <div className="flex items-center text-muted-foreground text-lg -mt-3 text-muted-foreground leading-relaxed">
                            <a href="mailto:contact@prospect.money" className="hover:text-prospect-gold transition-colors">
                            contact@prospect.money
                            </a>
                        </div>

                        <div className="flex items-center gap-6 text-muted-foreground text-lg">
                            {/* X (Twitter) */}
                            <a
                                href="https://x.com/try_prospect"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="hover:text-prospect-gold transition-colors"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24" className="w-7 h-7">
                                <path d="M10.119 7.20517L16.4486 0H14.9492L9.45087 6.25487L5.0626 0H0L6.63737 9.45937L0 17.0142H1.4994L7.30207 10.4074L11.9374 17.0142H17M2.04057 1.10727H4.34407L14.9481 15.9613H12.644"/>
                                </svg>
                            </a>

                            {/* Instagram */}
                            <a
                                href="https://instagram.com/tryprospect"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="hover:text-prospect-gold transition-colors"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24" className="w-7 h-7">
                                <path d="M9.99998 1.80184C12.6701 1.80184 12.9864 1.812 14.0408 1.86011C15.0158 1.90461 15.5453 2.06752 15.8977 2.20443C16.3644 2.38583 16.6976 2.60257 17.0475 2.95248C17.3974 3.30239 17.6142 3.63555 17.7955 4.10229C17.9325 4.4547 18.0954 4.98419 18.1399 5.95914C18.188 7.01364 18.1982 7.32989 18.1982 10C18.1982 12.6701 18.188 12.9864 18.1399 14.0409C18.0954 15.0158 17.9325 15.5453 17.7955 15.8978C17.6142 16.3645 17.3974 16.6976 17.0475 17.0476C16.6976 17.3975 16.3644 17.6142 15.8977 17.7956C15.5453 17.9325 15.0158 18.0954 14.0408 18.1399C12.9865 18.188 12.6703 18.1982 9.99998 18.1982C7.32969 18.1982 7.01344 18.188 5.95914 18.1399C4.98415 18.0954 4.45466 17.9325 4.10229 17.7956C3.63551 17.6142 3.30235 17.3975 2.95244 17.0476C2.60253 16.6976 2.38579 16.3645 2.20443 15.8978C2.06748 15.5453 1.90457 15.0158 1.86007 14.0409C1.81196 12.9864 1.8018 12.6701 1.8018 10C1.8018 7.32989 1.81196 7.01364 1.86007 5.95918C1.90457 4.98419 2.06748 4.4547 2.20443 4.10229C2.38579 3.63555 2.60253 3.30239 2.95244 2.95248C3.30235 2.60257 3.63551 2.38583 4.10229 2.20443C4.45466 2.06752 4.98415 1.90461 5.9591 1.86011C7.0136 1.812 7.32985 1.80184 9.99998 1.80184ZM9.99998 0C7.28412 0 6.94362 0.0115116 5.87701 0.0601777C4.81259 0.108764 4.08569 0.277786 3.44958 0.525007C2.79199 0.780564 2.23432 1.1225 1.67839 1.67843C1.12246 2.23436 0.780524 2.79203 0.524967 3.44962C0.277746 4.08573 0.108725 4.81263 0.060138 5.87705C0.0114719 6.94362 0 7.28416 0 10C0 12.7159 0.0114719 13.0564 0.060138 14.123C0.108725 15.1874 0.277746 15.9143 0.524967 16.5504C0.780524 17.208 1.12246 17.7657 1.67839 18.3216C2.23432 18.8775 2.79199 19.2195 3.44958 19.475C4.08569 19.7223 4.81259 19.8913 5.87701 19.9399C6.94362 19.9885 7.28412 20 9.99998 20C12.7158 20 13.0564 19.9885 14.1229 19.9399C15.1874 19.8913 15.9143 19.7223 16.5504 19.475C17.208 19.2195 17.7656 18.8775 18.3216 18.3216C18.8775 17.7657 19.2194 17.208 19.475 16.5504C19.7222 15.9143 19.8912 15.1874 19.9398 14.123C19.9885 13.0564 20 12.7159 20 10C20 7.28416 19.9885 6.94362 19.9398 5.87705C19.8912 4.81263 19.7222 4.08573 19.475 3.44962C19.2194 2.79203 18.8775 2.23436 18.3216 1.67843C17.7656 1.1225 17.208 0.780564 16.5504 0.525007C15.9143 0.277786 15.1874 0.108764 14.1229 0.0601777C13.0564 0.0115116 12.7158 0 9.99998 0ZM9.99998 4.86487C7.16393 4.86487 4.86483 7.16397 4.86483 10C4.86483 12.8361 7.16393 15.1352 9.99998 15.1352C12.836 15.1352 15.1351 12.8361 15.1351 10C15.1351 7.16397 12.836 4.86487 9.99998 4.86487ZM9.99998 13.3334C8.15904 13.3334 6.66663 11.841 6.66663 10C6.66663 8.15908 8.15904 6.66667 9.99998 6.66667C11.8409 6.66667 13.3333 8.15908 13.3333 10C13.3333 11.841 11.8409 13.3334 9.99998 13.3334ZM16.538 4.66199C16.538 5.32474 16.0008 5.86201 15.338 5.86201C14.6753 5.86201 14.138 5.32474 14.138 4.66199C14.138 3.99924 14.6753 3.462 15.338 3.462C16.0008 3.462 16.538 3.99924 16.538 4.66199Z"/>
                                </svg>
                            </a>

                            {/* TikTok */}
                            <a
                                href="https://tiktok.com/@tryprospect"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="hover:text-prospect-gold transition-colors"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24" className="w-7 h-7">
                                <path d="M16.1011 4.63516C15.9745 4.56975 15.8513 4.49804 15.7319 4.42031C15.3848 4.1908 15.0665 3.92037 14.7839 3.61484C14.0768 2.80586 13.8128 1.98516 13.7155 1.41055H13.7194C13.6382 0.933594 13.6718 0.625 13.6769 0.625H10.4565V13.0773C10.4565 13.2445 10.4565 13.4098 10.4495 13.573C10.4495 13.5934 10.4476 13.6121 10.4464 13.634C10.4464 13.643 10.4464 13.6523 10.4444 13.6617C10.4444 13.6641 10.4444 13.6664 10.4444 13.6687C10.4105 14.1155 10.2673 14.5471 10.0274 14.9256C9.78746 15.304 9.45824 15.6177 9.06865 15.8391C8.66261 16.0701 8.20337 16.1912 7.73623 16.1906C6.23583 16.1906 5.01982 14.9672 5.01982 13.4562C5.01982 11.9453 6.23583 10.7219 7.73623 10.7219C8.02024 10.7216 8.30251 10.7663 8.57255 10.8543L8.57646 7.57539C7.75668 7.4695 6.92385 7.53465 6.13051 7.76673C5.33717 7.99882 4.60054 8.3928 3.96708 8.92383C3.41203 9.40609 2.9454 9.98152 2.58818 10.6242C2.45224 10.8586 1.93935 11.8004 1.87724 13.3289C1.83818 14.1965 2.09873 15.0953 2.22294 15.4668V15.4746C2.30107 15.6934 2.6038 16.4398 3.09716 17.0691C3.49499 17.5739 3.96501 18.0174 4.49208 18.3852V18.3773L4.4999 18.3852C6.05888 19.4445 7.7874 19.375 7.7874 19.375C8.08662 19.3629 9.08896 19.375 10.2272 18.8355C11.4897 18.2375 12.2085 17.3465 12.2085 17.3465C12.6677 16.8141 13.0328 16.2074 13.2882 15.5523C13.5796 14.7863 13.6769 13.8676 13.6769 13.5004V6.89414C13.7159 6.91758 14.2362 7.26172 14.2362 7.26172C14.2362 7.26172 14.9858 7.74219 16.1554 8.05508C16.9944 8.27773 18.1249 8.32461 18.1249 8.32461V5.12773C17.7288 5.1707 16.9245 5.0457 16.1011 4.63516Z"/>
                                </svg>
                            </a>

                            {/* Discord
                            <a
                                href="https://discord.gg/prospect"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="hover:text-prospect-gold transition-colors"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24" className="w-6 h-6">
                                <path d="M16.9419 3.52317C15.6473 2.91744 14.263 2.47723 12.8157 2.22656C12.638 2.5479 12.4304 2.98012 12.2872 3.32394C10.7487 3.09258 9.22445 3.09258 7.7143 3.32394C7.57116 2.98012 7.3588 2.5479 7.17947 2.22656C5.73067 2.47723 4.3448 2.91906 3.05016 3.52638C0.438869 7.47238 -0.269009 11.3204 0.0849305 15.1137C1.81688 16.4071 3.49534 17.1928 5.14548 17.7069C5.55291 17.1462 5.91628 16.5501 6.22931 15.9219C5.63313 15.6954 5.06211 15.4158 4.52256 15.0912C4.6657 14.9852 4.80571 14.8743 4.94098 14.7603C8.23183 16.2995 11.8074 16.2995 15.0589 14.7603C15.1958 14.8743 15.3358 14.9852 15.4774 15.0912C14.9362 15.4174 14.3637 15.6969 13.7675 15.9235C14.0805 16.5501 14.4423 17.1478 14.8513 17.7085C16.503 17.1944 18.183 16.4087 19.915 15.1137C20.3303 10.7163 19.2056 6.90361 16.9419 3.52317ZM6.67765 12.7809C5.68977 12.7809 4.87963 11.8586 4.87963 10.7355C4.87963 9.61247 5.67247 8.68864 6.67765 8.68864C7.68285 8.68864 8.49297 9.61085 8.47567 10.7355C8.47723 11.8586 7.68285 12.7809 6.67765 12.7809ZM13.3223 12.7809C12.3344 12.7809 11.5243 11.8586 11.5243 10.7355C11.5243 9.61247 12.3171 8.68864 13.3223 8.68864C14.3275 8.68864 15.1376 9.61085 15.1203 10.7355C15.1203 11.8586 14.3275 12.7809 13.3223 12.7809Z"/>
                                </svg>
                            </a> */}
                        </div>
                    </div>

                </div>
            </section>
        </div>
    );
}
