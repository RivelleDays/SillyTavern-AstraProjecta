import * as React from "react"
import {
  ArrowDown as ArrowDownIcon,
  ArrowUp as ArrowUpIcon,
  Braces as BracesIcon,
  CaseSensitive as CaseSensitiveIcon,
  Eye as EyeIcon,
  FileCode as FileCodeIcon,
  Regex as RegexIcon,
  Replace as ReplaceIcon,
  ReplaceAll as ReplaceAllIcon,
  Search as SearchIcon,
  WholeWord as WholeWordIcon
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Toggle } from "@/components/ui/toggle"
import { cn } from "@/lib/utils"

import { EditorState } from "@codemirror/state"
import { history as cmHistory, defaultKeymap, historyKeymap, insertTab } from "@codemirror/commands"
import {
  EditorView,
  drawSelection,
  dropCursor,
  highlightActiveLine,
  highlightSpecialChars,
  keymap,
  placeholder as cmPlaceholder
} from "@codemirror/view"
import { indentOnInput, syntaxHighlighting, defaultHighlightStyle, bracketMatching } from "@codemirror/language"
import { closeBrackets, closeBracketsKeymap } from "@codemirror/autocomplete"
import {
  SearchQuery,
  findNext,
  findPrevious,
  highlightSelectionMatches,
  replaceAll,
  replaceNext,
  search as cmSearch,
  setSearchQuery
} from "@codemirror/search"

import {
  TokenizedPreview,
  TOKEN_LOADING,
  TOKEN_PLACEHOLDER,
  useTokenCount,
  normalizeTokenText
} from "./richTextEditorShared"

