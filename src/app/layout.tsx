import "./globals.css";
import Providers from "./providers";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { getServerTheme } from "@/lib/theme-server";

/**
 * Root layout component for the entire application
 * Handles theme initialization, metadata, and provider setup
 * Prevents theme flash of unstyled content (FOUC) with server-side theme detection
 */
export default async function RootLayout({ children }: { children: React.ReactNode }) {
    // Get theme from server to prevent flash of unstyled content
    const serverTheme = await getServerTheme();

    return (
        <html lang="en" suppressHydrationWarning>
            <head>
                {/* Theme initialization script to prevent FOUC */}
                <script dangerouslySetInnerHTML={{
                    __html: `
                        (function(){
                            try {
                                // Apply theme immediately to prevent flash of unstyled content
                                const serverTheme = ${JSON.stringify(serverTheme)};
                                let theme = serverTheme || localStorage.getItem('theme');
                                const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                                const mode = (theme === 'dark' || (!theme && prefersDark)) ? 'dark' : 'light';
                                document.documentElement.classList.toggle('dark', mode === 'dark');
                                if (!theme) localStorage.setItem('theme', mode);
                            } catch (e) {
                                console.debug('Theme preload script error:', e);
                            }
                        })();
                    `
                }} />

                {/* Application metadata */}
                <title>Prospect – The Social Trading Platform for Investors</title>
                <meta name="description" content="Prospect is the free social trading app for investors. Connect with traders, share insights, and trade smarter in real time." />

                {/* Favicon and icons */}
                <link rel="icon" type="image/png" href="/favicon-96x96.png" sizes="96x96" />
                <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
                <link rel="shortcut icon" href="/favicon.ico" />
                <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
                <link rel="manifest" href="/site.webmanifest" />
            </head>
            <body>
                <Providers initialTheme={serverTheme}>
                    {children}
                </Providers>
                <Analytics />
                <SpeedInsights />
            </body>
        </html>
    );
}
