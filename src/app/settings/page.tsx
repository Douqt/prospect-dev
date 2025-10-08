import Sidebar from "@/components/Sidebar";
import Navbar from "@/components/Navbar";

export default function SettingsPage() {
  return (
    <div className="min-h-screen bg-black relative overflow-hidden text-white">
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
        <div className="h-[calc(100vh-6rem)] flex items-center justify-center">
          <h1 className="text-4xl font-bold">Settings</h1>
        </div>
      </main>
    </div>
  );
}


