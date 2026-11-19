import { loadFont } from "@remotion/fonts";
import { continueRender, delayRender, staticFile } from "remotion";

const faces: [string, string, string][] = [
  ["Inter", "fonts/Inter-500.woff2", "500"],
  ["Inter", "fonts/Inter-600.woff2", "600"],
  ["Inter", "fonts/Inter-700.woff2", "700"],
  ["Anton", "fonts/Anton-400.woff2", "400"],
  ["JetBrains Mono", "fonts/JetBrainsMono-400.woff2", "400"],
  ["JetBrains Mono", "fonts/JetBrainsMono-600.woff2", "600"],
];

let started = false;
export const ensureFonts = () => {
  if (started) return;
  started = true;
  const handle = delayRender("Loading local fonts");
  Promise.all(faces.map(([family, url, weight]) => loadFont({ family, url: staticFile(url), weight })))
    .then(() => continueRender(handle))
    .catch((err) => {
      console.error(err);
      continueRender(handle);
    });
};
