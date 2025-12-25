import * as React from 'react'

import {
	DropdownMenu as BaseDropdownMenu,
	DropdownMenuTrigger as BaseDropdownMenuTrigger,
	DropdownMenuContent as BaseDropdownMenuContent,
	DropdownMenuItem as BaseDropdownMenuItem,
	DropdownMenuCheckboxItem as BaseDropdownMenuCheckboxItem,
	DropdownMenuRadioItem as BaseDropdownMenuRadioItem,
	DropdownMenuLabel as BaseDropdownMenuLabel,
	DropdownMenuSeparator as BaseDropdownMenuSeparator,
	DropdownMenuShortcut as BaseDropdownMenuShortcut,
	DropdownMenuGroup as BaseDropdownMenuGroup,
	DropdownMenuPortal as BaseDropdownMenuPortal,
	DropdownMenuSub as BaseDropdownMenuSub,
	DropdownMenuSubContent as BaseDropdownMenuSubContent,
	DropdownMenuSubTrigger as BaseDropdownMenuSubTrigger,
	DropdownMenuRadioGroup as BaseDropdownMenuRadioGroup,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

const CONTENT_Z_INDEX = 16000

const DropdownMenuContent = React.forwardRef(({ className, style, ...props }, ref) => (
	<BaseDropdownMenuContent
		ref={ref}
		className={cn('z-[16000]', className)}
		style={{ zIndex: CONTENT_Z_INDEX, ...style }}
		{...props}
	/>
))
DropdownMenuContent.displayName = BaseDropdownMenuContent.displayName ?? 'DropdownMenuContent'

const DropdownMenuSubContent = React.forwardRef(({ className, style, ...props }, ref) => (
	<BaseDropdownMenuSubContent
		ref={ref}
		className={cn('z-[16000]', className)}
		style={{ zIndex: CONTENT_Z_INDEX, ...style }}
		{...props}
	/>
))
DropdownMenuSubContent.displayName = BaseDropdownMenuSubContent.displayName ?? 'DropdownMenuSubContent'

export {
	BaseDropdownMenu as DropdownMenu,
	BaseDropdownMenuTrigger as DropdownMenuTrigger,
	DropdownMenuContent,
	BaseDropdownMenuItem as DropdownMenuItem,
	BaseDropdownMenuCheckboxItem as DropdownMenuCheckboxItem,
	BaseDropdownMenuRadioItem as DropdownMenuRadioItem,
	BaseDropdownMenuLabel as DropdownMenuLabel,
	BaseDropdownMenuSeparator as DropdownMenuSeparator,
	BaseDropdownMenuShortcut as DropdownMenuShortcut,
	BaseDropdownMenuGroup as DropdownMenuGroup,
	BaseDropdownMenuPortal as DropdownMenuPortal,
	BaseDropdownMenuSub as DropdownMenuSub,
	DropdownMenuSubContent,
	BaseDropdownMenuSubTrigger as DropdownMenuSubTrigger,
	BaseDropdownMenuRadioGroup as DropdownMenuRadioGroup,
}
