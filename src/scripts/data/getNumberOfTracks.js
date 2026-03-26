import { constants } from '../config.js'

const DEFAULT_TTL = 60 * 60 * 1000 // 1 hour

export async function getNumberOfTracks({ username = null, ttl = DEFAULT_TTL } = {}) {
    const key = username
        ? `numTracks_user_${username}`
        : `numTracks_global`

    // Try cache
    const cached = sessionStorage.getItem(key)
    if (cached) {
        try {
            const entry = JSON.parse(cached)
            const age = Date.now() - entry.time
            if (age < ttl) {
                return entry.data
            }
        } catch (_) {
            // ignore corrupted cache
        }
    }

    const params = new URLSearchParams()

    if (username) {
        const filter = { username }
        params.set('filter', JSON.stringify(filter))
    }

    const baseUrl = `${constants.APIV2_BASE_URL}/tracks/number`
    const url = params.toString()
        ? `${baseUrl}?${params.toString()}`
        : baseUrl

    const res = await fetch(url)
    if (!res.ok) {
        throw new Error(`getNumberOfTracks failed: ${res.status} ${res.statusText}`)
    }

    const data = await res.json()

    sessionStorage.setItem(key, JSON.stringify({
        time: Date.now(),
        data
    }))

    return data
}
