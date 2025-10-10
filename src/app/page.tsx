"use client";
import Sidebar from "@/components/Sidebar";
import Navbar from "@/components/Navbar";

export default function Page() {
    return (
        <div className="min-h-screen relative overflow-hidden bg-background">
            {/* Sidebar */}
            <Sidebar />
            {/* Grid lines - behind everything */}
            <div
                className="absolute inset-0 z-0 pointer-events-none grid-background"
                style={{
                backgroundImage: `
                    linear-gradient(to right, rgba(128, 128, 128, 0.2) 1px, transparent 1px),
                    linear-gradient(to bottom, rgba(128, 128, 128, 0.2) 1px, transparent 1px)
                `,
                backgroundSize: '50px 50px',
                }}
            />
            {/* Navbar */}
            <Navbar />
        </div>
    );
}
