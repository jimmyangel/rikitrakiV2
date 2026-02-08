// Update the URL + push a new history entry
export function setTrackHistory(trackId) {
    const url = new URL(window.location)

    if (trackId) {
        url.searchParams.set('trackId', trackId)
    } else {
        url.searchParams.delete('trackId')
    }

    history.pushState({ trackId }, '', url)
}

// Read initial state from the URL on page load
export function initFromUrl() {
    const url = new URL(window.location)
    const trackId = url.searchParams.get('trackId')
    return { trackId }
}
