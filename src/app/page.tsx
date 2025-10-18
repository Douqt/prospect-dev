"use client";

import { ALL_VALID_FORUMS, isAllForum, isCryptoForum, isFuturesForum, isStockForum } from "../../forum-categories";
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
      categoryFilter={(category: string) => isAllForum(category)}
      getRouterPath={(category: string) => {
        // Route main categories to their respective sections
        if(isStockForum(category)) return '/stocks';
        if(isCryptoForum(category)) return '/crypto';
        if(isFuturesForum(category)) return '/futures';
        return '/';
      }}
    />
  );
}
