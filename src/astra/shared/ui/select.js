import * as React from 'react'

import {
	Select as BaseSelect,
	SelectContent as BaseSelectContent,
	SelectGroup as BaseSelectGroup,
	SelectItem as BaseSelectItem,
	SelectLabel as BaseSelectLabel,
	SelectScrollDownButton as BaseSelectScrollDownButton,
	SelectScrollUpButton as BaseSelectScrollUpButton,
	SelectSeparator as BaseSelectSeparator,
	SelectTrigger as BaseSelectTrigger,
	SelectValue as BaseSelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'

const CONTENT_Z_INDEX = 16000

const SelectContent = React.forwardRef(({ className, style, ...props }, ref) => (
	<BaseSelectContent
		ref={ref}
		className={cn('z-[16000]', className)}
		style={{ zIndex: CONTENT_Z_INDEX, ...style }}
		{...props}
	/>
))

SelectContent.displayName = BaseSelectContent.displayName ?? 'SelectContent'

export {
	BaseSelect as Select,
	SelectContent,
	BaseSelectGroup as SelectGroup,
	BaseSelectItem as SelectItem,
	BaseSelectLabel as SelectLabel,
	BaseSelectScrollDownButton as SelectScrollDownButton,
	BaseSelectScrollUpButton as SelectScrollUpButton,
	BaseSelectSeparator as SelectSeparator,
	BaseSelectTrigger as SelectTrigger,
	BaseSelectValue as SelectValue,
}
