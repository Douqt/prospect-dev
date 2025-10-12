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



  return (
    <Card className="p-6">
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

          <h3 className="text-xl font-semibold mb-2">{discussion.title}</h3>

          <div className="text-muted-foreground mb-4 whitespace-pre-wrap">
            {discussion.content}
          </div>

          {discussion.image_url && (
            <div className="mb-4">
              <img
                src={discussion.image_url}
                alt={discussion.title}
                className="max-w-full h-auto rounded-lg"
              />
            </div>
          )}

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
    </Card>
  );
}
