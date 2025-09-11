import * as React from "react"
import { createPortal } from "react-dom"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock"
import { Button } from "./button-improved"

interface DrawerProps {
  isOpen: boolean
  onClose: () => void
  children: React.ReactNode
  title?: string
  description?: string
  side?: "left" | "right" | "top" | "bottom"
  size?: "sm" | "md" | "lg" | "xl" | "full"
  showCloseButton?: boolean
  closeOnOverlayClick?: boolean
  closeOnEscape?: boolean
  className?: string
}

const sideClasses = {
  left: "left-0 top-0 h-full",
  right: "right-0 top-0 h-full", 
  top: "top-0 left-0 w-full",
  bottom: "bottom-0 left-0 w-full"
}

const sizeClasses = {
  sm: "w-80",
  md: "w-96",
  lg: "w-[28rem]",
  xl: "w-[32rem]",
  full: "w-full"
}

const slideClasses = {
  left: "translate-x-0 data-[state=closed]:-translate-x-full",
  right: "translate-x-0 data-[state=closed]:translate-x-full",
  top: "translate-y-0 data-[state=closed]:-translate-y-full", 
  bottom: "translate-y-0 data-[state=closed]:translate-y-full"
}

export function Drawer({
  isOpen,
  onClose,
  children,
  title,
  description,
  side = "right",
  size = "md",
  showCloseButton = true,
  closeOnOverlayClick = true,
  closeOnEscape = true,
  className
}: DrawerProps) {
  const [mounted, setMounted] = React.useState(false)
  
  // Lock body scroll when drawer is open
  useBodyScrollLock(isOpen)

  // Handle escape key
  React.useEffect(() => {
    if (!isOpen || !closeOnEscape) return

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose()
      }
    }

    document.addEventListener("keydown", handleEscape)
    return () => document.removeEventListener("keydown", handleEscape)
  }, [isOpen, closeOnEscape, onClose])

  // Handle overlay click
  const handleOverlayClick = (e: React.MouseEvent) => {
    if (closeOnOverlayClick && e.target === e.currentTarget) {
      onClose()
    }
  }

  // Mount check for SSR
  React.useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted || !isOpen) return null

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex"
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? "drawer-title" : undefined}
      aria-describedby={description ? "drawer-description" : undefined}
    >
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
        onClick={handleOverlayClick}
        aria-hidden="true"
      />
      
      {/* Drawer Content */}
      <div
        className={cn(
          "relative bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 shadow-xl transition-transform duration-300 ease-in-out",
          sideClasses[side],
          side === "left" || side === "right" ? sizeClasses[size] : "h-96",
          slideClasses[side],
          className
        )}
        role="document"
      >
        {/* Header */}
        {(title || showCloseButton) && (
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex-1 min-w-0">
              {title && (
                <h2 
                  id="drawer-title"
                  className="text-xl font-semibold text-gray-900 dark:text-gray-100"
                >
                  {title}
                </h2>
              )}
              {description && (
                <p 
                  id="drawer-description"
                  className="mt-1 text-sm text-gray-600 dark:text-gray-400"
                >
                  {description}
                </p>
              )}
            </div>
            {showCloseButton && (
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={onClose}
                className="ml-4 flex-shrink-0"
                aria-label="Close drawer"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        )}
        
        {/* Content */}
        <div className="overflow-y-auto h-full">
          {children}
        </div>
      </div>
    </div>,
    document.body
  )
}

// Drawer Header component
export function DrawerHeader({ 
  children, 
  className 
}: { 
  children: React.ReactNode
  className?: string 
}) {
  return (
    <div className={cn("px-6 py-4 border-b border-gray-200 dark:border-gray-700", className)}>
      {children}
    </div>
  )
}

// Drawer Body component
export function DrawerBody({ 
  children, 
  className 
}: { 
  children: React.ReactNode
  className?: string 
}) {
  return (
    <div className={cn("px-6 py-4", className)}>
      {children}
    </div>
  )
}

// Drawer Footer component
export function DrawerFooter({ 
  children, 
  className 
}: { 
  children: React.ReactNode
  className?: string 
}) {
  return (
    <div className={cn("px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800", className)}>
      <div className="flex justify-end gap-3">
        {children}
      </div>
    </div>
  )
}
