import * as React from "react";
import type { ReactNode } from "react";

import { reportAstraFatalError } from "@/packages/core/runtime/fatalErrorRecovery";

export interface AstraErrorBoundaryProps {
	children: ReactNode;
	source: string;
}

interface AstraErrorBoundaryState {
	hasError: boolean;
}

export class AstraErrorBoundary extends React.Component<
	AstraErrorBoundaryProps,
	AstraErrorBoundaryState
> {
	state: AstraErrorBoundaryState = {
		hasError: false,
	};

	static getDerivedStateFromError(): AstraErrorBoundaryState {
		return { hasError: true };
	}

	componentDidCatch(error: Error): void {
		reportAstraFatalError(this.props.source, error);
	}

	render(): ReactNode {
		if (this.state.hasError) {
			return null;
		}

		return this.props.children;
	}
}

export function withAstraErrorBoundary({
	children,
	source,
}: AstraErrorBoundaryProps): React.ReactElement {
	return <AstraErrorBoundary source={source}>{children}</AstraErrorBoundary>;
}
