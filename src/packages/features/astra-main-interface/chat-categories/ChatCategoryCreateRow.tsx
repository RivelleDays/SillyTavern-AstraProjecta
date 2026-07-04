import * as React from "react";

import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/astra/dropdown-menu";
import { Button, buttonVariants } from "@/components/ui/shadcn/button";
import { Input } from "@/components/ui/shadcn/input";
import { UiIcon } from "@/components/ui/shared/icon";
import { CirclePlus, FolderOpen } from "@/components/ui/shared/icons";
import { translateAstra } from "@/packages/core/i18n";
import type { ChatCategoryStore } from "@/packages/core/st/chat-categories";
import type { I18nKey } from "@/types/i18n";

import {
	createGlobalScope,
	getCategoryErrorMessage,
	getScopeOptionKey,
	type CategoryScopeOption,
} from "@/packages/features/astra-main-interface/chat-categories/categoryModel";

export function ChatCategoryCreateRow({
	actions,
	addLabelKey = "astraMainInterface.global.categories.create.add",
	chatCategoryStore,
	inputId,
	inputLabelKey = "astraMainInterface.global.categories.create.inputLabel",
	placeholderKey = "astraMainInterface.global.categories.create.placeholder",
	scopeOptions,
	showScopeSelect = false,
}: {
	actions?: React.ReactNode;
	addLabelKey?: I18nKey;
	chatCategoryStore: ChatCategoryStore;
	inputId: string;
	inputLabelKey?: I18nKey;
	placeholderKey?: I18nKey;
	scopeOptions: CategoryScopeOption[];
	showScopeSelect?: boolean;
}) {
	const [name, setName] = React.useState("");
	const [selectedScopeKey, setSelectedScopeKey] = React.useState(() =>
		getScopeOptionKey(scopeOptions[0]?.value ?? createGlobalScope()),
	);
	const [error, setError] = React.useState("");
	const selectedScope =
		scopeOptions.find(
			(option) => getScopeOptionKey(option.value) === selectedScopeKey,
		) ?? scopeOptions[0];
	const canCreate = name.trim().length > 0 && Boolean(selectedScope);
	const isMultiScope = showScopeSelect && scopeOptions.length > 1;
	const displayedScope = selectedScope ?? scopeOptions[0];
	const inputDisabled = !displayedScope;
	const scopeInputLabel = translateAstra(
		"astraMainInterface.categories.scope.inputLabel",
	);

	React.useEffect(() => {
		if (
			scopeOptions.some(
				(option) =>
					getScopeOptionKey(option.value) === selectedScopeKey,
			)
		) {
			return;
		}

		setSelectedScopeKey(
			getScopeOptionKey(scopeOptions[0]?.value ?? createGlobalScope()),
		);
	}, [scopeOptions, selectedScopeKey]);

	const handleCreate = React.useCallback(() => {
		if (!canCreate || !displayedScope) {
			return;
		}

		const result = chatCategoryStore.createCategory({
			name,
			...displayedScope.value,
		});

		if (!result.ok) {
			setError(getCategoryErrorMessage(result.reason));
			return;
		}

		setName("");
		setError("");
	}, [canCreate, chatCategoryStore, displayedScope, name]);

	const handleScopeSelect = React.useCallback(
		(nextScopeKey: string) => {
			if (
				!scopeOptions.some(
					(option) =>
						getScopeOptionKey(option.value) === nextScopeKey,
				)
			) {
				return;
			}

			setSelectedScopeKey(nextScopeKey);
			setError("");
		},
		[scopeOptions],
	);

	return (
		<div className="astra-chat-library-category-create">
			<div
				className={
					showScopeSelect
						? "astra-chat-library-category-createRow"
						: "astra-chat-library-category-createRow astra-chat-library-category-createRow--single"
				}
			>
				{showScopeSelect && displayedScope ? (
					isMultiScope ? (
						<DropdownMenu>
							<DropdownMenuTrigger
								aria-label={`${scopeInputLabel}: ${displayedScope.label}`}
								className={buttonVariants({
									className:
										"astra-chat-library-category-selectTrigger",
									size: "icon",
									variant: "outline",
								})}
								data-size="icon"
								data-slot="select-trigger"
								title={displayedScope.label}
								type="button"
							>
								<UiIcon
									aria-hidden={true}
									data-icon="inline-start"
									icon={displayedScope.icon}
									size="sm"
								/>
							</DropdownMenuTrigger>
							<DropdownMenuContent
								align="start"
								className="astra-chat-library-category-selectMenu"
							>
								{scopeOptions.map((option) => {
									const optionKey = getScopeOptionKey(
										option.value,
									);

									return (
										<DropdownMenuItem
											className="astra-chat-library-category-selectItem"
											data-state={
												optionKey === selectedScopeKey
													? "checked"
													: "unchecked"
											}
											key={optionKey}
											onClick={() => {
												handleScopeSelect(optionKey);
											}}
										>
											<UiIcon
												aria-hidden={true}
												icon={option.icon}
												size="sm"
											/>
											<span>{option.label}</span>
										</DropdownMenuItem>
									);
								})}
							</DropdownMenuContent>
						</DropdownMenu>
					) : (
						<Button
							aria-label={`${scopeInputLabel}: ${displayedScope.label}`}
							className="astra-chat-library-category-selectTrigger"
							data-size="icon"
							data-slot="select-trigger"
							disabled={true}
							size="icon"
							title={displayedScope.label}
							type="button"
							variant="outline"
						>
							<UiIcon
								aria-hidden={true}
								data-icon="inline-start"
								icon={displayedScope.icon}
								size="sm"
							/>
						</Button>
					)
				) : null}
				<div className="astra-main-interface__search-shell astra-chat-library-category-inputWrap">
					<UiIcon
						aria-hidden={true}
						className="astra-main-interface__search-icon"
						icon={FolderOpen}
						size="sm"
					/>
					<Input
						aria-label={translateAstra(inputLabelKey)}
						className="astra-main-interface__search-input astra-chat-library-category-input"
						disabled={inputDisabled}
						id={inputId}
						placeholder={translateAstra(placeholderKey)}
						type="text"
						value={name}
						onChange={(event) => {
							setName(event.target.value);
							setError("");
						}}
						onKeyDown={(event) => {
							if (event.key !== "Enter") {
								return;
							}

							event.preventDefault();
							handleCreate();
						}}
					/>
					<Button
						aria-label={translateAstra(addLabelKey)}
						className="astra-chat-library-category-addButton"
						disabled={!canCreate}
						size="icon-sm"
						type="button"
						variant="ghost"
						onClick={handleCreate}
					>
						<UiIcon
							aria-hidden={true}
							icon={CirclePlus}
							size="sm"
						/>
					</Button>
				</div>
				{actions}
			</div>
			<p
				className="astra-chat-library-category-error"
				hidden={!error}
				role={error ? "alert" : undefined}
			>
				{error}
			</p>
		</div>
	);
}
