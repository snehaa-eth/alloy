/** Loading skeletons that match the final layout (no CLS); shimmer via transform (globals.css .c-skel). */
import { Skeleton } from "../primitives";

/** Same box model as v5/parts BasketCard: cover, avatar row, name + 2-line thesis, two tiles, bar + legend. */
export function CardSkeleton() {
  return (
    <div className="flex flex-col overflow-hidden rounded-[20px] border border-white/[0.07] bg-s1" aria-hidden>
      <Skeleton className="!rounded-none h-[136px] sm:h-[160px]" />
      <div className="-mt-6 flex flex-1 flex-col gap-4 px-5 pb-5">
        <div className="flex items-end gap-2">
          <Skeleton className="h-9 w-9 !rounded-full" />
          <Skeleton className="mb-0.5 h-3.5 w-40" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Skeleton className="h-[22px] w-2/3" />
          <Skeleton className="h-[40px] w-full" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Skeleton className="h-[60px] !rounded-[14px]" />
          <Skeleton className="h-[60px] !rounded-[14px]" />
        </div>
        <div className="mt-auto flex flex-col gap-3">
          <Skeleton className="h-1.5" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      </div>
    </div>
  );
}

/** Mirrors ExploreView: heading, filter row, card grid, slim "Build your own" row. */
export function ExploreSkeleton() {
  return (
    <div className="mx-auto max-w-app px-4 pb-12 pt-8 md:px-8 md:pt-12" role="status" aria-label="Loading baskets">
      <Skeleton className="h-[34px] w-64 md:h-[48px] md:w-80" />
      <Skeleton className="mt-2 h-5 w-52" />
      <Skeleton className="mt-6 h-11 w-full !rounded-full md:mt-8" />
      <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }, (_, k) => (
          <CardSkeleton key={k} />
        ))}
        <Skeleton className="col-span-full h-[74px] !rounded-[20px]" />
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
