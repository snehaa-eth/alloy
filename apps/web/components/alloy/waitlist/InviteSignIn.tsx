"use client";

/**
 * Invite sign-in, shaped as the same glass bar as the join form so it swaps in place: "Your spot is open" + copper
 * "Sign in with your email". Privy login (email first, Google second: both give a verified email) → /api/access checks
 * the email against the waitlist / allow list and sets the access cookie → home.
 * Only reacts to logins it started, so other Privy listeners (PreferEmbeddedWallet) are unaffected.
 */
import { useEffect, useRef, useState } from "react";
import { ArrowRight, Check } from "lucide-react";
import { useLogin, usePrivy } from "@privy-io/react-auth";
import { joinWaitlist } from "./api";
import { cn } from "@/lib/utils";

type State =
  | { k: "idle" }
  | { k: "busy"; msg: string }
  | { k: "in" }
  | { k: "not-listed"; email: string }
  | { k: "email-needed" }
  | { k: "error"; msg: string };

type AccessReply = { allowed?: boolean; reason?: "not-on-list" | "email-needed"; email?: string; error?: string };

/** True when the page was opened from the launch email (?invited=1). */
export function useInvitedParam() {
  const [invited, setInvited] = useState(false);
  useEffect(() => {
    try {
      setInvited(new URLSearchParams(window.location.search).get("invited") === "1");
    } catch {
      /* ignore */
    }
  }, []);
  return [invited, setInvited] as const;
}

/** Small inline link for the note under the join bar. */
export function InviteLink({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="text-mute underline decoration-line2 underline-offset-[4px] transition-colors hover:text-ink hover:decoration-ink" data-testid="invite-link">
      Already invited? Sign in
    </button>
  );
}

export function InviteSignIn({ className, autoStart, onBack }: { className?: string; autoStart?: boolean; onBack?: () => void }) {
  const { ready, authenticated, getAccessToken, logout } = usePrivy();
  const [state, setState] = useState<State>({ k: "idle" });
  const pending = useRef(false);
  const started = useRef(false);

  async function check() {
    setState({ k: "busy", msg: "Checking your spot…" });
    try {
      const token = await getAccessToken();
      if (!token) return setState({ k: "error", msg: "Sign-in didn't finish. Try again." });
      const res = await fetch("/api/access", { method: "POST", headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
      const r = (await res.json().catch(() => ({}))) as AccessReply;
      if (r.allowed) {
        setState({ k: "in" });
        setTimeout(() => window.location.assign("/"), 1100);
      } else if (r.reason === "email-needed") setState({ k: "email-needed" });
      else if (r.reason === "not-on-list" && r.email) setState({ k: "not-listed", email: r.email });
      else setState({ k: "error", msg: r.error ?? "Couldn't check right now. Try again in a moment." });
    } catch {
      setState({ k: "error", msg: "Couldn't reach us. Try again in a moment." });
    }
  }

  const { login } = useLogin({
    onComplete: () => {
      if (!pending.current) return;
      pending.current = false;
      void check();
    },
    onError: () => {
      if (!pending.current) return;
      pending.current = false;
      setState({ k: "idle" });
    },
  });

  function openLogin() {
    pending.current = true;
    login({ loginMethods: ["email", "google"] });
  }

  function start() {
    if (!ready) return;
    if (authenticated) return void check();
    openLogin();
  }

  // opened from the "Already invited? Sign in" link: go straight to the email code
  useEffect(() => {
    if (!autoStart || started.current || !ready) return;
    started.current = true;
    start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStart, ready]);

  async function switchEmail() {
    setState({ k: "busy", msg: "One moment…" });
    await logout().catch(() => undefined);
    setState({ k: "idle" });
    openLogin();
  }

  async function joinWith(email: string) {
    setState({ k: "busy", msg: "Adding you…" });
    const r = await joinWaitlist(email, "");
    if (!r.ok) return setState({ k: "error", msg: r.error });
    await check();
  }

  const note = "font-mono text-[12px] tracking-[0.01em] text-dim";

  if (state.k === "in") {
    return (
      <div className={cn("w-full", className)} data-testid="invite-in">
        <div className="wl-bar wl-bar--done" role="status" aria-live="polite">
          <div className="flex flex-col items-center text-center">
            <span className="wl-check flex h-11 w-11 items-center justify-center rounded-full text-ink">
              <Check size={18} strokeWidth={1.75} aria-hidden />
            </span>
            <h2 className="mt-4 font-display text-[26px] font-light tracking-[-0.02em]">You&apos;re in.</h2>
            <p className="mt-1.5 text-[14px] text-mute">Taking you to Alloy…</p>
          </div>
        </div>
      </div>
    );
  }

  if (state.k === "not-listed" || state.k === "email-needed") {
    const listed = state.k === "not-listed";
    return (
      <div className={cn("w-full", className)} data-testid={listed ? "invite-not-listed" : "invite-email-needed"}>
        <div className="wl-bar wl-bar--done" role="status" aria-live="polite">
          <div className="flex flex-col items-center text-center">
            <p className="text-[15px] text-mute">
              {listed ? (
                <>
                  <span className="text-ink">{state.email}</span> isn&apos;t on the list yet.
                </>
              ) : (
                "Access goes by email. Sign in with the email you joined with."
              )}
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-2.5">
              {listed && (
                <button type="button" className="a-btn a-btn--buy a-btn--sm" onClick={() => joinWith(state.email)}>
                  Join with this email
                </button>
              )}
              <button type="button" className="a-btn a-btn--line a-btn--sm" onClick={switchEmail}>
                {listed ? "Use another email" : "Sign in with email"}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const busy = state.k === "busy";
  return (
    <div className={cn("w-full", className)} data-testid="invite-signin">
      <div className="wl-bar">
        <div className="flex min-w-0 flex-1 flex-col items-start px-4 text-left max-md:px-1 max-md:pb-1">
          <span className="font-display text-[17px] font-light tracking-[-0.01em] text-ink">Your spot is open.</span>
          <span className="text-[13px] text-mute">Sign in with the email you joined with.</span>
        </div>
        <button type="button" className="a-btn a-btn--buy a-btn--lg wl-join shrink-0" onClick={start} disabled={busy || !ready} aria-busy={busy || undefined}>
          {busy ? (
            state.msg
          ) : (
            <>
              Sign in with your email <ArrowRight size={16} strokeWidth={1.8} aria-hidden />
            </>
          )}
        </button>
      </div>
      <p className={cn("mt-3.5 min-h-[18px] text-center", state.k === "error" ? "text-[12px] text-loss" : note)} role={state.k === "error" ? "alert" : undefined}>
        {state.k === "error" ? (
          state.msg
        ) : onBack ? (
          <>
            Not on the list yet?{" "}
            <button type="button" onClick={onBack} className="text-mute underline decoration-line2 underline-offset-[4px] transition-colors hover:text-ink hover:decoration-ink">
              Join instead
            </button>
          </>
        ) : (
          "Same email you used for the waitlist."
        )}
      </p>
    </div>
  );
}
