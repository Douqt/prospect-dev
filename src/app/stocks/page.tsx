"use client";
import { isStockForum, STOCK_FORUMS } from "../../../forum-categories";
import { UnifiedDashboard } from "@/components/UnifiedDashboard";

export default function StocksPage() {
  return (
    <UnifiedDashboard
      title="Stock Feed"
      description="Follow stock traders and markets in real-time"
      badgeText="All Forums"
      forumType="stocks"
      forumList={STOCK_FORUMS}
      categoryFilter={(category: string) => isStockForum(category)}
      getRouterPath={(category: string) => '/stocks'}
    />
  );
}
