/** Loading skeletons that match the final layout (no CLS); shimmer via transform (globals.css .c-skel). */
import { Skeleton } from "../primitives";

export function CardSkeleton() {
  return (
    <div className="flex flex-col overflow-hidden rounded-[20px] border border-white/[0.07] bg-s1" aria-hidden>
      <Skeleton className="!rounded-none h-[136px] sm:h-[160px]" />
      <div className="flex flex-col gap-4 p-5">
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-5 w-3/4" />
        <div className="grid grid-cols-2 gap-2">
          <Skeleton className="h-[58px]" />
          <Skeleton className="h-[58px]" />
        </div>
        <Skeleton className="h-2" />
      </div>
    </div>
  );
}

export function ExploreSkeleton() {
  return (
    <div className="mx-auto max-w-app px-4 pb-12 pt-8 md:px-8 md:pt-12" role="status" aria-label="Loading baskets">
      <Skeleton className="h-10 w-72" />
      <Skeleton className="mt-3 h-5 w-48" />
      <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }, (_, k) => (
          <CardSkeleton key={k} />
        ))}
      </div>
    </div>
  );
}

export function BasketSkeleton() {
  return (
    <div className="mx-auto max-w-app px-4 pt-14 md:px-8" role="status" aria-label="Loading basket">
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-10">
        <div className="flex flex-col gap-6">
          <Skeleton className="h-[220px] !rounded-[24px] md:h-[300px]" />
          <Skeleton className="h-11 w-64" />
          <Skeleton className="h-[300px] !rounded-[20px]" />
        </div>
        <Skeleton className="hidden h-[420px] !rounded-[20px] lg:block" />
      </div>
    </div>
  );
}
