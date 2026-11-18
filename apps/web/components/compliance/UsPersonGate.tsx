"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { US_PERSON_ATTESTATION } from "./copy";

const KEY = "alloy.attest.non-us.v1";

function readAttested(): boolean {
  try {
    return window.localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

/** Self-attestation that the user is not a US person. Stored per browser. */
export function useUsPersonAttestation() {
  const [attested, setAttested] = useState(false);
  useEffect(() => setAttested(readAttested()), []);
  const confirm = useCallback(() => {
    try {
      window.localStorage.setItem(KEY, "1");
    } catch {
      // storage unavailable: attestation lasts for this session only
    }
    setAttested(true);
  }, []);
  return { attested, confirm };
}

/**
 * Wrap any action that moves money. Renders `children(run)`; `run` opens the
 * attestation dialog first if the user has not attested yet.
 */
export function UsPersonGate({ children }: { children: (run: (action: () => void) => void) => ReactNode }) {
  const { attested, confirm } = useUsPersonAttestation();
  const [pending, setPending] = useState<(() => void) | null>(null);
  const [checked, setChecked] = useState(false);

  const run = (action: () => void) => (attested ? action() : setPending(() => action));

  return (
    <>
      {children(run)}
      <Dialog open={pending !== null} onOpenChange={(o) => !o && setPending(null)}>
        <DialogContent className="border-[#2a2a2a] bg-[#111] text-white">
          <DialogHeader>
            <DialogTitle>Before you continue</DialogTitle>
            <DialogDescription className="text-gray-400">
              Alloy offers tokenized stock exposure and is not available to US persons.
            </DialogDescription>
          </DialogHeader>
          <label className="flex items-start gap-3 text-sm text-gray-300">
            <Checkbox checked={checked} onCheckedChange={(c) => setChecked(c === true)} className="mt-0.5 border-[#A1A1A1]" />
            <span>{US_PERSON_ATTESTATION}</span>
          </label>
          <DialogFooter>
            <Button
              variant="metal"
              disabled={!checked}
              onClick={() => {
                confirm();
                const action = pending;
                setPending(null);
                action?.();
              }}
            >
              I confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
