import Sidebar from "@/components/Sidebar";
import Navbar from "@/components/Navbar";
import MentorDashboardClient from "@/components/mentor-marketplace/MentorDashboardClient";

export default function MentorDashboardPage() {
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
      <main className="relative z-10 pt-24 ml-[300px]">
        <div className="flex max-w-7xl mx-auto px-6">
          <div className="flex-1 max-w-4xl mx-auto">
            <MentorDashboardClient />
          </div>
        </div>
      </main>
    </div>
  );
}
