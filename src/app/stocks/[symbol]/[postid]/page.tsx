"use client";
import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import Sidebar from "@/components/Sidebar";
import Navbar from "@/components/Navbar";
import { GridBackground } from "@/components/GridBackground";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BarChart3, MessageSquare, Users, TrendingUp, ArrowLeft, ThumbsUp, ThumbsDown, Heart } from "lucide-react";
import Link from "next/link";
import { PolygonChart } from "@/components/PolygonChart";
import { DiscussionVotes } from "@/components/discussions/DiscussionVotes";
import { CommentVote } from "@/components/discussions/CommentVote";
import { DiscussionComments } from "@/components/discussions/DiscussionComments";
import { DiscussionPost } from "@/components/discussions/DiscussionPost";

interface PostPageProps {
  params: Promise<{ symbol: string; postid: string }>;
}

export default function PostPage({ params }: PostPageProps) {
  // Unwrap the params Promise - this is needed in Next.js 15
  const [resolvedParams, setResolvedParams] = useState<{ symbol: string; postid: string } | null>(null);

  useEffect(() => {
    params.then(setResolvedParams);
  }, [params]);

  // Fetch the specific discussion/post
  const { data: discussion, isLoading, error } = useQuery({
    queryKey: ["discussion", resolvedParams?.postid],
    queryFn: async () => {
      if (!resolvedParams?.postid) return null;

      console.log("Fetching discussion:", resolvedParams.postid);

      const { data, error } = await supabase
        .from("discussions")
        .select("id, title, content, category, created_at, upvotes, downvotes, comment_count, user_id, main_category")
        .eq("id", resolvedParams.postid)
        .single();

      console.log("Discussion result:", data);
      if (error) throw error;

      // Fetch profile separately
      const { data: profile } = await supabase
        .from("profiles")
        .select("username, display_name, avatar_url")
        .eq("id", data.user_id)
        .single();

      return {
        ...data,
        profiles: profile || { username: null, display_name: null, avatar_url: null },
        _count: {
          comments: data.comment_count || 0
        }
      };
    }
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background relative overflow-hidden text-foreground">
        <Sidebar />
        <GridBackground />
        <Navbar />
        <main className="relative z-10 pt-24 pl-64 pr-6">
          <div className="max-w-4xl mx-auto">
            <div className="text-center py-16">
              <div className="text-muted-foreground">Loading post...</div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (error || !discussion) {
    return (
      <div className="min-h-screen bg-background relative overflow-hidden text-foreground">
        <Sidebar />
        <GridBackground />
        <Navbar />
        <main className="relative z-10 pt-24 pl-64 pr-6">
          <div className="max-w-4xl mx-auto">
            <div className="text-center py-16">
              <div className="text-6xl mb-4">❌</div>
              <h1 className="text-2xl font-bold mb-2">Post Not Found</h1>
              <p className="text-muted-foreground mb-4">
                This post doesn't exist or has been removed.
              </p>
              <Link href={`/stocks/${resolvedParams?.symbol || 'general'}`}>
                <Button>
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Forum
                </Button>
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background relative overflow-hidden text-foreground">
      <Sidebar />
      <GridBackground />
      <Navbar />

      <main className="relative z-10 pt-24 pl-64 pr-6">
        <div className="max-w-4xl mx-auto space-y-6">

          {/* Back Button */}
          <Link href={`/stocks/${resolvedParams?.symbol || 'general'}`} className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Back to {resolvedParams?.symbol?.toUpperCase() || 'Stocks'} Forum
          </Link>

          {/* Main Post Card */}
          <Card>
            <CardContent className="p-6">
              {/* Post Header with User Info and Actions */}
              <div className="flex items-start gap-4 mb-6">
                {/* User Avatar */}
                <div className="flex-shrink-0 w-12 h-12 rounded-full overflow-hidden flex items-center justify-center bg-gradient-to-br from-blue-500 to-purple-600">
                  {discussion.profiles?.avatar_url ? (
                    <img
                      src={discussion.profiles.avatar_url}
                      alt={`${discussion.profiles.display_name || discussion.profiles.username || 'Trader'} avatar`}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-white text-sm font-semibold">
                      {discussion.profiles?.display_name?.charAt(0)?.toUpperCase() ||
                       discussion.profiles?.username?.charAt(0)?.toUpperCase() ||
                       'T'}
                    </span>
                  )}
                </div>

                {/* User Info and Category Badge */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-semibold text-lg">
                      {discussion.profiles?.display_name || discussion.profiles?.username || 'Trader'}
                    </h3>
                    <Badge variant="outline" className="text-xs">
                      <Link href={`/stocks/${discussion.category.toLowerCase()}`}>
                        {discussion.category.toUpperCase()} Trader
                      </Link>
                    </Badge>
                  </div>

                  {/* Post Timestamp */}
                  <div className="text-sm text-muted-foreground mb-4">
                    {new Date(discussion.created_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </div>
                </div>

                {/* Post Actions */}
                <div className="flex items-center gap-2">
                  <DiscussionVotes discussionId={discussion.id} upvotes={discussion.upvotes} downvotes={discussion.downvotes} />
                </div>
              </div>

              {/* Post Title */}
              <h1 className="text-2xl font-bold mb-4">{discussion.title}</h1>

              {/* Post Content */}
              <div className="prose prose-invert max-w-none mb-6">
                <div className="text-lg leading-relaxed">
                  {discussion.content.split('\n').map((paragraph, index) => {
                    // Check if paragraph contains image URL
                    const imageMatch = paragraph.match(/https?:\/\/[^\s]+\.(jpg|jpeg|png|gif|webp)(\?[^\s]*)?/i);
                    if (imageMatch) {
                      return (
                        <div key={index} className="mb-4 -mx-6">
                          <img
                            src={imageMatch[0]}
                            alt="Post image"
                            className="rounded-lg max-w-full h-auto max-h-[500px] object-cover w-full"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        </div>
                      );
                    }

                    // Check if paragraph is just an image URL on its own line
                    if (paragraph.trim().match(/^https?:\/\/[^\s]+\.(jpg|jpeg|png|gif|webp)(\?[^\s]*)?$/i)) {
                      return null; // Skip this line since we rendered it above
                    }

                    // Regular text paragraph
                    return paragraph.trim() ? (
                      <p key={index} className="mb-4 last:mb-0 whitespace-pre-wrap">
                        {paragraph}
                      </p>
                    ) : null;
                  })}
                </div>
              </div>

              {/* Post Engagement Stats */}
              <div className="flex items-center gap-6 pt-4 border-t border-border">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MessageSquare className="w-4 h-4" />
                  <span>{discussion.comment_count} comments</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <TrendingUp className="w-4 h-4" />
                  <span>{discussion.upvotes - discussion.downvotes} points</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Heart className="w-4 h-4" />
                  <span>{discussion.upvotes} likes</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Comments Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Comments ({discussion.comment_count})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <DiscussionComments discussionId={discussion.id} />
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
