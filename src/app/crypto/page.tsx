"use client";
import { CRYPTO_FORUMS } from "../../../forum-categories";
import { UnifiedDashboard } from "@/components/UnifiedDashboard";

export default function CryptoPage() {
  return (
    <UnifiedDashboard
      title="Crypto Feed"
      description="Follow crypto traders and markets in real-time"
      badgeText="All Forums"
      forumType="crypto"
      forumList={CRYPTO_FORUMS}
      categoryFilter={(category: string) => CRYPTO_FORUMS.includes(category)}
      getRouterPath={(category: string) => '/crypto'}
    />
  );
}
