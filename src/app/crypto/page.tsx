"use client";
import { CRYPTO_FORUMS } from "@/lib/cryptoForums";
import { UnifiedDashboard } from "@/components/UnifiedDashboard";

export default function CryptoPage() {
  // Convert CRYPTO_FORUMS object to array of symbols
  const cryptoForumList = Object.keys(CRYPTO_FORUMS);

  return (
    <UnifiedDashboard
      title="Crypto Feed"
      description="Follow crypto traders and markets in real-time"
      badgeText="All Forums"
      forumType="crypto"
      forumList={cryptoForumList}
      categoryFilter={(category: string) => category.toUpperCase() in CRYPTO_FORUMS}
      getRouterPath={(category: string) => '/crypto'}
    />
  );
}
