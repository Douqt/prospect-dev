"use client";
/* eslint-disable react-refresh/only-export-components */

import { useEffect, useState } from "react";
import { Toaster as Sonner, toast } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

type Theme = ToasterProps["theme"] | "system";

function useThemeFallback() {
  const [theme, setTheme] = useState<Theme>("system");

  useEffect(() => {
    try {
      const el = document.documentElement;
      const attr = el.getAttribute("data-theme");
      if (attr === "dark" || attr === "light") {
        setTheme(attr as Theme);
        return;
      }
      if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) {
        setTheme("dark");
      } else {
        setTheme("light");
      }
    } catch (e) {
      setTheme("system");
    }
  }, []);

  return { theme };
}

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useThemeFallback();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
          description: "group-[.toast]:text-muted-foreground",
          actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
        },
      }}
      {...props}
    />
  );
};

export { Toaster, toast };
