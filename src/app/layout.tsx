import "./globals.css";
import Providers from "./providers";

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en">
            <head>
                <title>Prospect - Master Trading with Expert Mentorship</title>
                <meta name="description" content="Join Prospect - expert mentorship and real-time market insights." />
                <link rel="icon" href="/logo.png" />
            </head>
            <body>
                <Providers>{children}</Providers>
            </body>
        </html>
    );
}
