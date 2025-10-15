"use client";
import { STOCK_FORUMS } from "../../../forum-categories";
import { UnifiedDashboard } from "@/components/UnifiedDashboard";

export default function StocksPage() {
  return (
    <UnifiedDashboard
      title="Stock Feed"
      description="Follow stock traders and markets in real-time"
      badgeText="All Forums"
      forumType="stocks"
      forumList={STOCK_FORUMS}
      categoryFilter={(category: string) => STOCK_FORUMS.includes(category)}
      getRouterPath={(category: string) => '/stocks'}
    />
  );
}
