import "./globals.css";
import Providers from "./providers";
import { Analytics } from "@vercel/analytics/next"
import { SpeedInsights } from "@vercel/speed-insights/next"

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en">
            <head>
                <title>Prospect – The Social Trading Platform for Investors</title>
                <meta name="description" content="Prospect is the free social trading app for investors. Connect with traders, share insights, and trade smarter in real time." />
                <link rel="icon" href="/favicon.png" />
                <link rel="shortcut icon" type="image/png" href="/favicon.png"/>
                <link rel="apple-touch-icon" href="/favicon.png"/>
            </head>
            <body>
                <Providers>{children}</Providers>
                <Analytics />
                <SpeedInsights />
            </body>
        </html>
    );
}
