import * as React from 'react'
import * as SliderPrimitive from '@radix-ui/react-slider'

import { cn } from '@/lib/utils'

const Slider = React.forwardRef(
	(
		{ className, trackClassName, rangeClassName, thumbClassName, ...props },
		ref,
	) => (
		<SliderPrimitive.Root
			ref={ref}
			data-astra-component="Slider"
			className={cn(
				'astra-slider relative flex w-full touch-none select-none items-center data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-60',
				className,
			)}
			{...props}
		>
			<SliderPrimitive.Track
				className={cn(
					'astra-slider__track relative h-1.5 w-full grow overflow-hidden rounded-full bg-primary/20',
					trackClassName,
				)}
			>
				<SliderPrimitive.Range
					className={cn('astra-slider__range absolute h-full bg-primary', rangeClassName)}
				/>
			</SliderPrimitive.Track>
			<SliderPrimitive.Thumb
				className={cn(
					'astra-slider__thumb block h-4 w-4 rounded-full border border-primary bg-primary shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
					thumbClassName,
				)}
			/>
		</SliderPrimitive.Root>
	),
)
Slider.displayName = SliderPrimitive.Root.displayName

export { Slider }
