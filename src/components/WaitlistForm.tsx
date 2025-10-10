"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Mail, User, Sparkles } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

const WaitlistForm = () => {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const normalizedEmail = email.trim().toLowerCase();
    const trimmedName = name.trim();

    if (!normalizedEmail || !trimmedName) {
      toast({
        title: "Please fill in all fields",
        description: "Both name and email are required to join the waitlist.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Insert into Supabase waitlist table
      const { error } = await supabase.from("waitlist").insert([
        { name: trimmedName, email: normalizedEmail },
      ]);

      if (error) {
        const msg = error.message || "An error occurred";
        const isDuplicate =
          (error.code && error.code.toString() === "23505") ||
          /duplicate key value/i.test(msg);

        if (isDuplicate) {
          toast({
            title: "You're already on the list",
            description:
              "Looks like that email has already signed up - we'll notify you on launch.",
          });
        } else {
          toast({
            title: "Error",
            description: msg,
            variant: "destructive",
          });
        }
        setIsSubmitting(false);
        return;
      }

      // Send confirmation email via API route
      await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmedName, email: normalizedEmail }),
      });

      toast({
        title: "Welcome to Prospect! 🎉",
        description:
          "You've been added to our exclusive waitlist. We'll notify you when we launch!",
      });

      setEmail("");
      setName("");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    }

    setIsSubmitting(false);
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-md space-y-4">
      <div className="relative">
        <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
        <Input
          type="text"
          placeholder="Enter your name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="pl-10 bg-card border-border focus:border-primary focus:ring-primary"
        />
      </div>

      <div className="relative">
        <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
        <Input
          type="email"
          placeholder="Enter your email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="pl-10 bg-card border-border focus:border-primary focus:ring-primary"
        />
      </div>

      <Button
        type="submit"
        className="w-full bg-gradient-to-r from-sky-400 to-sky-300 hover:from-sky-500 hover:to-sky-400 text-white font-semibold py-3 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02]"
        disabled={isSubmitting}
      >
        {isSubmitting ? (
          <>
            <Sparkles className="mr-2 h-4 w-4 animate-spin" />
            Joining...
          </>
        ) : (
          <>
            <Sparkles className="mr-2 h-4 w-4" />
            Join the Waitlist
          </>
        )}
      </Button>
    </form>
  );
};

export default WaitlistForm;
