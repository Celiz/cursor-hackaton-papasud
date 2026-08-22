import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { Loader2 } from "lucide-react"
import { cloneElement, forwardRef, isValidElement } from "react"


import { cn } from "@/lib/utils"
import { SIZE_VARIANTS, SIZE_VARIANTS_DEFAULT } from "@/lib/constants"

export type ButtonVariantProps = VariantProps<typeof buttonVariants>
const buttonVariants = cva(
  `relative
  flex items-center justify-center
  cursor-pointer
  inline-flex
  items-center
  gap-2
  text-center
  font-medium
  ease-out
  duration-200
  rounded-md
  outline-none
  transition-all
  outline-0
  focus-visible:outline-2
  focus-visible:outline-offset-1
  border
  `,
  {
    variants: {
      type: {
        primary: `
          bg-primary
          hover:opacity-90
          active:opacity-95
          text-primary-foreground border-primary
          shadow-sm
          hover:shadow
          focus-visible:outline-ring
          data-[state=open]:opacity-95
        `,
        default: `
          bg-gray-50 dark:bg-zinc-800
          hover:bg-gray-100 dark:hover:bg-zinc-700
          active:bg-gray-200 dark:active:bg-zinc-900
          text-foreground border-gray-200 dark:border-zinc-700
          shadow-sm
          focus-visible:outline-ring
          data-[state=open]:bg-gray-200 dark:data-[state=open]:bg-zinc-700
        `,
        secondary: `
          bg-gray-50 dark:bg-zinc-800
          hover:bg-gray-100 dark:hover:bg-zinc-700
          active:bg-gray-200 dark:active:bg-zinc-900
          text-foreground border-gray-200 dark:border-zinc-700
          shadow-sm
          focus-visible:outline-ring
          data-[state=open]:bg-gray-200 dark:data-[state=open]:bg-zinc-700
        `,
        alternative: `
          bg-gray-100 dark:bg-zinc-800
          hover:bg-gray-200 dark:hover:bg-zinc-700
          text-foreground border-transparent
          focus-visible:outline-ring
          data-[state=open]:bg-muted/80
        `,
        outline: `
          bg-transparent dark:bg-transparent
          hover:bg-gray-50 dark:hover:bg-zinc-800/50
          active:bg-gray-100 dark:active:bg-zinc-800
          text-foreground border-gray-300 dark:border-zinc-600
          shadow-sm
          hover:border-gray-400 dark:hover:border-zinc-500
          focus-visible:outline-ring
          data-[state=open]:bg-gray-100 dark:data-[state=open]:bg-zinc-800
        `,
        dashed: `
          text-foreground border border-dashed border-gray-300 dark:border-zinc-600
          bg-transparent dark:bg-transparent
          hover:border-primary
          hover:bg-primary/5 dark:hover:bg-primary/10
          focus-visible:outline-ring
          data-[state=open]:bg-accent
        `,
        link: `text-foreground border border-transparent hover:bg-accent/50 hover:text-accent-foreground bg-transparent shadow-none focus-visible:outline-ring data-[state=open]:bg-accent`,
        text: `text-foreground hover:bg-gray-100 dark:hover:bg-zinc-800 hover:text-foreground shadow-none focus-visible:outline-ring data-[state=open]:bg-accent border-transparent`,
        danger: `
          bg-red-600
          hover:bg-red-500
          active:bg-red-700
          text-white border-red-700
          shadow-sm
          hover:shadow
          focus-visible:outline-red-500
          data-[state=open]:bg-red-700
        `,
        warning: `
          bg-amber-500
          hover:bg-amber-400
          active:bg-amber-600
          text-amber-950 border-amber-600
          shadow-sm
          hover:shadow
          focus-visible:outline-amber-500
          data-[state=open]:bg-amber-600
        `,
        success: `
          bg-emerald-600
          hover:bg-emerald-500
          active:bg-emerald-700
          text-white border-emerald-700
          shadow-sm
          hover:shadow
          focus-visible:outline-emerald-500
          data-[state=open]:bg-emerald-700
        `,
      },
      block: {
        true: 'w-full flex items-center justify-center',
      },
      size: {
        ...SIZE_VARIANTS,
      },
      overlay: {
        base: `absolute inset-0 bg-background opacity-50`,
        container: `fixed inset-0 transition-opacity`,
      },
      disabled: {
        true: 'opacity-50 cursor-not-allowed pointer-events-none',
      },
      rounded: {
        true: 'rounded-full',
      },
    },
    defaultVariants: {
      type: 'primary',
      size: SIZE_VARIANTS_DEFAULT,
    },
  }
)

const IconContainerVariants = cva('', {
  variants: {
    size: {
      tiny: '[&_svg]:h-[14px] [&_svg]:w-[14px]',
      small: '[&_svg]:h-[18px] [&_svg]:w-[18px]',
      medium: '[&_svg]:h-[20px] [&_svg]:w-[20px]',
      large: '[&_svg]:h-[20px] [&_svg]:w-[20px]',
      xlarge: '[&_svg]:h-[24px] [&_svg]:w-[24px]',
      xxlarge: '[&_svg]:h-[30px] [&_svg]:w-[30px]',
      xxxlarge: '[&_svg]:h-[42px] [&_svg]:w-[42px]',
    },
    type: {
      primary: 'text-white',
      default: 'text-foreground',
      secondary: 'text-foreground-muted',
      alternative: 'text-foreground-lighter',
      outline: 'text-foreground-lighter',
      dashed: 'text-foreground-lighter',
      link: 'text-brand-600',
      text: 'text-foreground-lighter',
      danger: 'text-white',
      warning: 'text-warning-600',
      success: 'text-white',
    },
  },
})

