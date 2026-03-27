import { Skeleton } from "@/components/ui/skeleton";

const PageSkeleton = () => (
  <div className="min-h-screen bg-background">
    {/* Navbar skeleton */}
    <div className="fixed top-0 inset-x-0 z-50 h-16 border-b border-border/20 bg-background/80 backdrop-blur-xl">
      <div className="container mx-auto px-4 h-full flex items-center justify-between">
        <Skeleton className="h-6 w-24" />
        <div className="flex gap-4">
          <Skeleton className="h-4 w-16 hidden md:block" />
          <Skeleton className="h-4 w-16 hidden md:block" />
          <Skeleton className="h-4 w-16 hidden md:block" />
          <Skeleton className="h-8 w-20 rounded-md" />
        </div>
      </div>
    </div>

    {/* Content skeleton */}
    <div className="container mx-auto px-4 pt-28 max-w-3xl space-y-8">
      <div className="text-center space-y-4">
        <Skeleton className="h-10 w-64 mx-auto" />
        <Skeleton className="h-4 w-96 mx-auto" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Skeleton className="h-64 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
      <div className="space-y-3">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-5/6" />
      </div>
    </div>
  </div>
);

export default PageSkeleton;
