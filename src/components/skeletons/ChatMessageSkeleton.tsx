import { Skeleton } from "@/components/ui/skeleton";

interface ChatMessageSkeletonProps {
  count?: number;
}

export function ChatMessageSkeleton({ count = 8 }: ChatMessageSkeletonProps) {
  return (
    <div className="space-y-4 p-4">
      {Array.from({ length: count }).map((_, i) => {
        const isOwn = i % 3 === 0;
        return (
          <div key={i} className={`flex ${isOwn ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[70%] space-y-1.5 ${isOwn ? "items-end" : "items-start"}`}>
              {!isOwn && <Skeleton className="h-3 w-20" />}
              <Skeleton className={`h-10 rounded-lg ${isOwn ? "w-48" : "w-56"}`} />
              <Skeleton className="h-3 w-16" />
            </div>
          </div>
        );
      })}
    </div>
  );
}
