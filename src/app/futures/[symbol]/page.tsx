"use client";
import { UnifiedForumPage } from "@/components/UnifiedForumPage";
import { FUTURES_FORUMS } from "@/lib/futuresForums";

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
        name: FUTURES_FORUMS?.[symbol.toUpperCase()]?.[0]?.["Product Name"] || symbol.toUpperCase(),
        description: `Discussions about ${symbol.toUpperCase()}`
      })}
      getRouterPath={(category: string) => '/futures'}
    />
  );
}
