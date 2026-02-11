import { constants } from '../config.js'

const DEFAULT_TTL = 60 * 60 * 1000 // 1 hour

export async function getMotd(username = null, ttl = DEFAULT_TTL) {
    const storageKey = username
        ? `motd:${username}`
        : 'motd'

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
    const base = `${constants.APIV2_BASE_URL}/usermotd`
    const url = username
        ? `${base}/${encodeURIComponent(username)}`
        : base

    const res = await fetch(url)
    if (!res.ok) {
        throw new Error(`getMotd failed: ${res.status} ${res.statusText}`)
    }

    const data = await res.json()

    // expected shape:
    // { motd: { motdTracks: [ [trackId, index, title], ... ] } }
    const motdTracks = data?.motd?.motdTracks ?? []

    // Store in sessionStorage
    sessionStorage.setItem(storageKey, JSON.stringify({
        time: Date.now(),
        data: { motdTracks }
    }))

    return { motdTracks }
}
