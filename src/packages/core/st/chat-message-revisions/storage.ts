export {
	asIndex,
	asPath,
	asRevisionList,
	asRevisionNode,
	cleanupDerivedRevisionFields,
	ensureWritableRevisionRoots,
	readLegacyRevisionRoots,
	readNamespacedRevisionRoots,
	readRevisionRoots,
	writeNamespacedRevisionRoots,
} from "@/packages/core/st/chatMessageRevisionData";

export type {
	AstraRevisionKind,
	AstraRevisionMessage,
	AstraRevisionNode,
} from "@/packages/core/st/chatMessageRevisionData";
