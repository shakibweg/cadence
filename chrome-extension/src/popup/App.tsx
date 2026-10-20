import { useState, useEffect } from 'react'
import {
  Captions,
  Languages,
  ArrowUpRight,
  KeyRound,
  Check,
  Loader2,
  ExternalLink,
  Cpu,
  ArrowLeft,
  ChevronRight,
} from 'lucide-react'
import {
  SUPPORTED_LANGUAGES,
  getStoredTargetLanguage,
  loadStoredTargetLanguageAsync,
  saveStoredTargetLanguage,
  APIFY_TOKEN_URL,
  getApifyToken,
  saveApifyToken,
  clearApifyToken,
  verifyApifyToken,
  GEMINI_KEY_URL,
  GEMINI_AVAILABLE_MODELS,
  GEMINI_ROUTED_MODELS,
  getGeminiApiKey,
  saveGeminiApiKey,
  clearGeminiApiKey,
  getEnabledGeminiModels,
  saveEnabledGeminiModels,
  verifyGeminiApiKey,
} from '../content/transcriptService'
import { EVENTS } from '../shared/constants/index.ts'
import './App.css'

type Status = { type: 'success' | 'error'; message: string } | null

interface SecretFieldProps {
  id: string
  label: string
  placeholder: string
  helpUrl: string
  savedValue: string
  verify: (value: string) => Promise<{ valid: boolean; error?: string; username?: string }>
  onSave: (value: string) => Promise<void>
  onRemove: () => Promise<void>
}

