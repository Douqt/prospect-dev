"use client";
import { useState } from "react";
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

  const ICON_SIZE = "h-4 w-4";

  const links: Array<
    { id: string; label?: string; icon?: React.ReactNode } | { id: "breaker" }
  > = [
    {
      id: "Dashboard",
      label: "Dashboard",
      icon: <HomeIcon className={ICON_SIZE} />,
    },
    {
      id: "Stock Wars",
      label: "Stock Wars",
      icon: <GiCrossedSwords className={ICON_SIZE} />,
    },
    {
      id: "Leaderboard",
      label: "Leaderboard",
      icon: <TrophyIcon className={ICON_SIZE} />,
    },
    {
      id: "Learn",
      label: "Learn",
      icon: <BookOpenIcon className={ICON_SIZE} />,
    },
    { id: "breaker" },
    {
      id: "News",
      label: "News",
      icon: <NewspaperIcon className={ICON_SIZE} />,
    },
    {
      id: "Trading Bot (BETA)",
      label: "Trading Bot (BETA)",
      icon: <CubeTransparentIcon className={ICON_SIZE} />,
    },
    { id: "breaker" },
    {
      id: "Stocks",
      label: "Stocks",
      icon: <BanknotesIcon className={ICON_SIZE} />,
    },
    {
      id: "Crypto",
      label: "Crypto",
      icon: <CurrencyDollarIcon className={ICON_SIZE} />,
    },
    {
      id: "Futures",
      label: "Futures",
      icon: <GiGoldBar className={ICON_SIZE} />,
    },
    { id: "breaker" },
    {
      id: "About",
      label: "About",
      icon: <BookOpenIcon className={ICON_SIZE} />,
    },
    {
      id: "Profile",
      label: "Profile",
      icon: <UserIcon className={ICON_SIZE} />,
    },
    {
      id: "Settings",
      label: "Settings",
      icon: <Cog6ToothIcon className={ICON_SIZE} />,
    },
    {
      id: "Logout",
      label: "Logout",
      icon: <ArrowRightOnRectangleIcon className={ICON_SIZE} />,
    },
  ];

  return (
    <aside className="w-64 bg-black border-r border-gray-800 fixed left-0 top-16 h-screen overflow-y-auto z-50 no-scrollbar">
      <div className="p-4">
        <nav className="space-y-1">
          {links.map((link) => (
            <div key={link.id}>
              {link.id === "breaker" ? (
                <hr className="border-gray-700 my-2" />
              ) : (
                <>
                  {/* narrow the union so TS knows label/icon exist */}
                  {"label" in link && (
                    <a
                      href={`#${link.id}`}
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
                          ? active === link.id
                            ? "bg-gray-900 border border-gray-700 text-indigo-500"
                            : "text-indigo-400 hover:bg-gray-900"
                          : active === link.id
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
                          href={`#${id}`}
                          onClick={() => setActive(id)}
                          className={`block px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                            active === id
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
