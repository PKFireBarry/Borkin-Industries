import { Skeleton } from "@/components/ui/skeleton";

export function ChatListSkeleton() {
  return (
    <div className="space-y-1">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="flex items-center space-x-3 p-4 rounded-xl">
          {/* Avatar with ring */}
          <div className="relative">
            <Skeleton className="h-12 w-12 rounded-full" />
            {/* Online indicator skeleton */}
            <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-gray-200 border-2 border-white rounded-full"></div>
          </div>
          
          {/* Content */}
          <div className="flex-1 space-y-2">
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-16" />
            </div>
            <div className="flex items-center justify-between">
              <Skeleton className="h-3 w-48" />
              <Skeleton className="h-5 w-6 rounded-full" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
} 