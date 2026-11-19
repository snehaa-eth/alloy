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

/** Same box as explore/ExploreCard: 290px sculpture (240 phone), name, creator, 2-line thesis, stat foot. */
export function ExCardSkeleton() {
  return (
    <div className="a-ex-card" aria-hidden>
      <div className="relative flex h-[240px] items-center justify-center md:h-[290px]">
        <Skeleton className="absolute left-4 top-4 h-[26px] w-[118px] !rounded-full" />
        <Skeleton className="h-[150px] w-[150px] !rounded-full opacity-60" />
      </div>
      <div className="px-[18px] pt-[18px] md:px-[22px] md:pt-5">
        <Skeleton className="h-[26px] w-2/3" />
        <Skeleton className="mt-2 h-3.5 w-28" />
        <Skeleton className="mt-3 h-[42px] w-full" />
      </div>
      <div className="mt-5 flex items-end gap-7 border-t border-line px-[18px] pb-5 pt-4 md:px-[22px]">
        <Skeleton className="h-[46px] w-16" />
        <Skeleton className="h-[46px] w-16" />
        <Skeleton className="ml-auto h-9 w-[112px] !rounded-full" />
      </div>
    </div>
  );
}

/** Mirrors ExploreView: header, filter bar, count, card grid. */
export function ExploreSkeleton() {
  return (
    <div className="px-[clamp(16px,6vw,96px)] pb-24" role="status" aria-label="Loading baskets">
      <div className="pt-10 md:pt-[clamp(56px,9vh,96px)]">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="mt-[18px] h-[86px] w-[300px] md:h-[150px] md:w-[620px]" />
        <Skeleton className="mt-4 h-5 w-[320px] max-w-full" />
      </div>
      <div className="mt-[30px] flex flex-col gap-2.5 md:mt-14 md:flex-row md:justify-between">
        <Skeleton className="h-[44px] w-[340px] max-w-full !rounded-full" />
        <Skeleton className="h-[44px] w-[260px] max-w-full !rounded-full" />
      </div>
      <Skeleton className="mt-4 h-4 w-20" />
      <div className="mt-[22px] grid grid-cols-1 gap-3.5 md:grid-cols-2 md:gap-[18px] min-[1101px]:grid-cols-3">
        {Array.from({ length: 3 }, (_, k) => (
          <ExCardSkeleton key={k} />
        ))}
      </div>
    </div>
  );
}

/** Mirrors BasketScreen: sculpture stage, title block, sticky buy panel. */
export function BasketSkeleton() {
  return (
    <div className="mx-auto grid max-w-[1480px] gap-[clamp(32px,4vw,64px)] px-[var(--gut)] pt-6 md:pt-10 lg:grid-cols-[minmax(0,1fr)_340px] xl:grid-cols-[minmax(0,1fr)_372px]" role="status" aria-label="Loading basket">
      <div className="min-w-0">
        <Skeleton className="h-[400px] !rounded-[22px] md:h-[clamp(420px,58vh,560px)] md:!rounded-[28px]" />
        <Skeleton className="mt-10 h-3 w-16" />
        <Skeleton className="mt-3.5 h-[48px] w-[70%] md:h-[72px]" />
        <Skeleton className="mt-6 h-9 w-[80%]" />
      </div>
      <Skeleton className="hidden h-[500px] !rounded-[26px] lg:block" />
    </div>
  );
}
