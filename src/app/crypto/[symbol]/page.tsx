"use client";
import { UnifiedForumPage } from "@/components/UnifiedForumPage";
import { CRYPTO_FORUMS } from "@/lib/cryptoForums";

interface CryptoPageProps {
  params: Promise<{ symbol: string }>;
}

export default function CryptoPage({ params }: CryptoPageProps) {
  return (
    <UnifiedForumPage
      params={params}
      forumType="crypto"
      backLink="/crypto"
      getMetadata={(symbol: string) => {
        const cryptoData = CRYPTO_FORUMS[symbol.toUpperCase()];
        return {
          symbol: symbol.toUpperCase(),
          name: cryptoData || symbol.toUpperCase(),
          description: `Discussions about ${cryptoData || symbol.toUpperCase()} cryptocurrency`
        };
      }}
      getRouterPath={(category: string) => '/crypto'}
    />
  );
}
