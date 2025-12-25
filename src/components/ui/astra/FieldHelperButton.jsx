import * as React from "react"
import { CircleHelp as CircleHelpIcon } from "lucide-react"
import { cn } from "@/lib/utils"

import { ResponsiveDialog } from "@/astra/shared/ui/ResponsiveDialog.jsx"
import { useMediaQuery } from "@/hooks/useMediaQuery"
import { DialogDescription, DialogTitle } from "@/components/ui/dialog"
import { DrawerDescription, DrawerTitle } from "@/components/ui/drawer"
import { Button } from "@/components/ui/button"

const DEFAULT_DESCRIPTION = "Field details"
const DEFAULT_FALLBACK = "No details provided."
const DEFAULT_CLOSE_LABEL = "Close"

export function FieldHelperButton({
  label,
  helper,
  description = DEFAULT_DESCRIPTION,
  fallback = DEFAULT_FALLBACK,
  closeLabel = DEFAULT_CLOSE_LABEL,
  icon: Icon = CircleHelpIcon,
  iconSize = 16,
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  disabled = false,
  container,
  className,
  contentClassName,
  onClick,
}) {
  const helperId = React.useId()
  const isDesktop = useMediaQuery("(min-width: 768px)")
  const isControlled = openProp !== undefined
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(defaultOpen)
  const open = isControlled ? Boolean(openProp) : uncontrolledOpen
  const identityLabel = typeof label === "string" && label.trim()
    ? label.trim()
    : DEFAULT_DESCRIPTION

  const TitleComponent = isDesktop ? DialogTitle : DrawerTitle
  const DescriptionComponent = isDesktop ? DialogDescription : DrawerDescription

  const helperContent = React.useMemo(() => {
    if (React.isValidElement(helper)) {
      return helper
    }

    if (typeof helper === "string") {
      return <p>{helper}</p>
    }

    if (React.isValidElement(fallback)) {
      return fallback
    }

    if (typeof fallback === "string") {
      return <p>{fallback}</p>
    }

    return <p>{DEFAULT_FALLBACK}</p>
  }, [fallback, helper])

  const setOpen = React.useCallback((nextOpen) => {
    if (!isControlled) {
      setUncontrolledOpen(nextOpen)
    }
    if (typeof onOpenChange === "function") {
      onOpenChange(nextOpen)
    }
  }, [isControlled, onOpenChange])

  const handleClose = React.useCallback(() => setOpen(false), [setOpen])

  const handleTriggerClick = React.useCallback((event) => {
    if (typeof onClick === "function") {
      onClick(event)
    }
    if (event?.defaultPrevented) return
    setOpen(true)
  }, [onClick, setOpen])

  const footer = (
    <Button type="button" variant="default" onClick={handleClose}>
      {closeLabel}
    </Button>
  )

  const headerContent = (
    <div className="astra-dialog-identity">
      <TitleComponent className="sr-only">{identityLabel}</TitleComponent>
      <DescriptionComponent className="sr-only">
        {description}
      </DescriptionComponent>
      <div className="astra-dialog-identityAvatar astra-field-helper-icon" aria-hidden="true">
        <Icon size={iconSize} />
      </div>
      <span className="astra-dialog-identityName" title={identityLabel}>
        {identityLabel}
      </span>
    </div>
  )

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        data-astra-component="FieldHelperButton"
        className={cn("astra-field-helper-button", className)}
        aria-label={`View info for ${identityLabel}`}
        aria-haspopup="dialog"
        aria-expanded={open ? "true" : "false"}
        aria-controls={helperId}
        onClick={handleTriggerClick}
        disabled={disabled}>
        <Icon size={iconSize} aria-hidden="true" />
      </Button>
      <ResponsiveDialog
        open={open}
        onOpenChange={setOpen}
        title={identityLabel}
        description={description}
        container={container}
        identity={null}
        hideHeading
        headerContent={headerContent}
        footer={footer}>
        <div
          className={cn("astra-dialog-section astra-field-helper-content", contentClassName)}
          id={helperId}>
          {helperContent}
        </div>
      </ResponsiveDialog>
    </>
  )
}
