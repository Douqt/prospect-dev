"use client";
import { FUTURES_FORUMS } from "../../../forum-categories";
import { UnifiedDashboard } from "@/components/UnifiedDashboard";

export default function FuturesPage() {
  return (
    <UnifiedDashboard
      title="Futures Feed"
      description="Follow futures traders and markets in real-time"
      badgeText="All Forums"
      forumType="futures"
      forumList={FUTURES_FORUMS}
      categoryFilter={(category: string) => FUTURES_FORUMS.includes(category)}
      getRouterPath={(category: string) => '/futures'}
    />
  );
}
