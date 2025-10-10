"use client";
import Sidebar from "@/components/Sidebar";
import Navbar from "@/components/Navbar";
import { Grid } from "lucide-react";
import { GridBackground } from "@/components/GridBackground";

export default function Page() {
    return (
        <div className="min-h-screen relative overflow-hidden bg-background">
            {/* Sidebar */}
            <Sidebar />
            <GridBackground />
            {/* Navbar */}
            <Navbar />
        </div>
    );
}
