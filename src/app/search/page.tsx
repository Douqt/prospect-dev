"use client";
import { useEffect, useState, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";
import Link from "next/link";
import { Search, X, ArrowLeft } from "lucide-react";
import { STOCK_FORUMS, FUTURES_FORUMS, isStockForum, isCryptoForum, isFuturesForum, isGeneralForum } from "../../../forum-categories";
import { CRYPTO_FORUMS } from "@/lib/cryptoForums";
import Sidebar from "@/components/Sidebar";
import Navbar from "@/components/Navbar";

export const dynamic = 'force-dynamic';

interface SearchResult {
  type: string;
  id: string;
  title: string;
  subtitle: string;
  url: string;
  content?: string;
  relevance?: number;
  user?: {
    id: string;
    username: string;
    display_name: string;
    avatar_url?: string;
  };
}

type SearchFilter = 'all' | 'posts' | 'communities' | 'comments';

// Component that uses useSearchParams - needs to be wrapped in Suspense
function SearchPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialQuery = searchParams.get('query') || '';

  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [activeFilter, setActiveFilter] = useState<SearchFilter>('all');
  const [hasMoreResults, setHasMoreResults] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Helper function to calculate search relevance with custom weighting
  const calculateRelevance = (text: string, query: string): number => {
    const upperText = text.toUpperCase();
    const upperQuery = query.toUpperCase();

    // Custom keyword weighting system for posts
    const keywordWeights: { [key: string]: number } = {
      '8th': 1.3,
      'charm': 6,
      'post': 2,
      'time': 4
    };

    let baseScore = 0;

    // Check for exact matches first
    if (upperText === upperQuery) return 100;

    // Check for keyword matches with custom weights
    for (const [keyword, weight] of Object.entries(keywordWeights)) {
      if (upperText.includes(keyword.toUpperCase()) || upperQuery.includes(keyword.toUpperCase())) {
        baseScore += weight * 10;
      }
    }

    // Standard relevance scoring
    if (upperText.startsWith(upperQuery)) {
      baseScore = Math.max(baseScore, 90);
    } else if (upperText.includes(upperQuery)) {
      baseScore = Math.max(baseScore, 80);
    } else if (upperQuery.includes(upperText)) {
      baseScore = Math.max(baseScore, 70);
    } else {
      // Fuzzy match
      let queryIndex = 0;
      for (let i = 0; i < upperText.length && queryIndex < upperQuery.length; i++) {
        if (upperText[i] === upperQuery[queryIndex]) {
          queryIndex++;
        }
      }
      if (queryIndex === upperQuery.length) {
        baseScore = Math.max(baseScore, 60);
      }
    }

    return baseScore;
  };

  // Search function
  const performSearch = useCallback(async (query: string, filter: SearchFilter = 'all') => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);

    try {
      const upperQuery = query.toUpperCase();
      const resultsPerPage = 20;

      const allResults: SearchResult[] = [];

      // Get forums if requested
      if (filter === 'all' || filter === 'communities') {
        // Stock Forums
        const scoredStockForums = Object.keys(STOCK_FORUMS)
          .map(symbol => {
            const stock = STOCK_FORUMS[symbol];
            const symbolScore = calculateRelevance(symbol, query);
            const nameScore = calculateRelevance(stock.Name, query);
            const relevance = Math.max(symbolScore, nameScore);

            return {
              symbol,
              stock,
              relevance,
              title: `${symbol.toUpperCase()} - ${stock.Name}`,
              subtitle: `Stock Forum • ${stock['Last Sale']} (${stock['% Change']})`,
              url: `/stocks/${symbol.toLowerCase()}`
            };
          })
          .filter(item => item.relevance > 0)
          .sort((a, b) => b.relevance - a.relevance)
          .slice(0, 10)
          .map(item => ({
            type: 'stock-forum',
            id: item.symbol,
            title: item.title,
            subtitle: item.subtitle,
            url: item.url,
            relevance: item.relevance
          }));

        // Crypto Forums
        const scoredCryptoForums = Object.keys(CRYPTO_FORUMS)
          .map(symbol => {
            const cryptoName = CRYPTO_FORUMS[symbol];
            const symbolScore = calculateRelevance(symbol, query);
            const nameScore = calculateRelevance(cryptoName, query);
            const relevance = Math.max(symbolScore, nameScore);

            return {
              symbol,
              cryptoName,
              relevance,
              title: `${symbol.toUpperCase()} - ${cryptoName}`,
              subtitle: 'Crypto Trading Forum',
              url: `/crypto/${symbol.toLowerCase()}`
            };
          })
          .filter(item => item.relevance > 0)
          .sort((a, b) => b.relevance - a.relevance)
          .slice(0, 15)
          .map(item => ({
            type: 'crypto-forum',
            id: item.symbol,
            title: item.title,
            subtitle: item.subtitle,
            url: item.url,
            relevance: item.relevance
          }));

        // Futures Forums
        const scoredFuturesForums = FUTURES_FORUMS
          .map(forum => {
            const relevance = calculateRelevance(forum, query);
            return {
              forum,
              relevance,
              title: `${forum.toUpperCase()} Forum`,
              subtitle: 'Futures Trading Forum',
              url: `/futures/${forum.toLowerCase()}`
            };
          })
          .filter(item => item.relevance > 0)
          .sort((a, b) => b.relevance - a.relevance)
          .slice(0, 10)
          .map(item => ({
            type: 'futures-forum',
            id: item.forum,
            title: item.title,
            subtitle: item.subtitle,
            url: item.url,
            relevance: item.relevance
          }));

        allResults.push(...scoredStockForums, ...scoredCryptoForums, ...scoredFuturesForums);
      }

      // Get posts if requested
      if (filter === 'all' || filter === 'posts') {
        const { data: postResults, error: postError } = await supabase
          .from('discussions')
          .select(`
            id, title, category, created_at,
            profiles!fk_discussions_user(id, username, display_name, avatar_url)
          `)
          .or(`title.ilike.%${query}%,content.ilike.%${query}%`)
          .order('created_at', { ascending: false })
          .limit(resultsPerPage);

        if (postError) {
          console.error('Post search error:', postError);
        }

        // Convert post results to search results with relevance scoring
        const scoredPosts = postResults?.map((p: any) => {
          const titleScore = calculateRelevance(p.title, query);
          const categoryScore = calculateRelevance(p.category, query);
          const relevance = Math.max(titleScore, categoryScore);

          // Determine forum type and URL based on category using helper functions
          let forumType = '';
          let forumTypeLabel = '';
          let url = '';

          if (isStockForum(p.category)) {
            forumType = 'stocks';
            forumTypeLabel = 'Stock Forum';
            url = `/stocks/${p.category.toLowerCase()}/${p.id}`;
          } else if (isCryptoForum(p.category)) {
            forumType = 'crypto';
            forumTypeLabel = 'Crypto Forum';
            url = `/crypto/${p.category.toLowerCase()}/${p.id}`;
          } else if (isFuturesForum(p.category)) {
            forumType = 'futures';
            forumTypeLabel = 'Futures Forum';
            url = `/futures/${p.category.toLowerCase()}/${p.id}`;
          } else if (isGeneralForum(p.category)) {
            forumType = 'general';
            forumTypeLabel = 'General Forum';
            url = `/general/${p.category.toLowerCase()}/${p.id}`;
          } else {
            // Default fallback
            forumType = 'stocks';
            forumTypeLabel = 'Forum';
            url = `/stocks/${p.category.toLowerCase()}/${p.id}`;
          }

          return {
            post: p,
            relevance,
            title: p.title,
            subtitle: `Post • ${p.category.toUpperCase()} ${forumTypeLabel} • ${new Date(p.created_at).toLocaleDateString()}`,
            url: url,
            user: p.profiles ? {
              id: p.profiles.id,
              username: p.profiles.username,
              display_name: p.profiles.display_name || p.profiles.username,
              avatar_url: p.profiles.avatar_url
            } : undefined
          };
        })
        .filter(item => item.relevance > 0)
        .sort((a, b) => b.relevance - a.relevance)
        .slice(0, resultsPerPage)
        .map(item => ({
          type: 'post',
          id: item.post.id,
          title: item.title,
          subtitle: item.subtitle,
          url: item.url,
          relevance: item.relevance,
          user: item.user
        })) || [];

        allResults.push(...scoredPosts);
      }

      // Get comments if requested
      if (filter === 'all' || filter === 'comments') {
        const { data: commentResults, error: commentError } = await supabase
          .from('comments')
          .select(`
            id, content, discussion_id, created_at, user_id,
            discussions!comments_discussion_id_fkey(id, title, category)
          `)
          .ilike('content', `%${query}%`)
          .order('created_at', { ascending: false })
          .limit(resultsPerPage);

        // If we have comments, fetch the profile information separately
        let commentsWithProfiles = commentResults;
        if (commentResults && commentResults.length > 0) {
          const userIds = [...new Set(commentResults.map((c: any) => c.user_id).filter(Boolean))];

          if (userIds.length > 0) {
            const { data: profiles } = await supabase
              .from('profiles')
              .select('id, username, display_name, avatar_url')
              .in('id', userIds);

            // Map profiles to comments
            commentsWithProfiles = commentResults.map((comment: any) => ({
              ...comment,
              profiles: profiles?.find((p: any) => p.id === comment.user_id)
            }));
          }
        }

        if (commentError) {
          console.error('Comment search error:', commentError);
        }

        // Convert comment results to search results with relevance scoring
        const scoredComments = commentsWithProfiles?.map((c: any) => {
          const contentScore = calculateRelevance(c.content, query);
          const discussionTitleScore = calculateRelevance(c.discussions?.title || '', query);
          const relevance = Math.max(contentScore, discussionTitleScore);

          // Determine forum type and URL based on discussion category using helper functions
          let forumType = '';
          let forumTypeLabel = '';
          let url = '';

          if (isStockForum(c.discussions?.category || '')) {
            forumType = 'stocks';
            forumTypeLabel = 'Stock Forum';
            url = `/stocks/${c.discussions?.category?.toLowerCase() || 'general'}/${c.discussion_id}`;
          } else if (isCryptoForum(c.discussions?.category || '')) {
            forumType = 'crypto';
            forumTypeLabel = 'Crypto Forum';
            url = `/crypto/${c.discussions?.category?.toLowerCase() || 'general'}/${c.discussion_id}`;
          } else if (isFuturesForum(c.discussions?.category || '')) {
            forumType = 'futures';
            forumTypeLabel = 'Futures Forum';
            url = `/futures/${c.discussions?.category?.toLowerCase() || 'general'}/${c.discussion_id}`;
          } else if (isGeneralForum(c.discussions?.category || '')) {
            forumType = 'general';
            forumTypeLabel = 'General Forum';
            url = `/general/${c.discussions?.category?.toLowerCase() || 'general'}/${c.discussion_id}`;
          } else {
            // Default fallback
            forumType = 'stocks';
            forumTypeLabel = 'Forum';
            url = `/stocks/${c.discussions?.category?.toLowerCase() || 'general'}/${c.discussion_id}`;
          }

          // Truncate content for display
          const truncatedContent = c.content.length > 100
            ? c.content.substring(0, 100) + '...'
            : c.content;

          return {
            comment: c,
            relevance,
            title: `Comment on: ${c.discussions?.title || 'Unknown Post'}`,
            subtitle: `Comment • ${c.discussions?.category?.toUpperCase() || 'Unknown'} ${forumTypeLabel} • ${new Date(c.created_at).toLocaleDateString()}`,
            content: truncatedContent,
            url: url,
            user: c.profiles ? {
              id: c.profiles.id,
              username: c.profiles.username,
              display_name: c.profiles.display_name || c.profiles.username,
              avatar_url: c.profiles.avatar_url
            } : undefined
          };
        })
        .filter((item: any) => item.relevance > 0)
        .sort((a: any, b: any) => b.relevance - a.relevance)
        .slice(0, resultsPerPage)
        .map((item: any) => ({
          type: 'comment',
          id: item.comment.id,
          title: item.title,
          subtitle: item.subtitle,
          content: item.content,
          url: item.url,
          relevance: item.relevance,
          user: item.user
        })) || [];

        allResults.push(...scoredComments);
      }

      // Sort all results by relevance score
      allResults.sort((a, b) => {
        const aScore = a.relevance || 0;
        const bScore = b.relevance || 0;
        return bScore - aScore;
      });

      setSearchResults(allResults);
      setHasMoreResults(allResults.length >= resultsPerPage);

    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  // Filter results based on active filter
  const getFilteredResults = () => {
    switch (activeFilter) {
      case 'posts':
        return searchResults.filter(result => result.type === 'post');
      case 'comments':
        return searchResults.filter(result => result.type === 'comment');
      case 'communities':
        return searchResults.filter(result => result.type !== 'post' && result.type !== 'comment');
      default:
        return searchResults;
    }
  };

  // Handle filter button clicks
  const handleFilterChange = (filter: SearchFilter) => {
    setActiveFilter(filter);
    if (searchQuery.trim()) {
      performSearch(searchQuery, filter);
    }
  };



  // Initial search when component mounts
  useEffect(() => {
    if (initialQuery) {
      performSearch(initialQuery, 'all');
    }
  }, [initialQuery, performSearch]);

  const filteredResults = getFilteredResults();

  return (
    <div className="min-h-screen bg-background relative text-foreground">
      <Sidebar />
      <div
        className="absolute inset-0 z-0 pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(to right, rgba(128, 128, 128, 0.1) 1px, transparent 1px), linear-gradient(to bottom, rgba(128, 128, 128, 0.1) 1px, transparent 1px)`,
          backgroundSize: "100px 100px",
        }}
      />
      <Navbar />

      <main className="relative z-10 pt-24 ml-[300px]">
        <div className="flex max-w-7xl mx-auto px-6">
          {/* Main Content - Centered */}
          <div className="flex-1 max-w-4xl mx-auto">
            {/* Header */}
            <div className="mb-8">
              <div className="flex items-center gap-4 mb-6">
                <button
                  onClick={() => router.back()}
                  className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </button>
                <div className="h-6 w-px bg-border" />
                <h1 className="text-2xl font-bold">Search results for "{initialQuery}"</h1>
              </div>



              {/* Filter Buttons */}
              <div className="flex gap-2 mb-8">
                {[
                  { key: 'all', label: 'All' },
                  { key: 'posts', label: 'Posts' },
                  { key: 'communities', label: 'Communities' },
                  { key: 'comments', label: 'Comments' }
                ].map((filter) => (
                  <button
                    key={filter.key}
                    onClick={() => handleFilterChange(filter.key as SearchFilter)}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                      activeFilter === filter.key
                        ? "bg-[#e0a815] text-black"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    }`}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Search Results */}
            {isSearching ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#e0a815] mx-auto mb-4"></div>
                <p className="text-muted-foreground">Searching...</p>
              </div>
            ) : filteredResults.length > 0 ? (
              <>
                {/* Results Header */}
                <div className="mb-6">
                  <p className="text-muted-foreground">
                    {filteredResults.length} result{filteredResults.length !== 1 ? 's' : ''} for "{searchQuery}"
                  </p>
                </div>

                {/* Reddit-style Results */}
                <div className="space-y-6">
                  {/* Posts Section */}
                  {activeFilter !== 'communities' && filteredResults.some(r => r.type === 'post') && (
                    <>
                      <div>
                        <div className="px-4 py-2 bg-muted/50 rounded-t-lg border-b border-border">
                          <div className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                            Posts
                          </div>
                        </div>
                        <div className="bg-popover border border-t-0 border-border rounded-b-lg">
                          {filteredResults.filter(r => r.type === 'post').map((result, index) => (
                            <Link
                              key={`${result.type}-${result.id}-${index}`}
                              href={result.url}
                              className="block px-4 py-4 hover:bg-muted transition-colors border-b border-border last:border-b-0"
                            >
                              <div className="flex items-start gap-3">
                                {result.user?.avatar_url ? (
                                  <img
                                    src={result.user.avatar_url}
                                    alt={result.user.display_name}
                                    className="w-8 h-8 rounded-full flex-shrink-0"
                                  />
                                ) : (
                                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                                    <span className="text-xs text-muted-foreground">
                                      {result.user?.display_name?.[0]?.toUpperCase() || '?'}
                                    </span>
                                  </div>
                                )}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="font-medium text-sm text-foreground">
                                      {result.user?.display_name || result.user?.username || 'Unknown User'}
                                    </span>
                                  </div>
                                  <div className="font-medium text-foreground">{result.title}</div>
                                  <div className="text-sm text-muted-foreground mt-1">{result.subtitle}</div>
                                </div>
                              </div>
                            </Link>
                          ))}
                        </div>
                      </div>
                    </>
                  )}

                  {/* Comments Section */}
                  {activeFilter !== 'posts' && activeFilter !== 'communities' && filteredResults.some(r => r.type === 'comment') && (
                    <>
                      <div>
                        <div className="px-4 py-2 bg-muted/50 rounded-t-lg border-b border-border">
                          <div className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                            Comments
                          </div>
                        </div>
                        <div className="bg-popover border border-t-0 border-border rounded-b-lg">
                          {filteredResults.filter(r => r.type === 'comment').map((result, index) => (
                            <Link
                              key={`${result.type}-${result.id}-${index}`}
                              href={result.url}
                              className="block px-4 py-4 hover:bg-muted transition-colors border-b border-border last:border-b-0"
                            >
                              <div className="flex items-start gap-3">
                                {result.user?.avatar_url ? (
                                  <img
                                    src={result.user.avatar_url}
                                    alt={result.user.display_name}
                                    className="w-8 h-8 rounded-full flex-shrink-0"
                                  />
                                ) : (
                                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                                    <span className="text-xs text-muted-foreground">
                                      {result.user?.display_name?.[0]?.toUpperCase() || '?'}
                                    </span>
                                  </div>
                                )}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="font-medium text-sm text-foreground">
                                      {result.user?.display_name || result.user?.username || 'Unknown User'}
                                    </span>
                                  </div>
                                  <div className="font-medium text-foreground">{result.title}</div>
                                  <div className="text-sm text-muted-foreground mt-1">{result.subtitle}</div>
                                  {result.content && (
                                    <div className="text-sm text-muted-foreground mt-2 italic">
                                      "{result.content}"
                                    </div>
                                  )}
                                </div>
                              </div>
                            </Link>
                          ))}
                        </div>
                      </div>
                    </>
                  )}

                  {/* Communities Section */}
                  {activeFilter !== 'posts' && activeFilter !== 'comments' && filteredResults.some(r => r.type !== 'post' && r.type !== 'comment') && (
                    <>
                      <div>
                        <div className="px-4 py-2 bg-muted/50 rounded-t-lg border-b border-border">
                          <div className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                            Communities
                          </div>
                        </div>
                        <div className="bg-popover border border-t-0 border-border rounded-b-lg">
                          {filteredResults.filter(r => r.type !== 'post' && r.type !== 'comment').map((result, index) => (
                            <Link
                              key={`${result.type}-${result.id}-${index}`}
                              href={result.url}
                              className="block px-4 py-4 hover:bg-muted transition-colors border-b border-border last:border-b-0"
                            >
                              <div className="font-medium text-foreground">{result.title}</div>
                              <div className="text-sm text-muted-foreground mt-1">{result.subtitle}</div>
                            </Link>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </>
            ) : searchQuery.trim() ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No results found for "{searchQuery}"</p>
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-muted-foreground">Enter a search query to get started</p>
              </div>
            )}

            <div className="h-16"></div>
          </div>
        </div>
      </main>
    </div>
  );
}

// Main component that wraps SearchPageContent in Suspense
export default function SearchPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background relative text-foreground">
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#e0a815]"></div>
        </div>
      </div>
    }>
      <SearchPageContent />
    </Suspense>
  );
}
