"use client";
import { useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function LogoutPage() {
  useEffect(() => {
    (async () => {
      try {
        await supabase.auth.signOut();
      } finally {
        window.location.href = "/";
      }
    })();
  }, []);

  return null;
}


