import Sidebar from "@/components/Sidebar";
import Navbar from "@/components/Navbar";
import { DiscussionForum } from "@/components/discussions/DiscussionForum";

export default function CryptoPage() {
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
      <main className="relative z-10 pt-24 pl-64 pr-6">
        <DiscussionForum category="crypto" />
      </main>
    </div>
  );
}
