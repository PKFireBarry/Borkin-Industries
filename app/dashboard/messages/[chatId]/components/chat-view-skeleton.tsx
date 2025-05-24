import { Skeleton } from "@/components/ui/skeleton";

export function ChatViewSkeleton() {
  return (
    <div className="flex flex-col h-full p-4 space-y-4">
      {/* Message bubbles skeleton */}
      <div className="flex items-end space-x-2">
        <Skeleton className="h-8 w-8 rounded-full" />
        <Skeleton className="h-10 w-3/5 rounded-lg" />
      </div>
      <div className="flex items-end space-x-2 self-end">
        <Skeleton className="h-10 w-3/5 rounded-lg" />
        <Skeleton className="h-8 w-8 rounded-full" />
      </div>
      <div className="flex items-end space-x-2">
        <Skeleton className="h-8 w-8 rounded-full" />
        <Skeleton className="h-12 w-4/5 rounded-lg" />
      </div>
      <div className="flex items-end space-x-2 self-end">
        <Skeleton className="h-10 w-2/5 rounded-lg" />
        <Skeleton className="h-8 w-8 rounded-full" />
      </div>

      {/* Spacer to push input to bottom */}
      <div className="flex-grow" />

      {/* Input area skeleton */}
      <div className="flex items-center space-x-2 pt-4 border-t">
        <Skeleton className="h-10 flex-grow rounded-md" />
        <Skeleton className="h-10 w-20 rounded-md" />
      </div>
    </div>
  );
} 