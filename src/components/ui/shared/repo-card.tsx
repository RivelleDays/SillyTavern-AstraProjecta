import * as React from "react";

import { GithubBrand } from "@/components/ui/shared/brand-icons";
import { UiIcon } from "@/components/ui/shared/icon";
import { GitFork, Scale, Star } from "@/components/ui/shared/icons";
import { cn } from "@/lib/utils";

export interface RepoCardProps extends Omit<
	React.ComponentProps<"a">,
	"aria-label" | "children"
> {
	ariaLabel: string;
	description?: string;
	forks?: number;
	fullName: string;
	language?: string;
	languageColor?: string;
	license?: string;
	maxTopics?: number;
	stars?: number;
	topics?: readonly string[];
}

function formatRepoCount(count: number) {
	if (count >= 1_000_000) {
		const value = count / 1_000_000;
		return `${value % 1 === 0 ? value.toFixed(0) : value.toFixed(1)}m`;
	}
	if (count >= 1_000) {
		const value = count / 1_000;
		return `${value % 1 === 0 ? value.toFixed(0) : value.toFixed(1)}k`;
	}
	return count.toLocaleString("en-US");
}

export function RepoCard({
	ariaLabel,
	className,
	description,
	forks,
	fullName,
	language,
	languageColor = "#8b8b8b",
	license,
	maxTopics = 4,
	stars,
	topics = [],
	...props
}: RepoCardProps) {
	const visibleTopics = topics.slice(0, maxTopics);
	const hiddenTopicCount = Math.max(0, topics.length - visibleTopics.length);

	return (
		<a
			{...props}
			aria-label={ariaLabel}
			className={cn(
				"astra-repo-card flex min-w-0 flex-col gap-3 rounded-lg border border-border bg-card p-4 text-card-foreground shadow-xs transition-colors hover:border-foreground/20 hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
				className,
			)}
			data-slot="repo-card"
			rel="noreferrer"
			target="_blank"
		>
			<div className="flex min-w-0 items-start justify-between gap-3">
				<div className="flex min-w-0 items-center gap-2">
					<UiIcon
						aria-hidden={true}
						className="text-muted-foreground"
						icon={GithubBrand}
						size="sm"
					/>
					<span
						className="truncate text-sm font-semibold"
						data-slot="repo-name"
					>
						{fullName}
					</span>
				</div>
			</div>

			{description ? (
				<p
					className="line-clamp-2 text-xs text-muted-foreground"
					data-slot="repo-description"
				>
					{description}
				</p>
			) : null}

			{visibleTopics.length > 0 ? (
				<div className="flex flex-wrap gap-1.5" data-slot="repo-topics">
					{visibleTopics.map((topic) => (
						<span
							className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary"
							key={topic}
						>
							{topic}
						</span>
					))}
					{hiddenTopicCount > 0 ? (
						<span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
							+{hiddenTopicCount}
						</span>
					) : null}
				</div>
			) : null}

			<div
				className="flex min-w-0 flex-wrap items-center gap-3 text-xs text-muted-foreground"
				data-slot="repo-meta"
			>
				{language ? (
					<span className="inline-flex min-w-0 items-center gap-1.5">
						<span
							aria-hidden={true}
							className="size-2.5 shrink-0 rounded-full"
							style={{ backgroundColor: languageColor }}
						/>
						<span className="truncate">{language}</span>
					</span>
				) : null}
				{typeof stars === "number" ? (
					<span className="inline-flex items-center gap-1 tabular-nums">
						<UiIcon
							aria-hidden={true}
							className="opacity-60"
							icon={Star}
							size="xs"
						/>
						{formatRepoCount(stars)}
					</span>
				) : null}
				{typeof forks === "number" && forks > 0 ? (
					<span className="inline-flex items-center gap-1 tabular-nums">
						<UiIcon
							aria-hidden={true}
							className="opacity-60"
							icon={GitFork}
							size="xs"
						/>
						{formatRepoCount(forks)}
					</span>
				) : null}
				{license ? (
					<span className="inline-flex min-w-0 items-center gap-1">
						<UiIcon
							aria-hidden={true}
							className="opacity-60"
							icon={Scale}
							size="xs"
						/>
						<span className="truncate">{license}</span>
					</span>
				) : null}
			</div>
		</a>
	);
}
