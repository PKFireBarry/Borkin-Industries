import { Skeleton } from "@/components/ui/skeleton";

export function ChatViewSkeleton() {
  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header Skeleton */}
      <div className="flex items-center space-x-3 p-4 border-b">
        <Skeleton className="h-10 w-10 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-24" />
        </div>
      </div>

      {/* Messages Skeleton */}
      <div className="flex-1 px-4 py-2 space-y-4">
        {/* Other user message */}
        <div className="flex items-end space-x-2">
          <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />
          <div className="space-y-1">
            <Skeleton className="h-10 w-48 rounded-2xl rounded-bl-md" />
            <Skeleton className="h-3 w-16" />
          </div>
        </div>

        {/* Current user message */}
        <div className="flex items-end space-x-2 justify-end">
          <div className="space-y-1">
            <Skeleton className="h-10 w-32 rounded-2xl rounded-br-md" />
            <Skeleton className="h-3 w-12 ml-auto" />
          </div>
          <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />
        </div>

        {/* Other user message */}
        <div className="flex items-end space-x-2">
          <div className="w-8 h-8 flex-shrink-0"></div>
          <div className="space-y-1">
            <Skeleton className="h-16 w-64 rounded-2xl rounded-bl-md" />
            <Skeleton className="h-3 w-20" />
          </div>
        </div>

        {/* Current user message */}
        <div className="flex items-end space-x-2 justify-end">
          <div className="space-y-1">
            <Skeleton className="h-8 w-40 rounded-2xl rounded-br-md" />
            <Skeleton className="h-3 w-16 ml-auto" />
          </div>
          <div className="w-8 h-8 flex-shrink-0"></div>
        </div>
      </div>

      {/* Input area skeleton */}
      <div className="p-4 border-t">
        <div className="flex items-end space-x-3">
          <Skeleton className="h-11 flex-1 rounded-full" />
          <Skeleton className="h-11 w-11 rounded-full" />
        </div>
      </div>
    </div>
  );
} 