import type { ReactNode } from "react";

/** Route transition (MOTION.md §5.7): 240ms fade + 16px slide; 120ms crossfade under reduced motion (CSS). */
export default function Template({ children }: { children: ReactNode }) {
  return <div className="v-page">{children}</div>;
}
