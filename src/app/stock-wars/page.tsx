'use client';

import Sidebar from "@/components/Sidebar";
import Navbar from "@/components/Navbar";
import dynamic from 'next/dynamic';

const GameBoard = dynamic(() => import('@/components/stock-wars/GameBoard').then(mod => mod.GameBoard), {
  ssr: false,
  loading: () => <div>Loading game...</div>
});

export default function StockWarsPage() {
  return (
    <div className="min-h-screen bg-background relative overflow-hidden text-foreground">
      <Sidebar />
      <div
        className="absolute inset-0 z-0 pointer-events-none grid-background"
        style={{
          backgroundImage: `linear-gradient(to right, rgba(128, 128, 128, 0.2) 1px, transparent 1px), linear-gradient(to bottom, rgba(128, 128, 128, 0.2) 1px, transparent 1px)`,
          backgroundSize: "50px 50px",
        }}
      />
      <Navbar />
      <main className="relative z-10">
        <div className="px-3">
          <GameBoard />
        </div>
      </main>
    </div>
  );
}
