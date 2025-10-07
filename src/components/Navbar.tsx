"use client";
import Image from "next/image";
import prospectLogo from "@/assets/prospect-logo.png";

export default function NavBar() {
  return (
    <aside className="w-full bg-black border-b border-gray-800 fixed top-0 left-0 z-50">
      <div className="w-full px-8 py-4 flex items-center justify-between">
        <Image
          src={prospectLogo}
          alt="Prospect"
          className="h-8 w-auto filter drop-shadow-lg"
        />

        {/* Navigation */}
        <nav className="hidden md:flex items-center gap-8">
          <a
            href="#features"
            className="text-gray-300 hover:text-yellow-500 transition-colors text-sm font-medium"
          >
            Features
          </a>
          <a
            href="#about"
            className="text-gray-300 hover:text-yellow-500 transition-colors text-sm font-medium"
          >
            About
          </a>
          <a
            href="#contact"
            className="text-gray-300 hover:text-yellow-500 transition-colors text-sm font-medium"
          >
            Contact
          </a>
          <button className="bg-yellow-500 hover:bg-yellow-600 text-black font-semibold px-6 py-2 rounded transition-colors text-sm">
            Login/Signup
          </button>
        </nav>

        {/* Mobile menu button */}
        <button className="md:hidden text-white">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 6h16M4 12h16M4 18h16"
            />
          </svg>
        </button>
      </div>
    </aside>
  );
}
