import { ReactNode } from "react";
import { RefreshCw } from "lucide-react";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: ReactNode;
  className?: string;
}

const PullToRefresh = ({ onRefresh, children, className }: PullToRefreshProps) => {
  const isMobile = useIsMobile();
  
  const { isPulling, isRefreshing, pullDistance, progress } = usePullToRefresh({
    onRefresh,
    threshold: 80,
    disabled: !isMobile,
  });

  const showIndicator = pullDistance > 10 || isRefreshing;
  const isReady = progress >= 1;

  return (
    <div className={cn("relative", className)}>
      {/* Pull indicator */}
      <div
        className={cn(
          "fixed left-1/2 -translate-x-1/2 z-40 flex items-center justify-center pointer-events-none transition-all duration-200",
          showIndicator ? "opacity-100" : "opacity-0"
        )}
        style={{
          top: `${Math.max(pullDistance - 20, 64)}px`,
        }}
      >
        <div
          className={cn(
            "flex items-center justify-center w-10 h-10 rounded-full bg-background border border-border shadow-lg transition-all",
            isReady && !isRefreshing && "bg-secondary border-secondary",
            isRefreshing && "bg-secondary border-secondary"
          )}
        >
          <RefreshCw
            className={cn(
              "h-5 w-5 transition-all duration-200",
              isRefreshing && "animate-spin text-white",
              isReady && !isRefreshing && "text-white",
              !isReady && !isRefreshing && "text-muted-foreground"
            )}
            style={{
              transform: !isRefreshing ? `rotate(${progress * 360}deg)` : undefined,
            }}
          />
        </div>
      </div>

      {/* Content with transform when pulling */}
      <div
        className="transition-transform duration-200 ease-out"
        style={{
          transform: isPulling || isRefreshing ? `translateY(${pullDistance}px)` : "translateY(0)",
        }}
      >
        {children}
      </div>
    </div>
  );
};

export default PullToRefresh;
