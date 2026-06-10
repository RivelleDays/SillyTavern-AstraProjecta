import * as React from "react";

import { cn } from "@/lib/utils";

const MAX_GROUP_COLLAGE_IMAGES = 4;

export interface AstraChatAvatarProps {
	"aria-hidden"?: boolean;
	alt?: string;
	avatarUrl?: string;
	className?: string;
	collageClassName?: string;
	collageImageClassName?: string;
	fallbackClassName?: string;
	fallbackText?: string;
	groupAvatarUrls?: string[];
	imageClassName?: string;
	loading?: "eager" | "lazy";
}

export function AstraChatAvatar({
	"aria-hidden": ariaHidden,
	alt = "",
	avatarUrl = "",
	className,
	collageClassName,
	collageImageClassName,
	fallbackClassName,
	fallbackText = "?",
	groupAvatarUrls = [],
	imageClassName,
	loading = "lazy",
}: AstraChatAvatarProps) {
	const collageUrls = groupAvatarUrls
		.filter(Boolean)
		.slice(0, MAX_GROUP_COLLAGE_IMAGES);

	if (collageUrls.length > 0) {
		return (
			<span
				aria-hidden={ariaHidden}
				className={cn(
					"astra-chat-avatar astra-chat-avatar--collage",
					className,
					collageClassName,
				)}
				data-count={collageUrls.length}
			>
				{collageUrls.map((groupAvatarUrl, index) => (
					<img
						alt=""
						className={cn(
							"astra-chat-avatar__collage-image",
							collageImageClassName,
						)}
						draggable={false}
						key={`${groupAvatarUrl}:${index}`}
						loading={loading}
						src={groupAvatarUrl}
					/>
				))}
			</span>
		);
	}

	return (
		<span
			aria-hidden={ariaHidden}
			className={cn(
				"astra-chat-avatar",
				avatarUrl
					? "astra-chat-avatar--image"
					: "astra-chat-avatar--fallback",
				className,
			)}
		>
			{avatarUrl ? (
				<img
					alt={alt}
					className={cn("astra-chat-avatar__image", imageClassName)}
					draggable={false}
					loading={loading}
					src={avatarUrl}
				/>
			) : (
				<span
					aria-hidden={true}
					className={cn(
						"astra-chat-avatar__fallback",
						fallbackClassName,
					)}
				>
					{fallbackText}
				</span>
			)}
		</span>
	);
}
