import { GLOBAL_DISCLAIMER } from "@/components/compliance/copy";

export default function Footer() {
  return (
    <footer className="w-full border-t border-[#272727] px-4 py-8 font-chakra text-sm text-[#6b6b6b]">
      <div className="mx-auto flex max-w-6xl flex-col gap-4">
        <p className="max-w-3xl text-xs leading-relaxed">{GLOBAL_DISCLAIMER}</p>
        <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
          <p>&copy; {new Date().getFullYear()} Alloy. All rights reserved.</p>
          <a href="https://x.com/alloy_fi" target="_blank" rel="noopener noreferrer" className="transition-colors hover:text-white">
            X / Twitter
          </a>
        </div>
      </div>
    </footer>
  );
}
