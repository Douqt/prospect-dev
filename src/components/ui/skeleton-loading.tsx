import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

// Loading skeleton for discussion posts
export function DiscussionPostSkeleton() {
  return (
    <Card className="border-0 rounded-none">
      <CardContent className="p-6">
        <div className="flex gap-6">
          {/* Left side - Post content */}
          <div className="flex-1">
            {/* User info skeleton */}
            <div className="flex items-center gap-3 mb-3">
              <Skeleton className="w-10 h-10 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-16" />
              </div>
            </div>

            {/* Post title skeleton */}
            <Skeleton className="h-6 w-3/4 mb-2" />

            {/* Post content skeleton */}
            <div className="space-y-2 mb-4">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-4 w-4/6" />
            </div>

            {/* Engagement stats skeleton */}
            <div className="flex items-center gap-6">
              <Skeleton className="h-4 w-12" />
              <Skeleton className="h-4 w-12" />
              <Skeleton className="h-4 w-12" />
            </div>
          </div>

          {/* Right side - Chart skeleton */}
          <div className="flex-none w-80">
            <Card className="p-3">
              <Skeleton className="h-4 w-20 mb-2 mx-auto" />
              <Skeleton className="h-40 w-full" />
            </Card>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Loading skeleton for discussion list
export function DiscussionListSkeleton() {
  return (
    <div className="space-y-0">
      {Array.from({ length: 5 }).map((_, index) => (
        <div key={index}>
          {index > 0 && <div className="h-px bg-border w-full"></div>}
          <DiscussionPostSkeleton />
        </div>
      ))}
    </div>
  );
}

// Loading skeleton for comments
export function CommentSkeleton() {
  return (
    <div className="flex items-start gap-3">
      <Skeleton className="w-8 h-8 rounded-full flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="flex items-center gap-2">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-2 w-2 rounded-full" />
          <Skeleton className="h-3 w-12" />
        </div>
        <div className="space-y-1">
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-3/4" />
        </div>
      </div>
    </div>
  );
}

// Loading skeleton for comments section
export function CommentsSectionSkeleton() {
  return (
    <div className="mt-4 space-y-4">
      {Array.from({ length: 3 }).map((_, index) => (
        <CommentSkeleton key={index} />
      ))}
    </div>
  );
}

// Loading skeleton for chart component
export function ChartSkeleton() {
  return (
    <div className="space-y-1 flex flex-col h-full">
      {/* Time range buttons skeleton */}
      <div className="flex gap-1 p-1 bg-muted rounded-md">
        {Array.from({ length: 5 }).map((_, index) => (
          <Skeleton key={index} className="h-6 flex-1" />
        ))}
      </div>

      {/* Chart area skeleton */}
      <div className="flex-1 bg-muted/20 rounded-lg p-1 border">
        <Skeleton className="h-full w-full" />
      </div>

      {/* Price stats skeleton */}
      <div className="grid grid-cols-2 gap-1">
        <div className="space-y-1 py-1 text-center">
          <Skeleton className="h-4 w-12 mx-auto" />
          <Skeleton className="h-3 w-8 mx-auto" />
        </div>
        <div className="space-y-1 py-1 text-center">
          <Skeleton className="h-4 w-12 mx-auto" />
          <Skeleton className="h-3 w-8 mx-auto" />
        </div>
      </div>
    </div>
  );
}

// Loading skeleton for forum stats
export function ForumStatsSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 4 }).map((_, index) => (
        <Card key={index} className="text-center opacity-50">
          <CardContent className="p-4">
            <Skeleton className="h-8 w-16 mx-auto mb-2" />
            <Skeleton className="h-3 w-12 mx-auto mb-1" />
            <Skeleton className="h-4 w-20 mx-auto mb-2" />
            <Skeleton className="h-3 w-24 mx-auto" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// Loading skeleton for profile
export function ProfileSkeleton() {
  return (
    <div className="flex items-center gap-3">
      <Skeleton className="w-10 h-10 rounded-full" />
      <div className="space-y-2">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-3 w-16" />
      </div>
    </div>
  );
}
