import { createLucideIcon } from "@/components/ui/shared/icons";
import discordSvg from "@/components/ui/shared/brand-icons/discord.svg?raw";
import githubSvg from "@/components/ui/shared/brand-icons/github.svg?raw";
import redditSvg from "@/components/ui/shared/brand-icons/reddit.svg?raw";

// Brand SVGs from Simple Icons (https://github.com/simple-icons/simple-icons), CC0-1.0.
// The .svg files in this folder are the source of truth; keep them single-path 24x24.

function createBrandIcon(name: string, svgSource: string) {
	// ponytail: regex path extraction only supports single-path Simple Icons SVGs.
	const path = /\bd="([^"]+)"/.exec(svgSource)?.[1] ?? "";

	return createLucideIcon(name, [
		[
			"path",
			{ d: path, fill: "currentColor", key: "brand", stroke: "none" },
		],
	]);
}

export const DiscordBrand = createBrandIcon("DiscordBrand", discordSvg);
export const GithubBrand = createBrandIcon("GithubBrand", githubSvg);
export const RedditBrand = createBrandIcon("RedditBrand", redditSvg);
