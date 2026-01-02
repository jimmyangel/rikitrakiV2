import { constants } from '../config.js'

const DEFAULT_TTL = 60 * 60 * 1000 // 1 hour

export async function getTrackInfo(filter = null, ttl = DEFAULT_TTL) {
    const key = filter || '__no_filter__'
    const storageKey = `trackInfo:${key}`

    // Try to read from sessionStorage
    const cached = sessionStorage.getItem(storageKey)
    if (cached) {
        try {
            const entry = JSON.parse(cached)
            const age = Date.now() - entry.time

            if (age < ttl) {
                return entry.data
            }
        } catch (_) {
            // corrupted cache, ignore
        }
    }

    // Build URL
    const params = new URLSearchParams({ proj: 'small' })
    if (filter) params.set('filter', filter)

    const url = `${constants.APIV2_BASE_URL}/tracks?${params.toString()}`

    // Fetch fresh data
    const res = await fetch(url)
    if (!res.ok) {
        throw new Error(`getTrackInfo failed: ${res.status} ${res.statusText}`)
    }

    const data = await res.json()

    // Store in sessionStorage
    sessionStorage.setItem(storageKey, JSON.stringify({
        time: Date.now(),
        data
    }))

    return data
}
