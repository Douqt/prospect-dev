import Sidebar from "@/components/Sidebar";
import Navbar from "@/components/Navbar";
import { GridBackground } from "@/components/GridBackground";

export default function ProspectProPage() {
  return (
    <div className="min-h-screen bg-background relative overflow-hidden text-foreground">
      <Sidebar />
      <GridBackground />
      <Navbar />
      <main className="relative z-10 pt-24 pl-64 pr-6">
        <div className="h-[calc(100vh-6rem)] flex items-center justify-center">
          <h1 className="text-4xl font-bold">Prospect Pro</h1>
        </div>
      </main>
    </div>
  );
}
