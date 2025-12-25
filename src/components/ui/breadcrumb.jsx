import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { ChevronRightIcon, MoreHorizontalIcon } from "lucide-react"

import { cn } from "@/lib/utils"

const Breadcrumb = React.forwardRef(({ className, ...props }, ref) => (
  <nav
    ref={ref}
    aria-label="breadcrumb"
    data-astra-component="Breadcrumb"
    className={cn(
      "astra-breadcrumb flex w-full flex-wrap items-center gap-1 text-sm text-muted-foreground sm:gap-2",
      className
    )}
    {...props} />
))
Breadcrumb.displayName = "Breadcrumb"

const BreadcrumbList = React.forwardRef(({ className, ...props }, ref) => (
  <ol
    ref={ref}
    className={cn(
      "astra-breadcrumb__list flex flex-wrap items-center gap-1.5 sm:gap-2.5",
      className
    )}
    {...props} />
))
BreadcrumbList.displayName = "BreadcrumbList"

const BreadcrumbItem = React.forwardRef(({ className, ...props }, ref) => (
  <li
    ref={ref}
    className={cn("astra-breadcrumb__item inline-flex items-center gap-1.5", className)}
    {...props} />
))
BreadcrumbItem.displayName = "BreadcrumbItem"

const BreadcrumbLink = React.forwardRef(
  ({ asChild, className, ...props }, ref) => {
    const Comp = asChild ? Slot : "a"

    return (
      <Comp
        ref={ref}
        className={cn(
          "astra-breadcrumb__link inline-flex items-center gap-1.5 rounded-md px-2 py-1 font-medium text-foreground transition-colors hover:bg-accent/60 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          className
        )}
        {...props} />
    )
  }
)
BreadcrumbLink.displayName = "BreadcrumbLink"

const BreadcrumbPage = React.forwardRef(({ className, ...props }, ref) => (
  <span
    ref={ref}
    role="link"
    aria-disabled="true"
    aria-current="page"
    className={cn(
      "astra-breadcrumb__page astra-breadcrumb__link inline-flex items-center gap-1.5 rounded-md px-2 py-1 font-medium text-foreground transition-colors hover:bg-accent/60 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
      className
    )}
    {...props} />
))
BreadcrumbPage.displayName = "BreadcrumbPage"

const BreadcrumbSeparator = React.forwardRef(
  ({ children, className, ...props }, ref) => (
    <li
      ref={ref}
      role="presentation"
      aria-hidden="true"
      className={cn(
        "astra-breadcrumb__separator flex h-3.5 w-3.5 items-center justify-center text-muted-foreground [&>svg]:h-3.5 [&>svg]:w-3.5",
        className
      )}
      {...props}>
      {children ?? <ChevronRightIcon />}
    </li>
  )
)
BreadcrumbSeparator.displayName = "BreadcrumbSeparator"

const BreadcrumbEllipsis = React.forwardRef(({ className, ...props }, ref) => (
  <span
    ref={ref}
    role="presentation"
    aria-hidden="true"
    className={cn(
      "astra-breadcrumb__ellipsis flex h-9 w-9 items-center justify-center rounded-md",
      className
    )}
    {...props}>
    <MoreHorizontalIcon className="h-4 w-4" />
    <span className="sr-only">More</span>
  </span>
))
BreadcrumbEllipsis.displayName = "BreadcrumbEllipsis"

export {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbSeparator,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbEllipsis,
}
