import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SOURCE_FILE_PATTERN = /\.[jt]sx?$/u;
const TEST_FILE_PATTERN = /\.(?:test|spec)\.[jt]sx?$/u;
const GENERATED_DECLARATION_PATTERN = /\.d\.ts$/u;
const EXCLUDED_SOURCE_SEGMENTS = ["/src/test/"];
const SHARED_HELPER_PATH = "src/packages/core/st/shared.ts";
const CANONICAL_HELPER_NAMES = [
	"asTrimmedIdentifier",
	"asTrimmedPrimitiveString",
	"asTrimmedString",
	"isRecord",
	"normalizeChatId",
	"readContextSafe",
];

function fail(message) {
	throw new Error(message);
}

function escapeRegExp(value) {
	return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}

function normalizePath(filePath) {
	return filePath.replaceAll("\\", "/");
}

function toRelativePath(repoRoot, filePath) {
	return normalizePath(path.relative(repoRoot, filePath));
}

function createDefinitionRegex(helperName) {
	const escapedName = escapeRegExp(helperName);

	return new RegExp(
		[
			`(?:^|\\n)\\s*(?:export\\s+)?function\\s+${escapedName}\\s*\\(`,
			`(?:^|\\n)\\s*(?:export\\s+)?const\\s+${escapedName}\\s*=`,
		].join("|"),
		"gu",
	);
}

function getLineNumber(content, index) {
	return content.slice(0, index).split("\n").length;
}

export function createPaths(repoRoot = process.cwd()) {
	const resolvedRepoRoot = path.resolve(repoRoot);

	return {
		repoRoot: resolvedRepoRoot,
		sourceRoot: path.resolve(resolvedRepoRoot, "src"),
	};
}

export function shouldScanSourceFile(filePath, repoRoot) {
	const relativePath = toRelativePath(repoRoot, filePath);

	if (relativePath === SHARED_HELPER_PATH) {
		return false;
	}

	if (!SOURCE_FILE_PATTERN.test(relativePath)) {
		return false;
	}

	if (
		GENERATED_DECLARATION_PATTERN.test(relativePath) ||
		TEST_FILE_PATTERN.test(relativePath)
	) {
		return false;
	}

	return !EXCLUDED_SOURCE_SEGMENTS.some((segment) =>
		`/${relativePath}`.includes(segment),
	);
}

export function collectSourceFiles(sourceRoot, repoRoot) {
	if (!fs.existsSync(sourceRoot)) {
		return [];
	}

	const directories = [sourceRoot];
	const sourceFiles = [];

	while (directories.length > 0) {
		const directory = directories.pop();

		if (!directory) {
			continue;
		}

		for (const entry of fs.readdirSync(directory, {
			withFileTypes: true,
		})) {
			const entryPath = path.join(directory, entry.name);

			if (entry.isDirectory()) {
				directories.push(entryPath);
				continue;
			}

			if (entry.isFile() && shouldScanSourceFile(entryPath, repoRoot)) {
				sourceFiles.push(entryPath);
			}
		}
	}

	return sourceFiles.sort((left, right) => left.localeCompare(right));
}

export function findSharedHelperViolations({ repoRoot, sourceRoot }) {
	const violations = [];

	for (const filePath of collectSourceFiles(sourceRoot, repoRoot)) {
		const content = fs.readFileSync(filePath, "utf8");
		const relativePath = toRelativePath(repoRoot, filePath);

		for (const helperName of CANONICAL_HELPER_NAMES) {
			const definitionRegex = createDefinitionRegex(helperName);
			let match = definitionRegex.exec(content);

			while (match) {
				violations.push(
					`${relativePath}:${getLineNumber(content, match.index)} ${helperName}`,
				);
				match = definitionRegex.exec(content);
			}
		}
	}

	return violations;
}

export function run({ logger = console, repoRoot = process.cwd() } = {}) {
	const paths = createPaths(repoRoot);
	const violations = findSharedHelperViolations(paths);

	if (violations.length > 0) {
		logger.error(
			"Found local ST shared helper definitions outside src/packages/core/st/shared.ts:",
		);

		for (const violation of violations) {
			logger.error(`- ${violation}`);
		}

		fail(
			`Local ST shared helper definitions found: ${violations.join(", ")}`,
		);
	}

	return { violations };
}

const entrypointPath = process.argv[1] ? path.resolve(process.argv[1]) : null;

if (entrypointPath && fileURLToPath(import.meta.url) === entrypointPath) {
	try {
		run();
	} catch (error) {
		console.error(error instanceof Error ? error.message : error);
		process.exit(1);
	}
}
