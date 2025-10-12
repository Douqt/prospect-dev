"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useParams } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import Navbar from "@/components/Navbar";
import { GridBackground } from "@/components/GridBackground";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DiscussionPost } from "@/components/discussions/DiscussionPost";
import { useQuery } from "@tanstack/react-query";

export default function ProfilePage() {
  const params = useParams();
  const username = params?.username as string | undefined;

  const [isCurrentUser, setIsCurrentUser] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [userData, setUserData] = useState<{
    id?: string;
    username?: string;
    display_name?: string;
    bio?: string;
    avatar_url?: string;
    created_at?: string;
  } | null>(null);

  // Check if viewing own profile or someone else's
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id || "");

      if (username) {
        // Viewing someone else's profile
        const { data: profileData } = await supabase
          .from("profiles")
          .select("*")
          .eq("username", username)
          .single();

        setUserData(profileData);
        setIsCurrentUser(user?.id === profileData?.id);
      }
    };

    checkAuth();
  }, [username]);

  const displayName = userData?.display_name || userData?.username || "User";
  const joinDate = userData?.created_at ?
    new Date(userData.created_at).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long'
    }) : "Unknown";

  // Get user's posts
  const { data: userPosts, isLoading: postsLoading } = useQuery({
    queryKey: ["user-posts", userData?.id],
    queryFn: async () => {
      if (!userData?.id) return [];

      // Get posts
      const { data: discussionsData, error } = await supabase
        .from("discussions")
        .select("id, title, content, user_id, image_url, category, created_at, upvotes, downvotes, comment_count")
        .eq("user_id", userData.id)
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) throw error;

      // Add profile info
      return discussionsData?.map(post => ({
        ...post,
        profiles: {
          username: userData.username,
          display_name: userData.display_name,
          avatar_url: userData.avatar_url
        },
        _count: {
          comments: post.comment_count || 0,
          votes: {
            up: post.upvotes || 0,
            down: post.downvotes || 0
          }
        }
      })) || [];
    },
    enabled: !!userData?.id
  });

  // Stats
  const totalPosts = userPosts?.length || 0;
  const totalUpvotes = userPosts?.reduce((sum, post) => sum + (post._count.votes.up || 0), 0) || 0;
  const totalComments = userPosts?.reduce((sum, post) => sum + (post._count.comments || 0), 0) || 0;

  if (!userData) {
    return (
      <div className="min-h-screen bg-background relative overflow-hidden text-foreground">
        <Sidebar />
        <GridBackground />
        <Navbar />
        <main className="relative z-10 pt-24 pl-64 pr-6">
          <div className="h-[calc(100vh-6rem)] flex items-center justify-center">
            <div className="text-muted-foreground">Loading profile...</div>
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
        <div className="max-w-4xl mx-auto py-8 space-y-8">

          {/* Profile Header */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row gap-6 items-center md:items-start">
                <Avatar className="w-24 h-24">
                  <AvatarImage src={userData.avatar_url} />
                  <AvatarFallback className="text-2xl">
                    {displayName[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 space-y-3 text-center md:text-left">
                  <div>
                    <h1 className="text-3xl font-bold">{displayName}</h1>
                    <p className="text-muted-foreground">@{userData.username || displayName}</p>
                    {userData.bio && (
                      <p className="text-sm text-muted-foreground mt-2 max-w-lg">{userData.bio}</p>
                    )}
                  </div>

                  <div className="flex gap-4 items-center justify-center md:justify-start">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-primary">{totalPosts}</div>
                      <div className="text-sm text-muted-foreground">Posts</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">{totalUpvotes}</div>
                      <div className="text-sm text-muted-foreground">Upvotes</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">{totalComments}</div>
                      <div className="text-sm text-muted-foreground">Comments</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-muted-foreground">{joinDate}</div>
                      <div className="text-sm text-muted-foreground">Joined</div>
                    </div>
                  </div>

                  {isCurrentUser && (
                    <div className="pt-4">
                      <Button asChild variant="outline">
                        <a href="/profile/edit-avatar">Edit Profile</a>
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* User's Posts */}
          <div className="space-y-4">
            <h2 className="text-2xl font-bold">Recent Posts</h2>

            {postsLoading ? (
              <div className="text-center py-8 text-muted-foreground">
                Loading posts...
              </div>
            ) : userPosts && userPosts.length > 0 ? (
              <div className="space-y-4">
                {userPosts.map((post: { id: string; [key: string]: unknown }) => (
                  <DiscussionPost key={post.id} discussion={post as any} />
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="py-12">
                  <div className="text-center text-muted-foreground">
                    <p className="text-lg mb-2">No posts yet</p>
                    <p className="text-sm">
                      {isCurrentUser ? "Create your first post to get started!" : "This user hasn't posted anything yet."}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
