import { ReactNode } from "react";
import { Card } from "@/components/ui/card";

interface FeatureCardProps {
  icon: ReactNode;
  title: string;
  description: string;
}

const FeatureCard = ({ icon, title, description }: FeatureCardProps) => {
  return (
    <Card className="p-6 bg-card border-border hover:border-primary/50 transition-all duration-300 hover:shadow-lg hover:shadow-primary/10 group">
      <div className="flex flex-col items-center text-center space-y-4">
        <div className="p-3 rounded-full bg-gradient-to-br from-prospect-gold/20 to-prospect-gold-light/20 group-hover:from-prospect-gold/30 group-hover:to-prospect-gold-light/30 transition-all duration-300">
          <div className="text-prospect-gold">
            {icon}
          </div>
        </div>
        <h3 className="text-xl font-semibold text-foreground">{title}</h3>
        <p className="text-muted-foreground leading-relaxed">{description}</p>
      </div>
    </Card>
  );
};

export default FeatureCard;