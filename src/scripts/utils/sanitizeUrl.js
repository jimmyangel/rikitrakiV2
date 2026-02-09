export function sanitizeUrl() {
    const url = new URL(window.location.href)
    let changed = false

    let lat = null
    let lon = null

    const latParam = url.searchParams.get('lat')
    const lonParam = url.searchParams.get('lon')

    // Validate lat
    if (latParam !== null) {
        const n = parseFloat(latParam)
        if (Number.isFinite(n) && n >= -90 && n <= 90) {
            lat = n
        } else {
            lat = null
        }
    }

    // Validate lon
    if (lonParam !== null) {
        const n = parseFloat(lonParam)
        if (Number.isFinite(n) && n >= -180 && n <= 180) {
            lon = n
        } else {
            lon = null
        }
    }

    // If either is invalid → both invalid
    if (lat === null || lon === null) {
        if (url.searchParams.has('lat') || url.searchParams.has('lon')) {
            url.searchParams.delete('lat')
            url.searchParams.delete('lon')
            changed = true
        }
        lat = null
        lon = null
    }

    // Validate trackId
    const trackId = url.searchParams.get('trackId')
    if (trackId !== null && trackId.trim() === '') {
        url.searchParams.delete('trackId')
        changed = true
    }

    // Canonical rule: trackId cannot coexist with lat/lon
    if (trackId !== null) {
        if (url.searchParams.has('lat') || url.searchParams.has('lon')) {
            url.searchParams.delete('lat')
            url.searchParams.delete('lon')
            changed = true
        }
        lat = null
        lon = null
    }

    if (!changed) {
        return { lat, lon, trackId }
    }

    history.replaceState(null, '', url)

    return {
        lat: url.searchParams.get('lat') ? parseFloat(url.searchParams.get('lat')) : null,
        lon: url.searchParams.get('lon') ? parseFloat(url.searchParams.get('lon')) : null,
        trackId: url.searchParams.get('trackId')
    }
}
