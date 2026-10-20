// Cadence - Transcript Search Bar
import React from 'react'
import { Search, X } from 'lucide-react'

interface TranscriptSearchBarProps {
  searchQuery: string
  onSearchChange: (value: string) => void
  onClearSearch: () => void
}

export const TranscriptSearchBar: React.FC<TranscriptSearchBarProps> = ({
  searchQuery,
  onSearchChange,
  onClearSearch,
}) => {
  return (
    <div className="yt-transcript-search-wrap">
      <Search size={14} className="yt-transcript-search-icon" />
      <input
        type="text"
        className="yt-transcript-search-input"
        placeholder="Search in original or translation..."
        value={searchQuery}
        onChange={(e) => onSearchChange(e.target.value)}
      />
      {searchQuery && (
        <button
          type="button"
          className="yt-transcript-search-clear"
          onClick={onClearSearch}
          aria-label="Clear search"
        >
          <X size={14} />
        </button>
      )}
    </div>
  )
}
