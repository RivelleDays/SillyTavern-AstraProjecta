import * as React from "react";

import { translateAstra } from "@/packages/core/i18n";
import {
	activateChatEntity as activateChatEntityDefault,
	type ActivateChatEntity,
} from "@/packages/core/st/chat-catalog";
import type { FavoriteChatEntity } from "@/packages/core/st/favorite-chat-entities";
import { beginAstraChatSwitch } from "@/packages/features/chat-session/chat-switch-loading";

interface ToastrLike {
	error?(message: string): void;
}

export interface FavoriteChatEntityActivationControllerOptions {
	activateChatEntity?: ActivateChatEntity;
	onActivationSuccess(): void;
}

function showActivationFailureToast() {
	const toastr = (globalThis as typeof globalThis & { toastr?: ToastrLike })
		.toastr;
	toastr?.error?.call(
		toastr,
		translateAstra("astraMainInterface.sections.switchFailure"),
	);
}

export function useFavoriteChatEntityActivationController({
	activateChatEntity = activateChatEntityDefault,
	onActivationSuccess,
}: FavoriteChatEntityActivationControllerOptions) {
	const [activatingScopeValue, setActivatingScopeValue] = React.useState<
		string | null
	>(null);
	const activatingScopeValueRef = React.useRef<string | null>(null);
	const mountedRef = React.useRef(true);

	React.useEffect(() => {
		mountedRef.current = true;
		return () => {
			mountedRef.current = false;
		};
	}, []);

	const activateFavoriteEntity = React.useCallback(
		async (entity: FavoriteChatEntity) => {
			if (activatingScopeValueRef.current !== null) {
				return;
			}

			const loadingAttempt = beginAstraChatSwitch(
				translateAstra("astraMainInterface.sections.switching"),
			);
			activatingScopeValueRef.current = entity.scopeValue;
			setActivatingScopeValue(entity.scopeValue);

			const result = await Promise.resolve(
				activateChatEntity({
					characterId: entity.characterId,
					entityId: entity.entityId,
					entityName: entity.entityName,
					kind: entity.kind,
				}),
			).catch(() => ({
				ok: false as const,
				reason: "open-failed" as const,
			}));

			if (!result.ok || result.alreadyCurrent) {
				await loadingAttempt.cancel();
			}

			if (!mountedRef.current) {
				return;
			}

			activatingScopeValueRef.current = null;
			setActivatingScopeValue(null);

			if (result.ok) {
				onActivationSuccess();
				return;
			}

			showActivationFailureToast();
		},
		[activateChatEntity, onActivationSuccess],
	);

	return {
		activateFavoriteEntity,
		activatingScopeValue,
		isActivating: activatingScopeValue !== null,
	};
}
