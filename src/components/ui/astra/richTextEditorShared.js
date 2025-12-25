import * as React from "react"
import { resolveContext } from "@/astra/shared/characters/characterData.js"
import { renderMarkdownToHtml } from "@/astra/shared/markdown/renderMarkdown.js"
import { cn } from "@/lib/utils"

const TOKEN_PLACEHOLDER = "— tokens"
const TOKEN_LOADING = "Counting..."

export function TokenizedPreview({ value, emptyLabel = "Not provided.", className }) {
    const normalized = normalizeTokenText(value)
    const renderedPreview = React.useMemo(() => {
        if (!normalized) {
        return `<p class="astra-tokenized-textarea__previewEmpty">${emptyLabel}</p>`
        }
        return renderMarkdownToHtml(normalized)
    }, [emptyLabel, normalized])

    return (
        <div
        className={cn("astra-tokenized-textarea__preview", className)}
        dangerouslySetInnerHTML={{ __html: renderedPreview }} />
    )
}

export function useTokenCount(value, { enabled = true, deps } = {}) {
    const [state, setState] = React.useState({ count: null, isLoading: false })
    const requestRef = React.useRef(0)
    const depsRef = React.useRef(deps)

    React.useEffect(() => {
        depsRef.current = deps
    }, [deps])

    React.useEffect(() => {
        if (!enabled) {
        setState({ count: null, isLoading: false })
        return
        }

        const text = normalizeTokenText(value)
        if (!text) {
        setState({ count: 0, isLoading: false })
        return
        }

        let isActive = true
        const requestId = requestRef.current + 1
        requestRef.current = requestId

        const run = async () => {
        setState(prev => ({ ...prev, isLoading: true }))
        const tokenCount = await resolveTokenCount(text, depsRef.current)
        if (!isActive || requestId !== requestRef.current) return
        setState({ count: tokenCount, isLoading: false })
        }

        run().catch(error => {
        console?.error?.("[AstraProjecta] Failed to count tokens", error)
        if (!isActive || requestId !== requestRef.current) return
        setState({ count: estimateTokens(text), isLoading: false })
        })

        return () => {
        isActive = false
        }
    }, [value, enabled])

    return state
}

function resolveTokenCount(text, deps) {
    const counter = selectTokenCounter(deps)

    if (typeof counter === "function") {
        try {
        const result = counter(text)
        if (result && typeof result.then === "function") {
            return result.then(resolved => {
            const normalized = normalizeTokenCount(resolved)
            return normalized ?? estimateTokens(text)
            }).catch(error => {
            console?.error?.("[AstraProjecta] Token counter failed", error)
            return estimateTokens(text)
            })
        }
        const normalized = normalizeTokenCount(result)
        return Promise.resolve(normalized ?? estimateTokens(text))
        } catch (error) {
        console?.error?.("[AstraProjecta] Token counter threw", error)
        }
    }

    return Promise.resolve(estimateTokens(text))
}

function selectTokenCounter(deps) {
    const context = resolveContext(deps?.getContext)
    if (typeof deps?.getTokenCountAsync === "function") return deps.getTokenCountAsync
    if (typeof context?.getTokenCountAsync === "function") return context.getTokenCountAsync
    if (typeof globalThis?.getTokenCountAsync === "function") return globalThis.getTokenCountAsync
    if (typeof deps?.getTokenCount === "function") return deps.getTokenCount
    if (typeof context?.getTokenCount === "function") return context.getTokenCount
    if (typeof globalThis?.getTokenCount === "function") return globalThis.getTokenCount
    return null
}

function normalizeTokenCount(value) {
    const numeric = Number(value)
    if (Number.isFinite(numeric) && numeric >= 0) return numeric
    return null
}

export function normalizeTokenText(value) {
    if (value === null || value === undefined) return ""
    if (typeof value === "string") return value
    if (Array.isArray(value)) return value.join("\n\n")
    return String(value)
}

export function estimateTokens(value) {
    if (!value) return 0
    const text = typeof value === "string" ? value : String(value)
    if (!text.trim()) return 0
    return Math.max(0, Math.ceil(text.length / 4))
}

export { TOKEN_LOADING, TOKEN_PLACEHOLDER }
