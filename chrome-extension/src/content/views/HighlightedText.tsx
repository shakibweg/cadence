// Cadence - Highlights search matches inside a piece of text
import { Fragment } from 'react'

/** Build the highlight regex once per query (instead of once per row per render). */
export function buildHighlightRegex(query: string): RegExp | null {
  const trimmed = query.trim()
  if (!trimmed) return null
  const escaped = trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(`(${escaped})`, 'gi')
}

interface HighlightedTextProps {
  text: string
  regex: RegExp | null
}

export default function HighlightedText({ text, regex }: HighlightedTextProps) {
  if (!regex) return <>{text}</>

  // String.split with a single capture group puts the matches at the odd indexes
  const parts = text.split(regex)
  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <mark key={i} className="yt-transcript-highlight">
            {part}
          </mark>
        ) : (
          <Fragment key={i}>{part}</Fragment>
        )
      )}
    </>
  )
}
