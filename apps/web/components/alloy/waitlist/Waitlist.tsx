"use client";

/** /waitlist: the public face of Alloy while WAITLIST_MODE is on ("cinematic centre" layout). */
import { VariantA } from "./VariantA";

export function Waitlist() {
  return (
    <div className="relative overflow-x-clip">
      <VariantA />
    </div>
  );
}
