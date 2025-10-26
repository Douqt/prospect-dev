"use client";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { supabase } from "../lib/supabaseClient";
import { motion, AnimatePresence } from "framer-motion";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  HomeIcon,
  TrophyIcon,
  BookOpenIcon,
  NewspaperIcon,
  Cog6ToothIcon,
  UserIcon,
  ArrowRightOnRectangleIcon,
  CurrencyDollarIcon,
  BanknotesIcon,
  CubeTransparentIcon,
  Bars3Icon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from "@heroicons/react/24/outline";

import { GiCrossedSwords, GiGoldBar } from "react-icons/gi";

export default function Sidebar() {
  const [user, setUser] = useState<{ email?: string } | null>(null);
  const [profile, setProfile] = useState<{ username?: string } | null>(null);
  const [active, setActive] = useState("Dashboard");
  const [learnOpen, setLearnOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const pathname = usePathname();
  const isMobile = useIsMobile();

  useEffect(() => {
    // Initialize dark mode state from document class (set by layout script)
    const isDark = document.documentElement.classList.contains("dark");
    setDarkMode(isDark);

    // Watch for changes in dark mode
    const observer = new MutationObserver(() => {
      const isDark = document.documentElement.classList.contains("dark");
      setDarkMode(isDark);
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"]
    });

    return () => observer.disconnect();
  }, []);

  // Fetch user and profile data
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      if (user) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('username')
          .eq('id', user.id)
          .single();
        setProfile(profileData);
      } else {
        setProfile(null);
      }
    };
    getUser();
  }, []);

  const ICON_SIZE = "h-4 w-4";

  const toSlug = (label: string) =>
    label
      .toLowerCase()
      .replace(/\s+\(beta\)/g, "-beta")
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "");

  const links: (
    | { id: string; label: string; icon: React.ReactNode }
    | { id: `breaker-${number}` }          // ← unique keys
  )[] = [
    { id: 'Dashboard',       label: 'Dashboard',       icon: <HomeIcon className={ICON_SIZE} /> },
    { id: 'Stock Wars',      label: 'Stock Wars',      icon: <GiCrossedSwords className={ICON_SIZE} /> },
    { id: 'Leaderboard',     label: 'Leaderboard',     icon: <TrophyIcon className={ICON_SIZE} /> },
    { id: 'Learn',           label: 'Learn',           icon: <BookOpenIcon className={ICON_SIZE} /> },
    { id: 'breaker-1' },
    { id: 'News',            label: 'News',            icon: <NewspaperIcon className={ICON_SIZE} /> },
    { id: 'Trading Bot (BETA)', label: 'Trading Bot (BETA)', icon: <CubeTransparentIcon className={ICON_SIZE} /> },
    { id: 'breaker-2' },
    { id: 'Stocks',          label: 'Stocks',          icon: <BanknotesIcon className={ICON_SIZE} /> },
    { id: 'Crypto',          label: 'Crypto',          icon: <CurrencyDollarIcon className={ICON_SIZE} /> },
    { id: 'Futures',         label: 'Futures',         icon: <GiGoldBar className={ICON_SIZE} /> },
    { id: 'breaker-3' },
    { id: 'About',           label: 'About',           icon: <BookOpenIcon className={ICON_SIZE} /> },
    { id: 'Profile',         label: 'Profile',         icon: <UserIcon className={ICON_SIZE} /> },
    { id: 'Settings',        label: 'Settings',        icon: <Cog6ToothIcon className={ICON_SIZE} /> },
    { id: 'Logout',          label: 'Logout',          icon: <ArrowRightOnRectangleIcon className={ICON_SIZE} /> },
  ];

  // derive active item from the current pathname
  const currentSlug = (pathname?.split("/")[1] || "dashboard").toLowerCase();
  const derivedActive = (() => {
    const match = links.find(
      (l): l is { id: string; label: string; icon: React.ReactNode } =>
        "label" in l && toSlug(l.id) === currentSlug
    );
    if (match) return match.id;
    // treat home page as Dashboard
    if (pathname === "/") return "Dashboard";
    return "";
  })();

  // active state for Learn submenu items
  const derivedLearnChildActive = currentSlug === "mentors"
    ? "Mentors"
    : currentSlug === "videos"
    ? "Videos"
    : "";

  // auto-open Learn submenu on its subpages
  useEffect(() => {
    if (currentSlug === "mentors" || currentSlug === "videos") {
      setLearnOpen(true);
    }
  }, [currentSlug]);

  // Load collapsed state from localStorage, default to collapsed on mobile
  useEffect(() => {
    const savedCollapsed = localStorage.getItem("sidebar-collapsed");
    if (savedCollapsed !== null) {
      setIsCollapsed(JSON.parse(savedCollapsed));
    } else {
      // Default to collapsed on mobile
      setIsCollapsed(isMobile);
    }
  }, [isMobile]);

  // Save collapsed state to localStorage
  const toggleSidebar = () => {
    const newCollapsed = !isCollapsed;
    setIsCollapsed(newCollapsed);
    localStorage.setItem("sidebar-collapsed", JSON.stringify(newCollapsed));
  };

  return (
    <motion.aside
      className={`fixed left-0 top-16 h-screen overflow-y-auto z-50 no-scrollbar bg-background border-r border-border ${isCollapsed ? 'w-16' : 'w-64'}`}
      initial={false}
      animate={{ width: isCollapsed ? 64 : 256 }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
    >
      <div className="p-3">
        {/* Toggle Button - Reddit Style */}
        <div className="flex justify-end relative">
          <div className={`absolute -right-3 top-2 z-10 ${isCollapsed ? 'right-[-12px]' : 'right-[-12px]'}`}>
            <button
              onClick={toggleSidebar}
              className="w-6 h-6 rounded-full bg-background border border-border shadow-md hover:bg-muted transition-colors flex items-center justify-center"
              aria-label="Collapse Navigation"
              title="Collapse Navigation"
            >
              {isCollapsed ? (
                <ChevronRightIcon className="h-3 w-3" />
              ) : (
                <ChevronLeftIcon className="h-3 w-3" />
              )}
            </button>
          </div>
        </div>
        <nav className="space-y-0">
          {links.map((link) => (
            <div key={link.id}>
              {'id' in link && link.id.startsWith('breaker') ? (
                <hr className={`my-2 border-border ${isCollapsed ? 'mx-2' : ''}`} />
              ) : (
                <>
                  {/* narrow the union so TS knows label/icon exist */}
                  {"label" in link && (
                    <a
                      href={
                        link.id === "Learn"
                          ? "#"
                          : link.id === "Dashboard"
                            ? "/"
                            : link.id === "Profile"
                              ? `/profile/${profile?.username || user?.email?.split('@')[0] || 'user'}`
                              : `/${toSlug(link.id)}`
                      }
                      onClick={(e) => {
                        setActive(link.id);
                        if (link.id === "Learn") {
                          e.preventDefault();
                          setLearnOpen((p) => !p);
                        } else {
                          setLearnOpen(false);
                        }
                      }}
                      className={`w-full text-left flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-colors ${
                        link.id === "Stock Wars"
                          ? derivedActive === link.id
                            ? "bg-muted border border-border text-red-600"
                            : "text-red-600 hover:bg-muted"
                          : derivedActive === link.id
                            ? "bg-muted border border-border text-primary"
                            : "text-foreground hover:bg-muted"
                      }`}
                      title={isCollapsed ? link.label : undefined}
                    >
                      {link.icon}
                      <AnimatePresence>
                        {!isCollapsed && (
                          <motion.span
                            initial={{ opacity: 0, width: 0 }}
                            animate={{ opacity: 1, width: "auto" }}
                            exit={{ opacity: 0, width: 0 }}
                            transition={{ duration: 0.2 }}
                          >
                            {link.label}
                          </motion.span>
                        )}
                      </AnimatePresence>
                    </a>
                  )}

                  <AnimatePresence>
                    {"label" in link && link.id === "Learn" && learnOpen && !isCollapsed && (
                      <motion.div
                        className="ml-6 mt-2 space-y-2"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        {["Mentors", "Videos"].map((id) => (
                          <a
                            key={id}
                            href={`/${toSlug(id)}`}
                            onClick={() => setActive(id)}
                            className={`block px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                              derivedLearnChildActive === id
                                ? "bg-muted border border-border text-primary"
                                : "text-muted-foreground hover:bg-muted"
                            }`}
                          >
                            {id}
                          </a>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </>
              )}
            </div>
          ))}
        </nav>
      </div>
    </motion.aside>
  );
}
