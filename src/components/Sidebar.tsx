"use client";
import { useState } from "react";
import {
  HomeIcon,
  ChartBarIcon,
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

  const ICON_SIZE = "h-6 w-6";

  const links = [
    { id: "Dashboard", label: "Dashboard", icon: <HomeIcon className={ICON_SIZE} /> },
    { id: "Stock Wars", label: "Stock Wars", icon: <GiCrossedSwords className={ICON_SIZE} /> },
    { id: "Leaderboard", label: "Leaderboard", icon: <TrophyIcon className={ICON_SIZE} /> },
    { id: "Learn", label: "Learn", icon: <BookOpenIcon className={ICON_SIZE} /> },
    { id: "breaker" },
    { id: "News", label: "News", icon: <NewspaperIcon className={ICON_SIZE} /> },
    { id: "Trading Bot (BETA)", label: "Trading Bot (BETA)", icon: <CubeTransparentIcon className={ICON_SIZE} /> },
    { id: "breaker" },
    { id: "Stocks", label: "Stocks", icon: <BanknotesIcon className={ICON_SIZE} /> },
    { id: "Crypto", label: "Crypto", icon: <CurrencyDollarIcon className={ICON_SIZE} /> },
    { id: "Futures", label: "Futures", icon: <GiGoldBar className={ICON_SIZE} /> },
    { id: "breaker" },
    { id: "About", label: "About", icon: <BookOpenIcon className={ICON_SIZE} /> },
    { id: "Profile", label: "Profile", icon: <UserIcon className={ICON_SIZE} /> },
    { id: "Settings", label: "Settings", icon: <Cog6ToothIcon className={ICON_SIZE} /> },
    { id: "Logout", label: "Logout", icon: <ArrowRightOnRectangleIcon className={ICON_SIZE} /> },
  ];


  return (
    <aside className="w-64 bg-black border-r border-gray-800 fixed left-0 top-16 h-screen overflow-y-auto z-50">
      <div className="p-6">
        <nav className="space-y-2">
          {links.map((link) => (
            <div key={link.id}>
              {link.id === "breaker" ? (
                <hr className="border-gray-700 my-2" />
              ) : (
                <>
                  <button
                    onClick={() => {
                      if (link.id === "Learn") {
                        setLearnOpen((prev) => !prev);
                      } else {
                        setActive(link.id);
                        setLearnOpen(false);
                      }
                    }}
                    className={`w-full text-left flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-colors
                      ${
                        link.id === "Stock Wars"
                          ? "text-indigo-400 hover:text-indigo-500"
                          : active === link.id
                          ? "text-yellow-500 bg-gray-900"
                          : "text-gray-300 hover:bg-gray-900"
                      }`}
                  >
                    {link.icon}
                    {link.label}
                  </button>

                  {/* Sub-tabs under Learn */}
                  {link.id === "Learn" && learnOpen && (
                    <div className="ml-6 mt-2 space-y-2">
                      <a
                        href="#mentors"
                        onClick={() => setActive("Learn-Basics")}
                        className={`block px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                          active === "Learn-Basics"
                            ? "text-yellow-500 bg-gray-900"
                            : "text-gray-400 hover:bg-gray-900"
                        }`}
                      >
                        Mentors
                      </a>
                      <a
                        href="#videos"
                        onClick={() => setActive("Learn-Advanced")}
                        className={`block px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                          active === "Learn-Advanced"
                            ? "text-yellow-500 bg-gray-900"
                            : "text-gray-400 hover:bg-gray-900"
                        }`}
                      >
                        Videos
                      </a>
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
