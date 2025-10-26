import { UnifiedForumPage } from "@/components/UnifiedForumPage";

interface StockPageProps {
  params: Promise<{ symbol: string }>;
}

export default async function StockPage({ params }: StockPageProps) {
  const { symbol } = await params;
  return (
    <UnifiedForumPage
      params={{ symbol }}
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
