import { useVideoConfig } from "remotion";

// One layout per aspect. Visual zone on top, text band below, inside the certificate frame.
export const useLayout = () => {
  const { width: W, height: H } = useVideoConfig();
  const square = H / W < 1.3;
  if (!square) {
    return {
      W, H, square,
      O: 44, I: 56, // outer / inner frame insets
      headerY: 82, ruleY: 132, footerBottom: 80, monoSize: 26, footSize: 20,
      zone: { top: 120, height: 1140 }, // visual stage (designed at 1080 × 1050)
      stageScale: 1,
      text: { top: 1300, size: 88, line: 1.1, micro: 44, gap: 34, maxWidth: 940 },
    };
  }
  return {
    W, H, square,
    O: 30, I: 40,
    headerY: 58, ruleY: 98, footerBottom: 56, monoSize: 20, footSize: 16,
    zone: { top: 60, height: 528 },
    stageScale: 0.6,
    text: { top: 600, size: 76, line: 1.08, micro: 34, gap: 22, maxWidth: 960 },
  };
};
export type Layout = ReturnType<typeof useLayout>;
