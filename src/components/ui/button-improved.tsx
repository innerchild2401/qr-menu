import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { highContrastClasses } from "@/lib/color-tokens"

const buttonVariants = cva(
  // Base styles with improved accessibility and consistency
  "inline-flex items-center justify-center whitespace-nowrap rounded-xl text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98] min-h-[44px] px-4 py-2.5",
  {
    variants: {
      variant: {
        default: cn(
          "bg-blue-600 text-white shadow-sm hover:bg-blue-700 active:bg-blue-800",
          "focus-visible:ring-blue-500 focus-visible:ring-offset-2",
          highContrastClasses.textHighContrast
        ),
        destructive: cn(
          "bg-red-600 text-white shadow-sm hover:bg-red-700 active:bg-red-800",
          "focus-visible:ring-red-500 focus-visible:ring-offset-2",
          highContrastClasses.textHighContrast
        ),
        outline: cn(
          "border-2 border-gray-300 bg-white text-gray-900 shadow-sm hover:bg-gray-50 hover:border-gray-400 active:bg-gray-100",
          "dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700 dark:hover:border-gray-500",
          "focus-visible:ring-blue-500 focus-visible:ring-offset-2",
          highContrastClasses.textHighContrast
        ),
        secondary: cn(
          "bg-gray-100 text-gray-900 shadow-sm hover:bg-gray-200 active:bg-gray-300",
          "dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700 dark:active:bg-gray-600",
          "focus-visible:ring-gray-500 focus-visible:ring-offset-2",
          highContrastClasses.textHighContrast
        ),
        ghost: cn(
          "text-gray-700 hover:bg-gray-100 active:bg-gray-200",
          "dark:text-gray-300 dark:hover:bg-gray-800 dark:active:bg-gray-700",
          "focus-visible:ring-gray-500 focus-visible:ring-offset-2",
          highContrastClasses.textHighContrast
        ),
        link: cn(
          "text-blue-600 underline-offset-4 hover:underline active:text-blue-800",
          "dark:text-blue-400 dark:hover:text-blue-300",
          "focus-visible:ring-blue-500 focus-visible:ring-offset-2",
          highContrastClasses.textHighContrast
        ),
        success: cn(
          "bg-green-600 text-white shadow-sm hover:bg-green-700 active:bg-green-800",
          "focus-visible:ring-green-500 focus-visible:ring-offset-2",
          highContrastClasses.textHighContrast
        ),
        warning: cn(
          "bg-orange-600 text-white shadow-sm hover:bg-orange-700 active:bg-orange-800",
          "focus-visible:ring-orange-500 focus-visible:ring-offset-2",
          highContrastClasses.textHighContrast
        ),
      },
      size: {
        default: "h-11 px-4 py-2.5 text-sm",
        sm: "h-9 rounded-lg px-3 py-2 text-sm",
        lg: "h-12 rounded-xl px-8 py-3 text-base",
        icon: "h-11 w-11",
        "icon-sm": "h-9 w-9 rounded-lg",
        "icon-lg": "h-12 w-12 rounded-xl",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
  loading?: boolean
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ 
    className, 
    variant, 
    size, 
    asChild = false, 
    loading = false,
    leftIcon,
    rightIcon,
    children,
    disabled,
    ...props 
  }, ref) => {
    const Comp = asChild ? Slot : "button"
    
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled || loading}
        {...props}
      >
        {loading && (
          <div className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent mr-2" />
        )}
        {!loading && leftIcon && (
          <span className="mr-2 flex-shrink-0">{leftIcon}</span>
        )}
        {children}
        {!loading && rightIcon && (
          <span className="ml-2 flex-shrink-0">{rightIcon}</span>
        )}
      </Comp>
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
