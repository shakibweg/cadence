// Cadence - Apify settings

export const APIFY_TOKEN_URL = 'https://console.apify.com/settings/integrations'
export const APIFY_API_BASE = 'https://api.apify.com/v2'
export const APIFY_ACTOR_ID = 'codepoetry~youtube-transcript-ai-scraper'
export const APIFY_RUN_SYNC_URL = `${APIFY_API_BASE}/acts/${APIFY_ACTOR_ID}/run-sync-get-dataset-items?clean=true`
export const APIFY_ME_URL = `${APIFY_API_BASE}/users/me`
export const APIFY_REQUEST_TIMEOUT_MS = 290_000