export type LoadingVariantProps = VariantProps<typeof loadingVariants>
const loadingVariants = cva('', {
  variants: {
    type: {
      primary: 'text-white',
      default: 'text-white',
      secondary: 'text-border-muted',
      alternative: 'text-foreground-lighter',
      outline: 'text-foreground-lighter',
      dashed: 'text-foreground-lighter',
      link: 'text-brand-600',
      text: 'text-foreground-muted',
      danger: 'text-white',
      warning: 'text-warning-600',
      success: 'text-white',
    },
    loading: {
      default: '',
      true: `animate-spin`,
    },
  },
})

type HtmlButtonType = 'button' | 'submit' | 'reset'
const HTML_BUTTON_TYPES: Set<string> = new Set(['button', 'submit', 'reset'])

export interface ButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'type' | 'size'>,
  Omit<ButtonVariantProps, 'disabled' | 'type'>,
  Omit<LoadingVariantProps, 'type'> {
  asChild?: boolean
  type?: ButtonVariantProps['type'] | HtmlButtonType
  variant?: 'ghost' | 'outline' | 'default' | 'secondary' | 'destructive' | 'link' | 'success'
  htmlType?: React.ButtonHTMLAttributes<HTMLButtonElement>['type']
  icon?: React.ReactNode
  iconLeft?: React.ReactNode
  iconRight?: React.ReactNode
  rounded?: boolean
  loading?: boolean
  block?: boolean
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      asChild = false,
      size = 'small',
      type = 'primary',
      variant,
      children,
      loading,
      block,
      icon,
      iconRight,
      iconLeft,
      htmlType = 'button',
      rounded,
      ...props
    },
    ref
  ) => {
    const Comp = asChild ? Slot : 'button'
    const { className } = props
    const showIcon = loading || icon
    const _iconLeft: React.ReactNode = icon ?? iconLeft
    const disabled = loading === true || props.disabled

    // If type is an HTML button type (button/submit/reset), use it as htmlType instead
    const isHtmlType = typeof type === 'string' && HTML_BUTTON_TYPES.has(type)
    const resolvedHtmlType = isHtmlType ? (type as HtmlButtonType) : htmlType
    const resolvedType: ButtonVariantProps['type'] = isHtmlType ? 'primary' : (type as ButtonVariantProps['type'])

    // Map variant to type if variant is provided
    const variantToType: Record<string, ButtonVariantProps['type']> = {
      ghost: 'text',
      outline: 'outline',
      default: 'default',
      secondary: 'secondary',
      destructive: 'danger',
      link: 'link',
      success: 'success',
    }
    const buttonType = variant ? variantToType[variant] : resolvedType

    // Map size aliases (sm -> small, lg -> large, etc.)
    const sizeMap: Record<string, any> = {
      sm: 'small',
      md: 'medium',
      lg: 'large',
      xl: 'xlarge',
    }
    const buttonSize = sizeMap[size as string] || size

    return (
      <Comp
        ref={ref}
        data-size={buttonSize}
        type={resolvedHtmlType}
        {...props}
        disabled={disabled}
        className={cn(buttonVariants({ type: buttonType, size: buttonSize, disabled, block, rounded }), className)}
        onClick={(e) => {
          if (disabled) return e.preventDefault()
          else props?.onClick?.(e)
        }}
      >
        {asChild && isValidElement(children)
          ? cloneElement(
              children as React.ReactElement,
              undefined,
              showIcon &&
                (loading ? (
                  <div className={cn(IconContainerVariants({ size: buttonSize, type: buttonType }))}>
                    <Loader2 className={cn(loadingVariants({ loading, type: buttonType }))} />
                  </div>
                ) : _iconLeft ? (
                  <div className={cn(IconContainerVariants({ size: buttonSize, type: buttonType }))}>{_iconLeft}</div>
                ) : null),
              (children as React.ReactElement<{ children?: React.ReactNode }>).props.children && (
                <span className={'truncate'}>{(children as React.ReactElement<{ children?: React.ReactNode }>).props.children}</span>
              ),
              iconRight && !loading && (
                <div className={cn(IconContainerVariants({ size: buttonSize, type: buttonType }))}>{iconRight}</div>
              )
            )
          : !asChild && (
          <>
            {showIcon &&
              (loading ? (
                <div className={cn(IconContainerVariants({ size: buttonSize, type: buttonType }))}>
                  <Loader2 className={cn(loadingVariants({ loading, type: buttonType }))} />
                </div>
              ) : _iconLeft ? (
                <div className={cn(IconContainerVariants({ size: buttonSize, type: buttonType }))}>{_iconLeft}</div>
              ) : null)}
            {children}
            {iconRight && !loading && (
              <div className={cn(IconContainerVariants({ size: buttonSize, type: buttonType }))}>{iconRight}</div>
            )}
          </>
          )}
      </Comp>
    )
  }
)

Button.displayName = 'Button'

export { Button, buttonVariants }
