import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Mail, User, Sparkles } from "lucide-react";

const WaitlistForm = () => {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !name) {
      toast({
        title: "Please fill in all fields",
        description: "Both name and email are required to join the waitlist.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    
    // Simulate API call
    setTimeout(() => {
      toast({
        title: "Welcome to Prospect! 🎉",
        description: "You've been added to our exclusive waitlist. We'll notify you when we launch!",
      });
      setEmail("");
      setName("");
      setIsSubmitting(false);
    }, 1000);
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
        className="w-full bg-gradient-to-r from-prospect-gold to-prospect-gold-light hover:from-prospect-gold-dark hover:to-prospect-gold text-black font-semibold py-3 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02]"
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