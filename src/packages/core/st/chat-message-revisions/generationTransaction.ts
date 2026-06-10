export type RevisionGenerationMode = "child" | "root";

export interface RevisionGenerationTransaction {
	messageId: number;
	mode: RevisionGenerationMode;
	parentPath: number[];
	previousChildCount: number;
	rootIndex: number;
	startText: string;
}

let pendingTransaction: RevisionGenerationTransaction | null = null;

export function clearRevisionGenerationTransaction(): void {
	pendingTransaction = null;
}

export function getRevisionGenerationTransaction(): RevisionGenerationTransaction | null {
	return pendingTransaction;
}

export function getRevisionGenerationTransactionForMessage(
	messageId: number,
): RevisionGenerationTransaction | null {
	return pendingTransaction?.messageId === messageId
		? pendingTransaction
		: null;
}

export function startRevisionGenerationTransaction(
	transaction: RevisionGenerationTransaction,
): void {
	pendingTransaction = {
		...transaction,
		parentPath: [...transaction.parentPath],
	};
}
