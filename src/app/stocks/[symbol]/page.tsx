"use client";
import { UnifiedForumPage } from "@/components/UnifiedForumPage";

interface StockPageProps {
  params: Promise<{ symbol: string }>;
}

export default function StockPage({ params }: StockPageProps) {
  return (
    <UnifiedForumPage
      params={params}
      forumType="stocks"
      backLink="/stocks"
      getMetadata={(symbol: string) => ({
        symbol: symbol.toUpperCase(),
        name: symbol.toUpperCase(),
        description: `Discussions about ${symbol.toUpperCase()}`
      })}
      getRouterPath={(category: string) => '/stocks'}
    />
  );
}
