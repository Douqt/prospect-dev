"use client";
import { UnifiedPostPage } from "@/components/UnifiedPostPage";

interface PostPageProps {
  params: Promise<{ symbol: string; postid: string }>;
}

export default function PostPage({ params }: PostPageProps) {
  return (
    <UnifiedPostPage
      params={params}
      forumType="stocks"
      backLink="/stocks"
    />
  );
}