export function RichTextEditorCodemirror({
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
  const isCodeMirrorActive = editable && effectiveMode === "edit"
  const isDisplayMode = !isCodeMirrorActive && !isPreviewMode

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
      data-astra-component="RichTextEditorCodemirror"
      data-has-footer={showFooter ? "true" : "false"}>
      {isCodeMirrorActive ? (
        <TokenizedEditor
          value={normalizedValue}
          onValueChange={handleValueChange}
          placeholder={placeholder}
          textareaClassName={textareaClassName}
        />
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

function TokenizedEditor({
  value,
  onValueChange,
  placeholder,
  textareaClassName
}) {
  const findInputRef = React.useRef(null)
  const codeMirrorHostRef = React.useRef(null)
  const codeMirrorViewRef = React.useRef(null)
  const latestDisplayValueRef = React.useRef(normalizeTokenText(value))
  const [isSearchOpen, setIsSearchOpen] = React.useState(false)
  const [findText, setFindText] = React.useState("")
  const [replaceText, setReplaceText] = React.useState("")
  const [isCaseSensitive, setIsCaseSensitive] = React.useState(false)
  const [useRegexSearch, setUseRegexSearch] = React.useState(false)
  const [useWholeWord, setUseWholeWord] = React.useState(false)
  const [matchInfo, setMatchInfo] = React.useState({ current: 0, total: 0 })
  const searchStateRef = React.useRef({
    findText: "",
    isCaseSensitive: false,
    useRegexSearch: false,
    useWholeWord: false
  })

  latestDisplayValueRef.current = normalizeTokenText(value)

  React.useEffect(() => {
    searchStateRef.current = { findText, isCaseSensitive, useRegexSearch, useWholeWord }
  }, [findText, isCaseSensitive, useRegexSearch, useWholeWord])

  const createSearchQuery = React.useCallback(
    searchValue => {
      const state = searchStateRef.current
      const search = searchValue !== undefined ? searchValue : state.findText
      return new SearchQuery({
        search: search || "",
        caseSensitive: state.isCaseSensitive,
        regexp: state.useRegexSearch,
        wholeWord: state.useWholeWord,
        literal: !state.useRegexSearch
      })
    },
    []
  )

  const updateMatches = React.useCallback(
    (view, query = createSearchQuery()) => {
      if (!view) return
      const isRegexSearch = Boolean(query.regexp)
      if (!query.search || (isRegexSearch && !query.valid)) {
        setMatchInfo({ current: 0, total: 0 })
        return
      }
      const cursor = query.getCursor(view.state.doc)
      const results = []
      for (let res = cursor.next(); !res.done; res = cursor.next()) {
        results.push(res.value)
      }
      const total = results.length
      if (!total) {
        setMatchInfo({ current: 0, total: 0 })
        return
      }
      const selectionPos = view.state.selection.main.head
      let currentIndex = results.findIndex(match => match.from >= selectionPos)
      if (currentIndex === -1) currentIndex = 0
      setMatchInfo({ current: currentIndex + 1, total })
    },
    [createSearchQuery]
  )

  const handleValueChange = React.useCallback(
    nextValue => {
      const normalized = normalizeTokenText(nextValue)
      if (typeof onValueChange === "function") {
        onValueChange(normalized)
      }
    },
    [onValueChange]
  )

  const runSearchCommand = React.useCallback((command, opts = {}) => {
    const view = codeMirrorViewRef.current
    if (!view) return
    command(view)
    if (opts.syncMatches !== false) {
      requestAnimationFrame(() => updateMatches(view))
    }
  }, [updateMatches])

  const handleFindNext = React.useCallback(() => {
    if (!findText) {
      setMatchInfo({ current: 0, total: 0 })
      return
    }
    const query = createSearchQuery()
    if (query.regexp && !query.valid) {
      setMatchInfo({ current: 0, total: 0 })
      return
    }
    runSearchCommand(findNext)
  }, [createSearchQuery, findText, runSearchCommand])

  const handleFindPrev = React.useCallback(() => {
    if (!findText) {
      setMatchInfo({ current: 0, total: 0 })
      return
    }
    const query = createSearchQuery()
    if (query.regexp && !query.valid) {
      setMatchInfo({ current: 0, total: 0 })
      return
    }
    runSearchCommand(findPrevious)
  }, [createSearchQuery, findText, runSearchCommand])

  const handleFindAll = React.useCallback(() => {
    const view = codeMirrorViewRef.current
    if (!view) return
    const query = createSearchQuery()
    if (!findText || (query.regexp && !query.valid)) {
      updateMatches(view, createSearchQuery(""))
      return
    }
    view.dispatch({
      selection: { anchor: 0, head: 0 },
      userEvent: "select.search"
    })
    findNext(view)
    requestAnimationFrame(() => updateMatches(view))
    view.focus()
  }, [createSearchQuery, findText, updateMatches])

  const handleReplace = React.useCallback(() => {
    const query = createSearchQuery()
    if (!findText || (query.regexp && !query.valid)) {
      setMatchInfo({ current: 0, total: 0 })
      return
    }
    runSearchCommand(view => replaceNext(view, replaceText))
  }, [createSearchQuery, findText, replaceText, runSearchCommand])

  const handleReplaceAll = React.useCallback(() => {
    const query = createSearchQuery()
    if (!findText || (query.regexp && !query.valid)) {
      setMatchInfo({ current: 0, total: 0 })
      return
    }
    runSearchCommand(view => replaceAll(view, replaceText))
  }, [createSearchQuery, findText, replaceText, runSearchCommand])

  React.useEffect(() => {
    const host = codeMirrorHostRef.current
    if (!host) return undefined

    const extensions = [
      cmSearch(),
      cmHistory(),
      drawSelection(),
      dropCursor(),
      highlightActiveLine(),
      highlightSpecialChars(),
      EditorState.allowMultipleSelections.of(true),
      indentOnInput(),
      syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
      bracketMatching(),
      closeBrackets(),
      highlightSelectionMatches(),
      keymap.of([
        ...closeBracketsKeymap,
        ...defaultKeymap,
        ...historyKeymap,
        { key: "Tab", run: insertTab }
      ]),
      EditorView.lineWrapping,
      EditorView.updateListener.of(update => {
        if (update.docChanged) {
          const nextDoc = update.state.doc.toString()
          handleValueChange(nextDoc)
        }
        if (update.docChanged || update.selectionSet) {
          const currentView = update.view || codeMirrorViewRef.current
          updateMatches(currentView, createSearchQuery())
        }
      })
    ]

    if (placeholder) {
      extensions.push(cmPlaceholder(placeholder))
    }

    const view = new EditorView({
      doc: latestDisplayValueRef.current,
      extensions,
      parent: host
    })

    codeMirrorViewRef.current = view
    updateMatches(view, createSearchQuery())

    return () => {
      view.destroy()
      codeMirrorViewRef.current = null
      setIsSearchOpen(false)
    }
  }, [createSearchQuery, handleValueChange, placeholder, updateMatches])

  React.useEffect(() => {
    const view = codeMirrorViewRef.current
    if (!view) return
    const normalized = normalizeTokenText(value)
    const currentDoc = view.state.doc.toString()
    if (normalized === currentDoc) return
    const currentSelection = view.state.selection.main
    const clampedAnchor = Math.min(currentSelection.anchor, normalized.length)
    const clampedHead = Math.min(currentSelection.head, normalized.length)
    view.dispatch({
      changes: { from: 0, to: currentDoc.length, insert: normalized },
      selection: { anchor: clampedAnchor, head: clampedHead }
    })
  }, [value])

  React.useEffect(() => {
    const view = codeMirrorViewRef.current
    if (!view) return
    const query = createSearchQuery()
    if (query.regexp && !query.valid) {
      view.dispatch({ effects: setSearchQuery.of(query) })
      setMatchInfo({ current: 0, total: 0 })
      return
    }
    view.dispatch({ effects: setSearchQuery.of(query) })
    updateMatches(view, query)
  }, [createSearchQuery, findText, isCaseSensitive, useRegexSearch, useWholeWord, updateMatches])

  const toggleSearch = React.useCallback(() => {
    setIsSearchOpen(prev => !prev)
  }, [])

  React.useEffect(() => {
    if (!isSearchOpen) return
    requestAnimationFrame(() => {
      findInputRef.current?.focus()
      findInputRef.current?.select?.()
    })
  }, [isSearchOpen])

  return (
    <>
      <div className="astra-tokenized-textarea__toolbar">
        <ToolbarButton
          icon={SearchIcon}
          label="Find & Replace"
          onClick={toggleSearch}
          active={isSearchOpen}
          className="astra-tokenized-textarea__toolbarButton--search" />
      </div>

      <div
        className="astra-tokenized-textarea__search"
        data-state={isSearchOpen ? "open" : "closed"}
        aria-hidden={isSearchOpen ? "false" : "true"}>
        <div className="astra-tokenized-textarea__searchFields">
          <div className="astra-tokenized-textarea__searchRow">
            <div className="astra-tokenized-textarea__searchField">
              <div className="astra-tokenized-textarea__searchControl">
                <div className="astra-tokenized-textarea__searchInputShell">
                  <SearchIcon size={14} aria-hidden="true" className="astra-tokenized-textarea__searchIcon" />
                  <Input
                    ref={findInputRef}
                    className="astra-tokenized-textarea__searchInput"
                    placeholder="Find..."
                    aria-label="Find"
                    value={findText}
                    onChange={event => setFindText(event.target.value)}
                    tabIndex={isSearchOpen ? undefined : -1}
                  />
                  {findText ? (
                    <span className="astra-tokenized-textarea__searchCount">
                      {matchInfo.current}/{matchInfo.total || 0}
                    </span>
                  ) : null}
                </div>
                <div className="astra-tokenized-textarea__searchOptions" role="group" aria-label="Search options">
                  <Toggle
                    aria-label="Match case"
                    size="sm"
                    className="astra-tokenized-textarea__searchToggle"
                    pressed={isCaseSensitive}
                    onPressedChange={value => setIsCaseSensitive(Boolean(value))}
                    tabIndex={isSearchOpen ? undefined : -1}>
                    <CaseSensitiveIcon size={16} aria-hidden="true" />
                  </Toggle>
                  <Toggle
                    aria-label="Use regular expression"
                    size="sm"
                    className="astra-tokenized-textarea__searchToggle"
                    pressed={useRegexSearch}
                    onPressedChange={value => setUseRegexSearch(Boolean(value))}
                    tabIndex={isSearchOpen ? undefined : -1}>
                    <RegexIcon size={16} aria-hidden="true" />
                  </Toggle>
                  <Toggle
                    aria-label="Whole word"
                    size="sm"
                    className="astra-tokenized-textarea__searchToggle"
                    pressed={useWholeWord}
                    onPressedChange={value => setUseWholeWord(Boolean(value))}
                    tabIndex={isSearchOpen ? undefined : -1}>
                    <WholeWordIcon size={16} aria-hidden="true" />
                  </Toggle>
                </div>
              </div>
            </div>

            <div className="astra-tokenized-textarea__searchActions">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="astra-tokenized-textarea__searchActionButton"
                onClick={handleFindAll}
                aria-label="Jump to first match"
                tabIndex={isSearchOpen ? undefined : -1}>
                <SearchIcon size={14} aria-hidden="true" />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="astra-tokenized-textarea__searchActionButton"
                onClick={handleFindPrev}
                aria-label="Previous match"
                tabIndex={isSearchOpen ? undefined : -1}>
                <ArrowUpIcon size={14} aria-hidden="true" />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="astra-tokenized-textarea__searchActionButton"
                onClick={handleFindNext}
                aria-label="Next match"
                tabIndex={isSearchOpen ? undefined : -1}>
                <ArrowDownIcon size={14} aria-hidden="true" />
              </Button>
            </div>
          </div>

          <div className="astra-tokenized-textarea__searchRow astra-tokenized-textarea__searchRow--replace">
            <div className="astra-tokenized-textarea__searchField">
              <div className="astra-tokenized-textarea__searchControl">
                <div className="astra-tokenized-textarea__searchInputShell">
                  <ReplaceIcon size={14} aria-hidden="true" className="astra-tokenized-textarea__searchIcon" />
                  <Input
                    className="astra-tokenized-textarea__searchInput"
                    placeholder="Replace..."
                    aria-label="Replace"
                    value={replaceText}
                    onChange={event => setReplaceText(event.target.value)}
                    tabIndex={isSearchOpen ? undefined : -1}
                  />
                </div>
              </div>
            </div>

            <div className="astra-tokenized-textarea__searchActions">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="astra-tokenized-textarea__searchActionButton"
                onClick={handleReplace}
                aria-label="Replace match"
                tabIndex={isSearchOpen ? undefined : -1}>
                <ReplaceIcon size={14} aria-hidden="true" />
                <span className="astra-tokenized-textarea__searchActionLabel">Replace</span>
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="astra-tokenized-textarea__searchActionButton"
                onClick={handleReplaceAll}
                aria-label="Replace all matches"
                tabIndex={isSearchOpen ? undefined : -1}>
                <ReplaceAllIcon size={14} aria-hidden="true" />
                <span className="astra-tokenized-textarea__searchActionLabel">Replace all</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="astra-tokenized-textarea__inputShell">
        <div
          ref={codeMirrorHostRef}
          className={cn("astra-tokenized-textarea__codemirror", textareaClassName)}
          data-state="active" />
      </div>
    </>
  )
}

function ToolbarButton({ icon: Icon, label, active, disabled, size = "md", className, onClick }) {
  return (
    <button
      type="button"
      className={cn(
        "astra-tokenized-textarea__toolbarButton",
        active ? "is-active" : "",
        size === "sm" ? "is-small" : "",
        disabled ? "is-disabled" : "",
        className
      )}
      aria-label={label}
      aria-pressed={active ? "true" : "false"}
      disabled={disabled}
      onClick={onClick}>
      <Icon size={16} aria-hidden="true" />
    </button>
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
