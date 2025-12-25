import * as React from "react"
import { Slot } from "@radix-ui/react-slot"

import { cn } from "@/lib/utils"

const ButtonGroup = React.forwardRef(
  ({ className, orientation = "horizontal", asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "div"
    return (
      <Comp
        ref={ref}
        role="group"
        data-astra-component="ButtonGroup"
        data-orientation={orientation}
        className={cn(
          "astra-button-group inline-flex items-stretch",
          orientation === "vertical" ? "flex-col" : "flex-row",
          className
        )}
        {...props} />
    );
  }
)
ButtonGroup.displayName = "ButtonGroup"

export { ButtonGroup }
