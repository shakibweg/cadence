import { useState, useEffect } from 'react'
import { Captions } from 'lucide-react'
import { useYouTubeTheme } from '../hooks/useYouTubeTheme.ts'
import { isPanelOpen, setPanelOpen, togglePanelOpen, ensurePanelInjected } from '../panelState.ts'
import { DOM_IDS, EVENTS, TIMING } from '../../shared/constants/index.ts'

export default function TranscriptActionButton() {
  const theme = useYouTubeTheme()
  const [isOpen, setIsOpen] = useState<boolean>(() => isPanelOpen())

  useEffect(() => {
    const handleToggle = (e: Event) => {
      const detail = (e as CustomEvent<{ isOpen: boolean }>).detail
      if (typeof detail?.isOpen === 'boolean') {
        setIsOpen(detail.isOpen)
      }
    }

    const handleToggleClick = () => {
      const next = togglePanelOpen()
      if (next) {
        ensurePanelInjected()
      }
    }

    window.addEventListener(EVENTS.panelToggle, handleToggle)
    window.addEventListener(EVENTS.panelToggleClick, handleToggleClick)
    return () => {
      window.removeEventListener(EVENTS.panelToggle, handleToggle)
      window.removeEventListener(EVENTS.panelToggleClick, handleToggleClick)
    }
  }, [])

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const nextState = !isOpen
    setIsOpen(nextState)

    if (nextState) {
      // Guarantee panel is injected and mounted in visible container
      ensurePanelInjected()
    }
    setPanelOpen(nextState)

    if (nextState) {
      // If opening, smooth scroll to the transcript panel in the right column
      window.setTimeout(() => {
        const panel = document.getElementById(DOM_IDS.panelContainer)
        if (panel) {
          panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
          const banner = panel.querySelector<HTMLElement>('.yt-playlist-top-banner')
          if (banner) {
            banner.style.transition = 'border-color 0.3s ease, box-shadow 0.3s ease'
            banner.style.borderColor = 'var(--banner-accent, #065fd4)'
            banner.style.boxShadow = '0 0 0 2px var(--banner-accent-subtle, rgba(6, 95, 212, 0.2))'
            window.setTimeout(() => {
              banner.style.borderColor = ''
              banner.style.boxShadow = ''
            }, TIMING.panelHighlightMs)
          }
        }
      }, TIMING.panelScrollDelayMs)
    }
  }

  const tooltipText = isOpen ? 'Hide Cadence transcript' : 'Show Cadence transcript'

  return (
    <div className="yt-transcript-action-btn-container">
      <button
        type="button"
        className={`yt-transcript-action-btn ${isOpen ? 'active' : ''}`}
        data-theme={theme}
        onClick={handleClick}
        aria-label={tooltipText}
        aria-pressed={isOpen}
      >
        <Captions size={18} className="yt-transcript-action-btn-icon" />
        <span className="yt-transcript-action-btn-label">Transcript</span>
      </button>

      {/* YouTube Native Tooltip */}
      <div className="yt-transcript-native-tooltip" role="tooltip">
        {tooltipText}
      </div>
    </div>
  )
}
