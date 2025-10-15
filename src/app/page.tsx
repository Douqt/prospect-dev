"use client";
import { ALL_VALID_FORUMS } from "../../forum-categories";
import { UnifiedDashboard } from "@/components/UnifiedDashboard";

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
        if (category === 'STOCKS' || category === 'CRYPTO' || category === 'FUTURES') return '/';
        return category.toLowerCase().includes('btc') || category.toLowerCase().includes('eth') ? '/crypto' : '/stocks';
      }}
    />
  );
}
