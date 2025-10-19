"use client";
import Link from "next/link";
import { useEffect, useState, useCallback} from "react";
import { supabase } from "../lib/supabaseClient";
import { timeAgo } from "../lib/time";
import { useTheme } from "@/hooks/useTheme";
import { Search, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { STOCK_FORUMS, FUTURES_FORUMS, isStockForum, isCryptoForum, isFuturesForum, isGeneralForum } from "../../forum-categories";
import { CRYPTO_FORUMS } from "@/lib/cryptoForums";

interface SearchResult {
  type: string;
  id: string;
  title: string;
  subtitle: string;
  url: string;
  relevance?: number;
}

export default function NavBar() {
  const { theme, toggleTheme } = useTheme();
  const [user, setUser] = useState<{ email?: string; id?: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [profile, setProfile] = useState<{
    username?: string;
    avatar_url?: string | null;
    last_login?: string | null;
  } | null>(null);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [localLastLogin, setLocalLastLogin] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchPage, setSearchPage] = useState(0);
  const [hasMoreResults, setHasMoreResults] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const s = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setIsLoading(false);
    });

    // Initialize user session - check if already available first
    const initUser = async () => {
      try {
        // First check if we already have a current session
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) {
          console.debug("Session error:", error);
          setIsLoading(false);
          return;
        }
        setUser(session?.user ?? null);
        setIsLoading(false);
      } catch (e) {
        console.debug("failed loading user session", e);
        setIsLoading(false);
      }
    };

    initUser();

    return () => s.data?.subscription?.unsubscribe();
  }, []);



  // Fetch profile data when user changes
  useEffect(() => {
    if (!user?.id) {
      setDisplayName(null);
      setProfile(null);
      return;
    }

    const fetchProfile = async () => {
      try {
        // Use the server API for profile data
        const token = (await supabase.auth.getSession()).data.session
          ?.access_token;
        if (!token) {
          // Fallback to client-side fetch for display name
          const displayResult = await supabase
            .from('profiles')
            .select('display_name')
            .eq('id', user.id)
            .single();
          setDisplayName(displayResult.data?.display_name || null);
          setProfile(null);
          return;
        }

        const r = await fetch(`/api/profile?userId=${user.id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!r.ok) {
          // Fallback to client-side
          const displayResult = await supabase
            .from('profiles')
            .select('display_name')
            .eq('id', user.id)
            .single();
          setDisplayName(displayResult.data?.display_name || null);
          setProfile(null);
        } else {
          const json = await r.json();
          const profileData = json.profile;
          setProfile(profileData || null);
          setDisplayName(profileData?.display_name || null);
        }
      } catch (error) {
        console.debug("Could not fetch profile:", error);
        // Fallback to just display name
        try {
          const { data } = await supabase
            .from('profiles')
            .select('display_name')
            .eq('id', user.id)
            .single();
          setDisplayName(data?.display_name || null);
          setProfile(null);
        } catch (fallbackError) {
          console.debug('Fallback display name fetch failed:', fallbackError);
          setDisplayName(null);
          setProfile(null);
        }
      }
    };

    fetchProfile();
  }, [user?.id]);

  // Listen for profile updates (e.g., from settings page)
  useEffect(() => {
    const handleProfileUpdate = () => {
      console.log('🔄 Navbar: Profile update event received');
      // Refetch profile when settings are updated
      if (user?.id) {
        const refetchProfile = async () => {
          try {
            const token = (await supabase.auth.getSession()).data.session
              ?.access_token;
            if (token) {
              const r = await fetch(`/api/profile?userId=${user.id}`, {
                headers: { Authorization: `Bearer ${token}` },
              });
              if (r.ok) {
                const json = await r.json();
                const profileData = json.profile;
                setProfile(profileData || null);
                setDisplayName(profileData?.display_name || null);
                console.log('🔄 Navbar: Profile data updated');
              }
            }
          } catch (error) {
            console.debug('Profile refetch failed:', error);
          }
        };
        refetchProfile();
      }
    };

    // Also handle immediate avatar updates (avatar uploaded to storage but not yet saved to profile)
    const handleAvatarUpdate = () => {
      console.log('🔄 Navbar: Avatar update event received');
      // For avatar updates, we refresh the page to show the new avatar
      // The avatar component uploaded to storage, so when page reloads, the component will fetch it
      window.location.reload();
    };

    // Listen for custom event or storage changes
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'profile_updated') {
        handleProfileUpdate();
      } else if (e.key === 'avatar_updated') {
        handleAvatarUpdate();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('profileUpdated', handleProfileUpdate);
    window.addEventListener('avatarUpdated', handleAvatarUpdate);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('profileUpdated', handleProfileUpdate);
      window.removeEventListener('avatarUpdated', handleAvatarUpdate);
    };
  }, [user?.id]);

  useEffect(() => {
    try {
      const v = localStorage.getItem("prospect:last_login");
      if (v) setLocalLastLogin(v);
    } catch (e) {
      /* ignore */
    }
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuOpen && !(event.target as Element).closest('.dropdown-container')) {
        setMenuOpen(false);
      }
      if (showSearchResults && !(event.target as Element).closest('.search-container')) {
        setShowSearchResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [menuOpen, showSearchResults]);

  // Search functionality with pagination support
  const performSearch = async (query: string, page: number = 0, append: boolean = false) => {
    if (!query.trim()) {
      setSearchResults([]);
      setSearchPage(0);
      setHasMoreResults(true);
      return;
    }

    if (page === 0) {
      setIsSearching(true);
    } else {
      setIsLoadingMore(true);
    }

    try {
      const upperQuery = query.toUpperCase();
      const resultsPerPage = 8;

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
            baseScore += weight * 10; // Multiply by 10 to give these higher priority
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
          // Fuzzy match - check if all characters of query exist in text in order
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

      // Get predefined forums that match the query with relevance scoring
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
        .sort((a, b) => b.relevance - a.relevance) // Sort by relevance (highest first)
        .slice(0, Math.min(10, resultsPerPage));

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
        .sort((a, b) => b.relevance - a.relevance) // Sort by relevance (highest first)
        .slice(0, Math.min(15, resultsPerPage));

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
        .sort((a, b) => b.relevance - a.relevance) // Sort by relevance (highest first)
        .slice(0, Math.min(10, resultsPerPage));

      const matchingStockForums = scoredStockForums.map(item => ({
        type: 'stock-forum',
        id: item.symbol,
        title: item.title,
        subtitle: item.subtitle,
        url: item.url,
        relevance: item.relevance
      }));

      const matchingCryptoForums = scoredCryptoForums.map(item => ({
        type: 'crypto-forum',
        id: item.symbol,
        title: item.title,
        subtitle: item.subtitle,
        url: item.url,
        relevance: item.relevance
      }));

      const matchingFuturesForums = scoredFuturesForums.map(item => ({
        type: 'futures-forum',
        id: item.forum,
        title: item.title,
        subtitle: item.subtitle,
        url: item.url,
        relevance: item.relevance
      }));

      // Search posts with pagination
      const postLimit = Math.max(3, resultsPerPage - matchingStockForums.length - matchingCryptoForums.length - matchingFuturesForums.length);
      const { data: postResults, error: postError } = await supabase
        .from('discussions')
        .select('id, title, category, created_at')
        .or(`title.ilike.%${query}%,content.ilike.%${query}%`)
        .order('created_at', { ascending: false })
        .limit(postLimit * 2); // Get more posts to allow for relevance filtering

      if (postError) {
        console.error('Post search error:', postError);
      }

      const predefinedForums = [
        ...matchingStockForums,
        ...matchingCryptoForums,
        ...matchingFuturesForums
      ];

      // Convert post results to proper URLs with relevance scoring
      const scoredPosts = postResults?.map(p => {
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
          url: url
        };
      })
      .filter(item => item.relevance > 0)
      .sort((a, b) => b.relevance - a.relevance) // Sort by relevance (highest first)
      .slice(0, postLimit) // Limit to requested number after sorting
      .map(item => ({
        type: 'post',
        id: item.post.id,
        title: item.title,
        subtitle: item.subtitle,
        url: item.url,
        relevance: item.relevance
      })) || [];

      // Combine predefined forums and posts
      const combinedResults = [...predefinedForums, ...scoredPosts];

      // Sort all results by relevance score
      combinedResults.sort((a, b) => {
        const aScore = a.relevance || 0;
        const bScore = b.relevance || 0;
        return bScore - aScore;
      });

      if (page === 0 || !append) {
        setSearchResults(combinedResults);
        setSearchPage(1);
        // Check if we got fewer results than requested (indicates end of data)
        const totalPredefinedForums = matchingStockForums.length + matchingCryptoForums.length + matchingFuturesForums.length;
        const hasMorePosts = postResults && postResults.length >= postLimit;
        const hasMorePredefined = totalPredefinedForums >= resultsPerPage;
        setHasMoreResults(hasMorePredefined || hasMorePosts);
      } else {
        // Filter out duplicates before adding
        setSearchResults(prev => {
          const existingIds = new Set(prev.map(r => r.id));
          const newResults = combinedResults.filter(r => !existingIds.has(r.id));
          return [...prev, ...newResults];
        });
        setSearchPage(page + 1);

        // Check if this batch has fewer results than requested (indicates end of data)
        const totalPredefinedForums = matchingStockForums.length + matchingCryptoForums.length + matchingFuturesForums.length;
        const hasMorePosts = postResults && postResults.length >= postLimit;
        const hasMorePredefined = totalPredefinedForums >= resultsPerPage;
        setHasMoreResults(hasMorePredefined || hasMorePosts);
      }
    } catch (error) {
      console.error('Search error:', error);
      if (page === 0) {
        setSearchResults([]);
      }
    } finally {
      setIsSearching(false);
      setIsLoadingMore(false);
    }
  };

  // Reddit-style posts-only search (when Enter is pressed)
  const performPostsOnlySearch = async (query: string) => {
    if (!query.trim()) return;

    setIsSearching(true);
    setShowSearchResults(true);

    try {
      const upperQuery = query.toUpperCase();

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
            baseScore += weight * 10; // Multiply by 10 to give these higher priority
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
          // Fuzzy match - check if all characters of query exist in text in order
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

      // Search only posts (Reddit style)
      const { data: postResults, error: postError } = await supabase
        .from('discussions')
        .select('id, title, category, created_at')
        .or(`title.ilike.%${query}%,content.ilike.%${query}%`)
        .order('created_at', { ascending: false })
        .limit(15); // Show more posts in Reddit style

      if (postError) {
        console.error('Post search error:', postError);
      }

      // Convert post results to proper URLs with relevance scoring
      const scoredPosts = postResults?.map(p => {
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
          url: url
        };
      })
      .filter(item => item.relevance > 0)
      .sort((a, b) => b.relevance - a.relevance) // Sort by relevance (highest first)
      .slice(0, 15) // Show top 15 posts
      .map(item => ({
        type: 'post',
        id: item.post.id,
        title: item.title,
        subtitle: item.subtitle,
        url: item.url
      })) || [];

      // Set results to show only posts (Reddit style)
      setSearchResults(scoredPosts);
      setHasMoreResults(false); // No infinite scroll for Enter key searches

    } catch (error) {
      console.error('Posts-only search error:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  // Load more results for infinite scroll
  const loadMoreResults = useCallback(() => {
    if (hasMoreResults && !isLoadingMore && searchQuery.trim()) {
      console.log('🔄 Loading more results, current page:', searchPage);
      setIsLoadingMore(true);
      const nextPage = searchPage + 1;
      performSearch(searchQuery, nextPage, true);
    }
  }, [hasMoreResults, isLoadingMore, searchQuery, searchPage, performSearch]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      performSearch(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Reset pagination when search query changes
  useEffect(() => {
    setSearchPage(0);
    setHasMoreResults(true);
    setSearchResults([]);
  }, [searchQuery]);

  // Infinite scroll handler with hover detection
  useEffect(() => {
    const dropdown = document.querySelector('.search-results-dropdown');
    if (!dropdown) return;

    let isHoveringDropdown = false;
    const scrollableDiv = dropdown.querySelector('.max-h-96.overflow-y-auto') as HTMLElement;

    const handleScroll = (e: Event) => {
      if (!scrollableDiv || !isHoveringDropdown) return;

      const { scrollTop, scrollHeight, clientHeight } = scrollableDiv;
      const isNearBottom = scrollTop + clientHeight >= scrollHeight - 50; // Reduced threshold for better detection

      if (isNearBottom && hasMoreResults && !isLoadingMore) {
        loadMoreResults();
      }
    };

    const handleMouseEnter = () => {
      isHoveringDropdown = true;
    };

    const handleMouseLeave = () => {
      isHoveringDropdown = false;
    };

    // Prevent body scroll when hovering over dropdown
    const preventBodyScroll = (e: WheelEvent) => {
      if (isHoveringDropdown && scrollableDiv) {
        e.preventDefault();
        e.stopPropagation();

        // Manually scroll the dropdown content
        scrollableDiv.scrollTop += e.deltaY;

        // Check if we need to load more results after scrolling
        setTimeout(() => {
          const { scrollTop, scrollHeight, clientHeight } = scrollableDiv;
          const isNearBottom = scrollTop + clientHeight >= scrollHeight - 50;

          if (isNearBottom && hasMoreResults && !isLoadingMore) {
            loadMoreResults();
          }
        }, 10);
      }
    };

    // Add event listeners to the scrollable div
    if (scrollableDiv) {
      scrollableDiv.addEventListener('scroll', handleScroll);
    }
    dropdown.addEventListener('mouseenter', handleMouseEnter);
    dropdown.addEventListener('mouseleave', handleMouseLeave);
    dropdown.addEventListener('wheel', preventBodyScroll, { passive: false });

    return () => {
      if (scrollableDiv) {
        scrollableDiv.removeEventListener('scroll', handleScroll);
      }
      dropdown.removeEventListener('mouseenter', handleMouseEnter);
      dropdown.removeEventListener('mouseleave', handleMouseLeave);
      dropdown.removeEventListener('wheel', preventBodyScroll);
    };
  }, [hasMoreResults, isLoadingMore, searchQuery, loadMoreResults]);

  const handleSearchResultClick = (url: string) => {
    setSearchQuery("");
    setShowSearchResults(false);
    router.push(url);
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    try {
      localStorage.removeItem("prospect:last_login");
    } catch (e) {
      console.debug("failed clearing local last_login", e);
    }
    window.location.href = "/";
  };

  return (
    <aside className="w-full fixed top-0 left-0 z-50 bg-background border-b border-border">
      <div className="w-full px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/">
            <img
              src="/images.png"
              alt="Prospect"
              className="h-8 w-auto filter drop-shadow-lg cursor-pointer"
            />
          </Link>
        </div>

        {/* Center Search Bar */}
        <div className="flex-1 max-w-2xl mx-8 relative search-container">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search forums, posts, stocks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setShowSearchResults(true)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && searchQuery.trim()) {
                  e.preventDefault();
                  // Navigate to search page when Enter is pressed (Reddit style)
                  router.push(`/search?query=${encodeURIComponent(searchQuery)}`);
                }
              }}
              className="w-full pl-10 pr-10 py-2 px-4 bg-muted border border-border rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-[#e0a815] focus:border-transparent"
            />
            {searchQuery && (
              <button
                onClick={() => {
                  setSearchQuery("");
                  setShowSearchResults(false);
                }}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}

            {/* Search Results Dropdown - Reddit Style */}
            {showSearchResults && searchQuery && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-popover border border-border rounded-lg shadow-xl z-50 search-results-dropdown">
                <div className="max-h-96 overflow-y-auto scrollbar-hide">
                  <style jsx>{`
                    .scrollbar-hide {
                      -ms-overflow-style: none;
                      scrollbar-width: none;
                    }
                    .scrollbar-hide::-webkit-scrollbar {
                      display: none;
                    }
                  `}</style>
                  {isSearching ? (
                    <div className="p-4 text-center text-muted-foreground">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#e0a815] mx-auto mb-2"></div>
                      Searching...
                    </div>
                  ) : searchResults.length > 0 ? (
                    <>
                      {/* Posts Section */}
                      {(() => {
                        const posts = searchResults.filter(result => result.type === 'post');
                        const forums = searchResults.filter(result => result.type !== 'post');

                        return (
                          <>
                            {/* Posts Section */}
                            {posts.length > 0 && (
                              <>
                                <div className="px-4 py-2 border-b border-border bg-muted/50">
                                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                                    Posts
                                  </div>
                                </div>
                                <div className="py-2">
                                  {posts.slice(0, 5).map((result, index) => (
                                    <button
                                      key={`${result.type}-${result.id}-${index}`}
                                      onClick={() => handleSearchResultClick(result.url)}
                                      className="w-full text-left px-4 py-3 hover:bg-muted transition-colors border-b border-border last:border-b-0"
                                    >
                                      <div className="font-medium text-foreground text-sm">{result.title}</div>
                                      <div className="text-xs text-muted-foreground mt-1">{result.subtitle}</div>
                                    </button>
                                  ))}
                                </div>

                                {/* Show more posts option */}
                                {posts.length > 5 && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      // TODO: Implement "show more posts" functionality
                                    }}
                                    className="w-full text-left px-4 py-2 text-xs text-[#e0a815] hover:bg-muted transition-colors border-b border-border"
                                  >
                                    Show more posts
                                  </button>
                                )}
                              </>
                            )}

                            {/* Communities Section */}
                            {forums.length > 0 && (
                              <>
                                <div className="px-4 py-2 border-b border-border bg-muted/50">
                                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                                    Communities
                                  </div>
                                </div>
                                <div className="py-2">
                                  {forums.slice(0, 5).map((result, index) => (
                                    <button
                                      key={`${result.type}-${result.id}-${index}`}
                                      onClick={() => handleSearchResultClick(result.url)}
                                      className="w-full text-left px-4 py-3 hover:bg-muted transition-colors border-b border-border last:border-b-0"
                                    >
                                      <div className="font-medium text-foreground text-sm">{result.title}</div>
                                      <div className="text-xs text-muted-foreground mt-1">{result.subtitle}</div>
                                    </button>
                                  ))}
                                </div>
                              </>
                            )}
                          </>
                        );
                      })()}

                      {/* Loading more indicator */}
                      {isLoadingMore && (
                        <div className="p-4 text-center text-muted-foreground border-t border-border">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#e0a815] mx-auto mb-2"></div>
                          Loading more...
                        </div>
                      )}

                      {/* End of results indicator */}
                      {!hasMoreResults && searchResults.length > 0 && (
                        <div className="p-3 text-center text-muted-foreground border-t border-border">
                          <div className="text-xs">No more results</div>
                        </div>
                      )}
                    </>
                  ) : searchQuery.trim() ? (
                    <div className="p-4 text-center text-muted-foreground text-sm">
                      No results found for "{searchQuery}"
                    </div>
                  ) : null}
                </div>
              </div>
            )}
          </div>
        </div>

        <nav className="hidden md:flex items-center gap-4">
          {/* Primary top links */}
          <div className="flex items-center gap-3">
            <Link href="/features" className="text-muted-foreground hover:text-foreground transition-colors">
              Features
            </Link>
            <Link href="/about" className="text-muted-foreground hover:text-foreground transition-colors">
              About
            </Link>
          </div>

          {isLoading ? (
            // Show loading state while determining user session
            <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-foreground"
              >
                <path d="M20 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M4 21v-2a4 4 0 0 1 3-3.87" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </div>
          ) : !user ? (
            <a
              href="/login"
              className={`px-4 py-2 rounded font-semibold text-sm transition-colors ${
                theme === 'dark'
                  ? "bg-[#e0a815] text-black hover:brightness-95"
                  : "bg-sky-400 text-white hover:bg-sky-500"
              }`}
            >
              Login/Signup
            </a>
          ) : (
            <div className="relative dropdown-container">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setMenuOpen((s) => !s)}
                  className="flex items-center gap-2 focus:outline-none"
                >
                  {profile?.avatar_url ? (
                    <img
                      src={profile.avatar_url}
                      alt="avatar"
                      className="w-8 h-8 rounded-full object-cover"
                    />
                  ) : (
                    <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="text-foreground"
                      >
                        <path d="M20 21v-2a4 4 0 0 0-3-3.87" />
                        <path d="M4 21v-2a4 4 0 0 1 3-3.87" />
                        <circle cx="12" cy="7" r="4" />
                      </svg>
                    </div>
                  )}
                </button>
              </div>
              {menuOpen && (
                <div className="absolute right-0 mt-2 w-80 rounded-lg shadow-xl z-50 bg-popover border border-border">
                  {/* User Info Section */}
                  <div className="px-4 py-3 border-b border-border">
                    <div className="flex items-center gap-3">
                      {profile?.avatar_url ? (
                        <img
                          src={profile.avatar_url}
                          alt="avatar"
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="24"
                            height="24"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="text-foreground"
                          >
                            <path d="M20 21v-2a4 4 0 0 0-3-3.87" />
                            <path d="M4 21v-2a4 4 0 0 1 3-3.87" />
                            <circle cx="12" cy="7" r="4" />
                          </svg>
                        </div>
                      )}
                      <div>
                        <div className="text-sm font-medium text-foreground">
                          {displayName || "User"}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {user?.email}
                        </div>
                      </div>
                    </div>
                    {(profile?.last_login ?? localLastLogin) && (
                      <div className="mt-2 text-xs text-muted-foreground">
                        Last active {timeAgo(profile?.last_login ?? localLastLogin)}
                      </div>
                    )}
                  </div>

                  {/* Menu Items */}
                  <div className="py-2">
                    <a
                      href={`/profile/${profile?.username || user?.email?.split('@')[0] || 'user'}`}
                      className="flex items-center gap-3 px-4 py-2 text-sm transition-colors text-foreground hover:bg-muted"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      Profile
                    </a>

                    <div className={`flex items-center justify-between px-4 py-2 ${
                      theme === 'dark'
                        ? "text-gray-200"
                        : "text-gray-700"
                    }`}>
                      <div className="flex items-center gap-3 text-sm">
                        {theme === 'dark' ? (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                          </svg>
                        ) : (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                          </svg>
                        )}
                        {theme === 'dark' ? "Dark mode" : "Light mode"}
                      </div>
                      <button
                        onClick={toggleTheme}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                          theme === 'dark'
                            ? "bg-[#e0a815] focus:ring-[#e0a815]"
                            : "bg-gray-200 focus:ring-sky-400"
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            theme === 'dark' ? "translate-x-6" : "translate-x-1"
                          }`}
                        />
                      </button>
                    </div>

                    <a
                      href="/profile/edit-avatar"
                      className="flex items-center gap-3 px-4 py-2 text-sm transition-colors text-foreground hover:bg-muted"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      Edit Avatar
                    </a>

                    <a
                      href="/prospect-pro"
                      className="flex items-center gap-3 px-4 py-2 text-sm transition-colors text-foreground hover:bg-muted"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                      </svg>
                      Prospect Pro
                    </a>

                    <a
                      href="/achievements"
                      className="flex items-center gap-3 px-4 py-2 text-sm transition-colors text-foreground hover:bg-muted"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                      </svg>
                      Achievements
                    </a>

                    <a
                      href="/settings"
                      className="flex items-center gap-3 px-4 py-2 text-sm transition-colors text-foreground hover:bg-muted"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      Settings
                    </a>
                  </div>

                  {/* Logout Section */}
                  <div className="border-t py-2 border-border">
                    <button
                      onClick={signOut}
                      className={`w-full flex items-center gap-3 px-4 py-2 text-sm transition-colors ${
                        theme === 'dark'
                          ? "text-red-400 hover:bg-gray-800"
                          : "text-red-600 hover:bg-gray-100"
                      }`}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      Sign out
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </nav>

        <button className="md:hidden text-foreground">{/* mobile menu */}</button>
      </div>
    </aside>
  );
}
