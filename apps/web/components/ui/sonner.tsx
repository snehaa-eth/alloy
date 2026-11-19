"use client"

import { Toaster as Sonner } from "sonner"

type ToasterProps = React.ComponentProps<typeof Sonner>

/** The only toast system in the app (mounted once in app/providers.tsx). Alloy style: near-black, ink text, pill action (globals.css "trade"). */
const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="dark"
      className="toaster group"
      toastOptions={{
        classNames: {
          toast: "tr-toast",
          description: "tr-toast-desc",
          actionButton: "tr-toast-action",
          cancelButton: "tr-toast-cancel",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
