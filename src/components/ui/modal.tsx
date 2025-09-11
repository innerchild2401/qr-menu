import * as React from "react"
import { createPortal } from "react-dom"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock"
import { Button } from "./button-improved"

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  children: React.ReactNode
  title?: string
  description?: string
  size?: "sm" | "md" | "lg" | "xl" | "full"
  showCloseButton?: boolean
  closeOnOverlayClick?: boolean
  closeOnEscape?: boolean
  className?: string
}

const sizeClasses = {
  sm: "max-w-md",
  md: "max-w-lg", 
  lg: "max-w-2xl",
  xl: "max-w-4xl",
  full: "max-w-full mx-4"
}

export function Modal({
  isOpen,
  onClose,
  children,
  title,
  description,
  size = "md",
  showCloseButton = true,
  closeOnOverlayClick = true,
  closeOnEscape = true,
  className
}: ModalProps) {
  const [mounted, setMounted] = React.useState(false)
  
  // Lock body scroll when modal is open
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
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? "modal-title" : undefined}
      aria-describedby={description ? "modal-description" : undefined}
    >
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
        onClick={handleOverlayClick}
        aria-hidden="true"
      />
      
      {/* Modal Content */}
      <div
        className={cn(
          "relative bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl w-full max-h-[90vh] overflow-hidden",
          sizeClasses[size],
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
                  id="modal-title"
                  className="text-xl font-semibold text-gray-900 dark:text-gray-100"
                >
                  {title}
                </h2>
              )}
              {description && (
                <p 
                  id="modal-description"
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
                aria-label="Close modal"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        )}
        
        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-80px)]">
          {children}
        </div>
      </div>
    </div>,
    document.body
  )
}

// Modal Header component
export function ModalHeader({ 
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

// Modal Body component
export function ModalBody({ 
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

// Modal Footer component
export function ModalFooter({ 
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
