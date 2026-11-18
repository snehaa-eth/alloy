"use client"

import { useState } from "react"
import Link from "next/link"
import { AnimatePresence, motion } from "framer-motion"
import { Menu, X, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ConnectButton } from "@/components/wallet/ConnectButton"
import { NAV_LINKS } from "@/components/commons/nav-links"

export function MobileMenu() {
  const [isOpen, setIsOpen] = useState(false)
  const closeMenu = () => setIsOpen(false)

  return (
    <div className="md:hidden">
      <Button variant="ghost" size="icon" onClick={() => setIsOpen((o) => !o)} aria-label="Toggle menu">
        <Menu className="h-6 w-6" />
      </Button>

      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-40 bg-[#0e0e0e]/40 backdrop-blur-sm"
              onClick={closeMenu}
            />
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="fixed left-0 right-0 top-0 z-50 border-b border-[#272727] bg-black"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mx-auto max-w-6xl px-4 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-white">
                    <img src="/assets/logo_crates.svg" alt="Alloy" className="h-8 w-auto" />
                    <span className="font-chakra text-lg">Alloy</span>
                  </div>
                  <Button variant="ghost" size="icon" onClick={closeMenu} className="text-white" aria-label="Close menu">
                    <X className="h-5 w-5" />
                  </Button>
                </div>
                <nav className="mt-4 space-y-1">
                  {NAV_LINKS.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={closeMenu}
                      className="flex w-full items-center justify-between rounded px-2 py-3 text-white transition-colors hover:bg-[#111]"
                    >
                      <span className="font-chakra text-base">{item.label}</span>
                      <ChevronRight className="h-4 w-4 text-gray-400" />
                    </Link>
                  ))}
                </nav>
                <div className="mt-4 border-t border-[#272727] pt-4">
                  <ConnectButton />
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
