"use client";
import { UnifiedForumPage } from "@/components/UnifiedForumPage";

interface FuturesPageProps {
  params: Promise<{ symbol: string }>;
}

export default function FuturesPage({ params }: FuturesPageProps) {
  return (
    <UnifiedForumPage
      params={params}
      forumType="futures"
      backLink="/futures"
      getMetadata={(symbol: string) => ({
        symbol: symbol.toUpperCase(),
        name: symbol.toUpperCase(),
        description: `Discussions about ${symbol.toUpperCase()}`
      })}
      getRouterPath={(category: string) => '/futures'}
    />
  );
}