/** Compact "paste a key, verify, save" row used for both API credentials. */
function SecretField({ id, label, placeholder, helpUrl, savedValue, verify, onSave, onRemove }: SecretFieldProps) {
  const [value, setValue] = useState<string>(savedValue)
  const [busy, setBusy] = useState<boolean>(false)
  const [status, setStatus] = useState<Status>(null)

  useEffect(() => {
    setValue(savedValue)
  }, [savedValue])

  const openHelp = () => {
    if (typeof chrome !== 'undefined' && chrome.tabs?.create) {
      chrome.tabs.create({ url: helpUrl })
    } else {
      window.open(helpUrl, '_blank')
    }
  }

  const handleSave = async () => {
    const trimmed = value.trim()
    if (!trimmed) {
      setStatus({ type: 'error', message: 'Paste your key first.' })
      return
    }
    setBusy(true)
    setStatus(null)
    const result = await verify(trimmed)
    if (result.valid) {
      await onSave(trimmed)
      setStatus({ type: 'success', message: result.username ? `Connected as ${result.username}` : 'Saved' })
    } else {
      setStatus({ type: 'error', message: result.error || 'Invalid key.' })
    }
    setBusy(false)
  }

  const handleRemove = async () => {
    await onRemove()
    setValue('')
    setStatus(null)
  }

  // When a key/token is already saved, show only the label and Remove button (no input dots, check button, or Saved text)
  if (savedValue) {
    return (
      <div className="popup-field">
        <div className="popup-saved-row">
          <div className="popup-saved-left">
            <KeyRound size={13} className="popup-saved-icon" />
            <span className="popup-saved-label">{label}</span>
          </div>
          <button
            type="button"
            className="popup-btn-remove"
            onClick={handleRemove}
            title={`Remove ${label}`}
          >
            Remove
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="popup-field">
      <div className="popup-label-row">
        <label htmlFor={id} className="popup-label">
          <KeyRound size={12} />
          <span>{label}</span>
        </label>
        <button type="button" className="popup-link" onClick={openHelp}>
          Get key <ExternalLink size={10} />
        </button>
      </div>
      <div className="popup-input-row">
        <input
          id={id}
          className="popup-input"
          type="password"
          placeholder={placeholder}
          value={value}
          autoComplete="off"
          spellCheck={false}
          onChange={(e) => {
            setValue(e.target.value)
            if (status) setStatus(null)
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSave()
          }}
        />
        <button
          type="button"
          className="popup-icon-btn"
          onClick={handleSave}
          disabled={busy}
          title="Verify and save"
          aria-label={`Verify and save ${label}`}
        >
          {busy ? <Loader2 size={13} className="popup-spin" /> : <Check size={13} />}
        </button>
      </div>
      {status && <div className={`popup-hint ${status.type}`}>{status.message}</div>}
    </div>
  )
}

export default function App() {
  const [targetLang, setTargetLang] = useState<string>(() => getStoredTargetLanguage())
  const [isYouTubeTab, setIsYouTubeTab] = useState<boolean>(false)
  const [activeTabId, setActiveTabId] = useState<number | null>(null)
  const [apifyToken, setApifyToken] = useState<string>('')
  const [geminiKey, setGeminiKey] = useState<string>('')
  const [enabledModels, setEnabledModels] = useState<string[]>(() => [...GEMINI_ROUTED_MODELS])
  const [currentView, setCurrentView] = useState<'main' | 'modelRouting'>('main')

  useEffect(() => {
    loadStoredTargetLanguageAsync().then((lang) => {
      if (lang) setTargetLang(lang)
    })
    getApifyToken().then(setApifyToken)
    getGeminiApiKey().then(setGeminiKey)
    getEnabledGeminiModels().then(setEnabledModels)

    if (typeof chrome !== 'undefined' && chrome.tabs?.query) {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const tab = tabs[0]
        setIsYouTubeTab((tab?.url || '').includes('youtube.com'))
        if (tab?.id) setActiveTabId(tab.id)
      })
    }
  }, [])

  const handleLangChange = (newLang: string) => {
    setTargetLang(newLang)
    saveStoredTargetLanguage(newLang)
  }

  const handleToggleModel = (modelId: string) => {
    const next = enabledModels.includes(modelId)
      ? enabledModels.filter((id) => id !== modelId)
      : [...enabledModels, modelId]
    setEnabledModels(next)
    saveEnabledGeminiModels(next)
  }

  const handleSelectAll = () => {
    setEnabledModels([...GEMINI_ROUTED_MODELS])
    saveEnabledGeminiModels([...GEMINI_ROUTED_MODELS])
  }

  const handleDeselectAll = () => {
    setEnabledModels([])
    saveEnabledGeminiModels([])
  }

  const toggleTranscriptOnPage = () => {
    if (typeof chrome !== 'undefined' && activeTabId && chrome.scripting) {
      chrome.scripting.executeScript({
        target: { tabId: activeTabId },
        world: 'MAIN',
        args: [EVENTS.panelToggle],
        func: (eventName: string) => {
          window.dispatchEvent(
            new CustomEvent(eventName, {
              detail: { isOpen: true },
            })
          )
        },
      })
    }
  }

  // Sub-view: Model Routing configuration
  if (currentView === 'modelRouting') {
    return (
      <div className="cadence-popup">
        <header className="popup-sub-header">
          <button
            type="button"
            className="popup-sub-back-btn"
            onClick={() => setCurrentView('main')}
            aria-label="Back to main settings"
          >
            <ArrowLeft size={14} />
            <span>Back</span>
          </button>
          <span className="popup-sub-title">Model Routing</span>
          <button
            type="button"
            className="popup-link"
            style={{ fontWeight: 500 }}
            onClick={() => setCurrentView('main')}
          >
            Done
          </button>
        </header>

        <main className="popup-body" style={{ padding: '10px 14px 14px 14px' }}>
          <div className="popup-sub-desc">
            Choose which Gemini models the automatic router can use. If an active model hits rate limits (429) or temporary server errors, Cadence automatically falls back to the next active model in sequence.
          </div>

          <div className="popup-router-toolbar">
            <span className="popup-router-counter">
              {enabledModels.length} of {GEMINI_AVAILABLE_MODELS.length} active
            </span>
            <div className="popup-router-batch-actions">
              <button
                type="button"
                className="popup-link"
                onClick={handleSelectAll}
                disabled={enabledModels.length === GEMINI_AVAILABLE_MODELS.length}
              >
                Select All
              </button>
              <span className="popup-separator">•</span>
              <button
                type="button"
                className="popup-link"
                onClick={handleDeselectAll}
                disabled={enabledModels.length === 0}
              >
                Deselect All
              </button>
            </div>
          </div>

          <div className="popup-model-router-list">
            {GEMINI_AVAILABLE_MODELS.map((model, index) => {
              const isChecked = enabledModels.includes(model.id)
              return (
                <label
                  key={model.id}
                  className={`popup-model-card ${isChecked ? 'enabled' : 'disabled'}`}
                >
                  <div className="popup-model-card-left">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => handleToggleModel(model.id)}
                    />
                    <span className="popup-model-name">{model.name}</span>
                  </div>
                  <span className="popup-model-priority">Priority #{index + 1}</span>
                </label>
              )
            })}
          </div>
        </main>
      </div>
    )
  }

  // Main View
  return (
    <div className="cadence-popup">
      <header className="popup-header">
        <div className="popup-brand">
          <Captions size={16} className="popup-brand-icon" />
          <span className="popup-brand-title">Cadence</span>
        </div>
        {isYouTubeTab && (
          <button type="button" className="popup-action" onClick={toggleTranscriptOnPage}>
            <span>Open transcript</span>
            <ArrowUpRight size={12} />
          </button>
        )}
      </header>

      <main className="popup-body">
        <section className="popup-section" aria-labelledby="sec-translation">
          <h2 id="sec-translation" className="popup-section-title">
            Translation
          </h2>

          <div className="popup-field">
            <label htmlFor="pref-lang" className="popup-label">
              <Languages size={12} />
              <span>Language</span>
            </label>
            <select
              id="pref-lang"
              className="popup-select"
              value={targetLang}
              onChange={(e) => handleLangChange(e.target.value)}
            >
              {SUPPORTED_LANGUAGES.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.name}
                </option>
              ))}
            </select>
          </div>
        </section>

        <section className="popup-section" aria-labelledby="sec-keys">
          <h2 id="sec-keys" className="popup-section-title">
            API keys
          </h2>
          <SecretField
            id="gemini-key"
            label="Gemini API key"
            placeholder="AIza..."
            helpUrl={GEMINI_KEY_URL}
            savedValue={geminiKey}
            verify={verifyGeminiApiKey}
            onSave={async (key) => {
              await saveGeminiApiKey(key)
              setGeminiKey(key)
            }}
            onRemove={async () => {
              await clearGeminiApiKey()
              setGeminiKey('')
            }}
          />

          {/* Model Routing Navigation Row */}
          <div className="popup-field" style={{ marginTop: '2px' }}>
            <div className="popup-label-row">
              <label className="popup-label">
                <Cpu size={12} />
                <span>Model Routing</span>
              </label>
            </div>
            <div
              className="popup-routing-row"
              onClick={() => setCurrentView('modelRouting')}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') setCurrentView('modelRouting')
              }}
            >
              <div className="popup-routing-left">
                <span className="popup-routing-status">
                  {enabledModels.length} of {GEMINI_AVAILABLE_MODELS.length} models active
                </span>
              </div>
              <div className="popup-routing-right">
                <span className="popup-routing-btn-text">Configure</span>
                <ChevronRight size={13} className="popup-routing-arrow" />
              </div>
            </div>
            <div className="popup-hint">
              Auto-routes between active models if rate limits or errors occur.
            </div>
          </div>

          <SecretField
            id="apify-token"
            label="Apify API token"
            placeholder="apify_api_..."
            helpUrl={APIFY_TOKEN_URL}
            savedValue={apifyToken}
            verify={verifyApifyToken}
            onSave={async (token) => {
              await saveApifyToken(token)
              setApifyToken(token)
            }}
            onRemove={async () => {
              await clearApifyToken()
              setApifyToken('')
            }}
          />
        </section>
      </main>
    </div>
  )
}
