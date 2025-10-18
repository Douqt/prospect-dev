"use client";

import { ALL_VALID_FORUMS } from "../../forum-categories";
import { UnifiedDashboard } from "@/components/UnifiedDashboard";

/**
 * Home page component displaying the main trading feed
 * Shows discussions from all trading forums in a unified dashboard
 * Routes different categories to appropriate sections of the app
 */
export default function HomePage() {
  return (
    <UnifiedDashboard
      title="Trading Feed"
      description="Follow traders and markets in real-time"
      badgeText="All Forums"
      forumType="all"
      forumList={ALL_VALID_FORUMS}
      categoryFilter={(category: string) => ALL_VALID_FORUMS.includes(category)}
      getRouterPath={(category: string) => {
        // Route main categories to their respective sections
        if (category === 'STOCKS' || category === 'CRYPTO' || category === 'FUTURES') {
          return '/'; // Main feed
        }
        // Route crypto symbols to crypto section
        if (category.toLowerCase().includes('btc') || category.toLowerCase().includes('eth')) {
          return '/crypto';
        }
        // Default to stocks section for other symbols
        return '/stocks';
      }}
    />
  );
}
