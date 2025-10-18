"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogTrigger, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { DiscussionList } from "./DiscussionList";
import { CreatePostForm } from "./CreatePostForm";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Plus } from "lucide-react";

interface DiscussionForumProps {
  category: string;
}

export function DiscussionForum({ category }: DiscussionForumProps) {
  const [newPostDialogOpen, setNewPostDialogOpen] = useState(false);

  const categoryDisplayName = {
    stocks: "Stocks",
    crypto: "Crypto",
    futures: "Futures",
    nvda: "Nvidia",
    amd: "AMD",
    appl: "Apple",
    tsla: "Tesla",
    googl: "Alphabet",
    msft: "Microsoft"
  }[category.toLowerCase()] || category.toUpperCase();

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">{categoryDisplayName}  </h1>
        <Dialog open={newPostDialogOpen} onOpenChange={setNewPostDialogOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              New Post
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogTitle>Create New Post</DialogTitle>
            <DialogDescription>
              Share your thoughts and start a discussion in the {categoryDisplayName} forum.
            </DialogDescription>
            <CreatePostForm
              category={category}
              onClose={() => setNewPostDialogOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      <ErrorBoundary>
        <DiscussionList category={category} />
      </ErrorBoundary>
    </div>
  );
}
