"use client";
import { UnifiedForumPage } from "@/components/UnifiedForumPage";

interface CryptoPageProps {
  params: Promise<{ symbol: string }>;
}

export default function CryptoPage({ params }: CryptoPageProps) {
  return (
    <UnifiedForumPage
      params={params}
      forumType="crypto"
      backLink="/crypto"
      getMetadata={(symbol: string) => ({
        symbol: symbol.toUpperCase(),
        name: symbol.toUpperCase(),
        description: `Discussions about ${symbol.toUpperCase()}`
      })}
      getRouterPath={(category: string) => '/crypto'}
    />
  );
}
