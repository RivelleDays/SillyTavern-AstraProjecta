import { render } from "@testing-library/react";
import { describe, expect, test } from "vitest";

import { AstraChatAvatar } from "@/components/ui/shared/chat-avatar";

describe("AstraChatAvatar", () => {
	test("renders at most four group collage images", () => {
		const { container } = render(
			<AstraChatAvatar
				alt="Party avatar"
				avatarUrl="/thumbs/avatar/fallback.png"
				groupAvatarUrls={[
					"/thumbs/avatar/hero.png",
					"/thumbs/avatar/mage.png",
					"/thumbs/avatar/rogue.png",
					"/thumbs/avatar/cleric.png",
					"/thumbs/avatar/extra.png",
				]}
			/>,
		);

		const avatar = container.querySelector(
			".astra-chat-avatar",
		) as HTMLElement;
		const images = Array.from(
			avatar.querySelectorAll(".astra-chat-avatar__collage-image"),
		);

		expect(avatar).toHaveClass("astra-chat-avatar--collage");
		expect(avatar).toHaveAttribute("data-count", "4");
		expect(images).toHaveLength(4);
		expect(images.map((image) => image.getAttribute("src"))).toEqual([
			"/thumbs/avatar/hero.png",
			"/thumbs/avatar/mage.png",
			"/thumbs/avatar/rogue.png",
			"/thumbs/avatar/cleric.png",
		]);
	});
});
