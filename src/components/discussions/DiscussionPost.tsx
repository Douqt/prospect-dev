"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { DiscussionComments } from "./DiscussionComments";
import { DiscussionVotes } from "./DiscussionVotes";
import { ChevronDown, ChevronUp, MessageSquare, Image as ImageIcon } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useRouter } from "next/navigation";
import { LazyImage } from "@/components/LazyImage";
import { STOCK_FORUMS, CRYPTO_FORUMS, FUTURES_FORUMS, GENERAL_FORUMS } from "../../../forum-categories";

interface Discussion {
  id: string;
  title: string;
  content: string;
  user_id: string;
  image_url?: string;
  category: string;
  created_at: string;
  profiles: {
    username?: string;
    display_name?: string;
    avatar_url?: string;
  };
  _count: {
    comments: number;
    votes: {
      up: number;
      down: number;
    };
  };
  viewed?: boolean;
}

interface DiscussionPostProps {
  discussion: Discussion;
}

export function DiscussionPost({ discussion }: DiscussionPostProps) {
  const router = useRouter();
  const [showComments, setShowComments] = useState(false);
  const userDisplayName = discussion.profiles?.display_name ||
    discussion.profiles?.username ||
    "Anonymous";

  const timeAgo = formatDistanceToNow(new Date(discussion.created_at), { addSuffix: true });

  // Helper function to determine router path based on category
  const getRouterPath = (category: string): string => {
    if (STOCK_FORUMS.includes(category.toUpperCase())) {
      return '/stocks';
    } else if (CRYPTO_FORUMS.includes(category.toUpperCase())) {
      return '/crypto';
    } else if (FUTURES_FORUMS.includes(category.toUpperCase())) {
      return '/futures';
    } else if (GENERAL_FORUMS.includes(category.toUpperCase())) {
      return '/';
    } else {
      return '/stocks'; // Default fallback
    }
  };

  return (
    <div className="group p-6 bg-card rounded-none border-0 hover:bg-gray-800 hover:shadow-md [&:has(.forum-tag:hover)]:bg-card text-card-foreground shadow-sm">
      <div className="flex items-start gap-4">
        <DiscussionVotes
          discussionId={discussion.id}
          upvotes={discussion._count.votes.up}
          downvotes={discussion._count.votes.down}
        />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                const username = discussion.profiles?.username;
                if (username) {
                  router.push(`/profile/${username}`);
                }
              }}
              className="hover:opacity-80 transition-opacity"
            >
              <Avatar className="w-8 h-8">
                <AvatarImage src={discussion.profiles?.avatar_url} />
                <AvatarFallback>
                  {userDisplayName[0]?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </button>
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                const username = discussion.profiles?.username;
                if (username) {
                  router.push(`/profile/${username}`);
                }
              }}
              className="hover:underline text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <span className="font-medium">{userDisplayName}</span>
            </button>
            <span className="text-sm text-muted-foreground">•</span>
            <span className="text-sm text-muted-foreground">{timeAgo}</span>
          </div>

          <h3 className={`text-xl font-semibold mb-2 ${discussion.viewed ? 'opacity-60' : ''}`}>
            {discussion.title}
            {discussion.viewed && (
              <span className="ml-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-muted/50 text-muted-foreground">
                <span className="w-1.5 h-1.5 bg-muted-foreground/60 rounded-full"></span>
                Seen
              </span>
            )}
          </h3>

          <div className={`text-muted-foreground mb-4 whitespace-pre-wrap ${discussion.viewed ? 'opacity-70' : ''}`}>
            {discussion.content}
          </div>

          {discussion.image_url && (
            <div className="mb-4">
              <LazyImage
                src={discussion.image_url}
                alt={discussion.title}
                className="max-w-full h-auto rounded-lg"
                placeholder="blur"
              />
            </div>
          )}

          <div className="flex items-center gap-2 mb-4">
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                router.push(`${getRouterPath(discussion.category)}/${discussion.category.toLowerCase()}`);
              }}
              className="forum-tag inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
            >
              {discussion.category}
            </button>
          </div>

          <Collapsible open={showComments} onOpenChange={setShowComments}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-2 hover:bg-muted/50">
                <MessageSquare className="w-4 h-4" />
                <span>{discussion._count.comments} Comments</span>
                {showComments ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <DiscussionComments discussionId={discussion.id} />
            </CollapsibleContent>
          </Collapsible>
        </div>
      </div>
    </div>
  );
}
