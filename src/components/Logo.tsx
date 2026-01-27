import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  size?: "sm" | "md" | "lg";
  showText?: boolean;
}

export function Logo({ className, size = "md", showText = true }: LogoProps) {
  const sizeClasses = {
    sm: "h-8 w-8",
    md: "h-10 w-10",
    lg: "h-16 w-16",
  };

  const textSizeClasses = {
    sm: "text-lg",
    md: "text-xl",
    lg: "text-2xl",
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className={cn("relative", sizeClasses[size])}>
        {/* House outline with Arabic letter inside */}
        <svg
          viewBox="0 0 100 100"
          className="h-full w-full"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Gradient definition */}
          <defs>
            <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="hsl(var(--primary))" />
              <stop offset="100%" stopColor="hsl(var(--accent))" />
            </linearGradient>
          </defs>
          
          {/* House roof */}
          <path
            d="M50 10 L90 40 L85 40 L85 85 L15 85 L15 40 L10 40 Z"
            stroke="url(#logoGradient)"
            strokeWidth="4"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          
          {/* Arabic letter ح (Ha) stylized inside house */}
          <path
            d="M35 55 Q35 65, 50 65 Q65 65, 65 55 Q65 45, 55 45 L45 45"
            stroke="url(#logoGradient)"
            strokeWidth="4"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          
          {/* Dot for the ح */}
          <circle
            cx="50"
            cy="52"
            r="3"
            fill="url(#logoGradient)"
          />
        </svg>
      </div>
      
      {showText && (
        <div className="flex flex-col">
          <span className={cn("font-bold text-foreground leading-tight", textSizeClasses[size])}>
            Huis van het
          </span>
          <span className={cn("font-bold text-primary leading-tight", textSizeClasses[size])}>
            Arabisch
          </span>
        </div>
      )}
    </div>
  );
}
