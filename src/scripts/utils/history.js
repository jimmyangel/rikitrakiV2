// ---------------------------------------------
// Encode internal state → URL + history state
// ---------------------------------------------
export function encodeState({ trackId, center }) {
	const url = new URL(window.location.href)

    if (trackId) {
        // TRACK MODE → center is irrelevant
        url.searchParams.set('trackId', trackId)
        url.searchParams.delete('lat')
        url.searchParams.delete('lon')

        return {
            url,
            state: { trackId, center: null }
        }
    }

    // WORLD MODE
    url.searchParams.delete('trackId')

    if (center) {
        url.searchParams.set('lat', center.lat)
        url.searchParams.set('lon', center.lon)
    } else {
        url.searchParams.delete('lat')
        url.searchParams.delete('lon')
    }

    return {
        url,
        state: { trackId: null, center }
    }
}

// ---------------------------------------------
// Decode URL → internal state
// ---------------------------------------------
export function decodeState() {
	const url = new URL(window.location.href)

    const trackId = url.searchParams.get('trackId')
    if (trackId) {
        return { trackId, center: null }
    }

    const lat = url.searchParams.get('lat')
    const lon = url.searchParams.get('lon')

    if (lat && lon) {
        return { trackId: null, center: { lat: +lat, lon: +lon } }
    }

    return { trackId: null, center: null }
}

export function pushHistory(raw) {
    const { url, state } = encodeState(raw)
    history.pushState(state, '', url)
}

export function replaceHistory(raw) {
    const { url, state } = encodeState(raw)
    history.replaceState(state, '', url)
}

// Read initial state from the URL on page load
export function initFromUrl() {
	const url = new URL(window.location.href)

    const trackId = url.searchParams.get('trackId')
    return { trackId }
}

export function setUsernamePath(username) {
    const raw = decodeState()
    const { url } = encodeState(raw)

    url.pathname = username ? `/${username}` : '/'

    history.pushState(raw, '', url)

    // Trigger your existing popstate-driven re-init
    window.dispatchEvent(new PopStateEvent('popstate', { state: raw }))
}

