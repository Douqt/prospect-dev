"use client";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
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
} from "@heroicons/react/24/outline";

import { GiCrossedSwords, GiGoldBar } from "react-icons/gi";

export default function Sidebar() {
  const [active, setActive] = useState("Dashboard");
  const [learnOpen, setLearnOpen] = useState(false);
  const pathname = usePathname();

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

  return (
    <aside className="w-64 bg-black border-r border-gray-800 fixed left-0 top-16 h-screen overflow-y-auto z-50 no-scrollbar">
      <div className="p-3">
        <nav className="space-y-0">
          {links.map((link) => (
            <div key={link.id}>
              {'id' in link && link.id.startsWith('breaker') ? (
                <hr className="border-gray-700 my-2" />
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
                            ? "bg-gray-900 border border-gray-700 text-indigo-500"
                            : "text-indigo-400 hover:bg-gray-900"
                          : derivedActive === link.id
                            ? "bg-gray-900 border border-gray-700 text-yellow-500"
                            : "text-gray-300 hover:bg-gray-900"
                      }`}
                    >
                      {link.icon}
                      {link.label}
                    </a>
                  )}

                      {"label" in link && link.id === "Learn" && learnOpen && (
                    <div className="ml-6 mt-2 space-y-2">
                      {["Mentors", "Videos"].map((id) => (
                        <a
                          key={id}
                          href={`/${toSlug(id)}`}
                          onClick={() => setActive(id)}
                          className={`block px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                            derivedLearnChildActive === id
                              ? "bg-gray-900 border border-gray-700 text-yellow-500"
                              : "text-gray-400 hover:bg-gray-900"
                          }`}
                        >
                          {id}
                        </a>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          ))}
        </nav>
      </div>
    </aside>
  );
}
