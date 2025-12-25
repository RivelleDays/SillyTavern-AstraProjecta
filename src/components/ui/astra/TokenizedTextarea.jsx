import * as React from "react"
import {
  Braces as BracesIcon,
  Eye as EyeIcon,
  FileCode as FileCodeIcon
} from "lucide-react"
import { cn } from "@/lib/utils"

import {
  TokenizedPreview,
  TOKEN_LOADING,
  TOKEN_PLACEHOLDER,
  useTokenCount,
  normalizeTokenText
} from "./richTextEditorShared"

export function TokenizedTextarea({
  value,
  onChange,
  onValueChange,
  placeholder,
  editable: editableProp,
  isEditing = false,
  disabled = false,
  deps,
  showTokens = true,
  countTokensWhenEmpty = false,
  emptyLabel = "Not provided.",
  className,
  textareaClassName,
  displayClassName,
  footerClassName,
  tokensClassName,
  iconClassName,
  icon: Icon = BracesIcon,
  allowViewModeToggle = false,
  mode: modeProp,
  defaultMode,
  onModeChange
}) {
  const textareaRef = React.useRef(null)
  const displayValue = value ?? ""
  const normalizedValue = normalizeTokenText(displayValue)
  const hasContent = normalizedValue === 0
    ? true
    : typeof normalizedValue === "string"
      ? normalizedValue.trim().length > 0
      : Boolean(normalizedValue)

  const editable = Boolean(editableProp ?? isEditing) && !disabled
  const allowModeToggle = editable || allowViewModeToggle
  const [internalMode, setInternalMode] = React.useState(() => modeProp ?? defaultMode ?? (editable ? "edit" : "preview"))

  React.useEffect(() => {
    if (modeProp !== undefined) return
    setInternalMode(editable ? "edit" : "preview")
  }, [editable, modeProp])

  const effectiveMode = allowModeToggle ? (modeProp ?? internalMode) : (editable ? "edit" : "display")
  const isPreviewMode = effectiveMode === "preview"
  const isInputActive = editable && effectiveMode === "edit"
  const isDisplayMode = !isInputActive && !isPreviewMode

  const resolveCssSize = React.useCallback((value, viewportHeight) => {
    if (!value) return null
    const trimmed = String(value).trim()
    if (trimmed === "none") return null
    if (trimmed.endsWith("px")) return parseFloat(trimmed)
    if (trimmed.endsWith("dvh")) {
      const numeric = parseFloat(trimmed)
      if (!Number.isFinite(numeric) || !viewportHeight) return null
      return (numeric / 100) * viewportHeight
    }
    const numeric = parseFloat(trimmed)
    return Number.isFinite(numeric) ? numeric : null
  }, [])

  const syncTextareaHeight = React.useCallback(() => {
    const node = textareaRef.current
    if (!node) return
    const root = node.closest(".astra-tokenized-textarea")
    const view = node.ownerDocument?.defaultView ?? globalThis
    const styles = view?.getComputedStyle ? view.getComputedStyle(node) : null
    const viewportHeight = view?.innerHeight ?? node.ownerDocument?.documentElement?.clientHeight ?? 0
    const minHeight = styles ? resolveCssSize(styles.getPropertyValue("--astra-tokenized-min-height"), viewportHeight) ?? 0 : 0
    const baseMaxHeight = styles ? resolveCssSize(styles.getPropertyValue("--astra-tokenized-max-height"), viewportHeight) : null
    const footerHeight = root?.dataset?.hasFooter === "true" && styles
      ? resolveCssSize(styles.getPropertyValue("--astra-tokenized-footer-height"), viewportHeight) ?? 0
      : 0
    const maxHeight = typeof baseMaxHeight === "number"
      ? Math.max(0, baseMaxHeight - footerHeight)
      : Infinity

    node.style.height = "auto"
    const nextHeight = Math.min(
      Math.max(node.scrollHeight, minHeight),
      Number.isFinite(maxHeight) ? maxHeight : node.scrollHeight
    )
    node.style.height = `${nextHeight}px`
  }, [resolveCssSize])

  React.useLayoutEffect(() => {
    if (!isInputActive) return
    syncTextareaHeight()
  }, [isInputActive, normalizedValue, syncTextareaHeight])

  const tokensEnabled = showTokens && (countTokensWhenEmpty || editable || hasContent)
  const { count, isLoading } = useTokenCount(normalizedValue, { enabled: tokensEnabled, deps })
  const tokensDisplay = !showTokens
    ? null
    : isLoading
      ? TOKEN_LOADING
      : Number.isFinite(count)
        ? `${count} tokens`
        : TOKEN_PLACEHOLDER
  const shouldShowTokens = tokensEnabled && tokensDisplay !== null

  const showFooter = allowModeToggle || shouldShowTokens
  const setMode = React.useCallback(nextMode => {
    const resolved = typeof nextMode === "function" ? nextMode(effectiveMode) : nextMode
    if (modeProp === undefined) {
      setInternalMode(resolved)
    }
    if (typeof onModeChange === "function") {
      onModeChange(resolved)
    }
  }, [effectiveMode, modeProp, onModeChange])

  const handleValueChange = React.useCallback(
    nextValue => {
      const normalized = normalizeTokenText(nextValue)
      if (typeof onValueChange === "function") {
        onValueChange(normalized)
      }
      if (typeof onChange === "function") {
        onChange({ target: { value: normalized } })
      }
    },
    [onChange, onValueChange]
  )

  const displayNode = (
    <div
      className={cn(
        "astra-tokenized-textarea__display",
        !normalizedValue && normalizedValue !== 0 ? "astra-tokenized-textarea__display--empty" : "",
        displayClassName
      )}>
      {normalizedValue || normalizedValue === 0 ? normalizedValue : emptyLabel}
    </div>
  )

  return (
    <div
      className={cn("astra-tokenized-textarea", className)}
      data-astra-component="TokenizedTextarea"
      data-has-footer={showFooter ? "true" : "false"}>
      {isInputActive ? (
        <div className="astra-tokenized-textarea__inputShell">
          <textarea
            ref={textareaRef}
            className={cn("astra-tokenized-textarea__textarea", textareaClassName)}
            placeholder={placeholder}
            value={normalizedValue}
            onChange={event => {
              handleValueChange(event?.target?.value ?? "")
              syncTextareaHeight()
            }}
            disabled={!editable}
            readOnly={!editable}
          />
        </div>
      ) : isPreviewMode ? (
        <TokenizedPreview value={normalizedValue} emptyLabel={emptyLabel} className={displayClassName} />
      ) : isDisplayMode ? (
        displayNode
      ) : null}

      {showFooter ? (
        <div
          className={cn("astra-tokenized-textarea__footer", footerClassName)}
          data-loading={isLoading ? "true" : "false"}>
          {allowModeToggle ? (
            <div className="astra-tokenized-textarea__modeToggle" role="group" aria-label="View mode">
              <ModeButton
                icon={FileCodeIcon}
                label="Raw"
                active={effectiveMode === "edit"}
                onClick={() => setMode("edit")} />
              <ModeButton
                icon={EyeIcon}
                label="Preview"
                active={effectiveMode === "preview"}
                onClick={() => setMode("preview")} />
            </div>
          ) : null}

          {shouldShowTokens ? (
            <div className={cn("astra-tokenized-textarea__tokens", tokensClassName)}>
              {Icon ? <Icon size={14} className={cn("astra-tokenized-textarea__tokensIcon", iconClassName)} aria-hidden="true" /> : null}
              {tokensDisplay}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

function ModeButton({ icon: Icon, label, active, onClick }) {
  return (
    <button
      type="button"
      className={cn("astra-tokenized-textarea__modeButton", active ? "is-active" : "")}
      onClick={onClick}
      aria-pressed={active ? "true" : "false"}>
      <Icon size={14} aria-hidden="true" />
      <span>{label}</span>
    </button>
  )
}

export { TOKEN_LOADING, TOKEN_PLACEHOLDER, TokenizedPreview, useTokenCount }
