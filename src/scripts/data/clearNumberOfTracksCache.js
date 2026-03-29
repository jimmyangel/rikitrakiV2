export function clearNumberOfTracksCache() {
    sessionStorage.removeItem('numTracks_global')

    for (const key of Object.keys(sessionStorage)) {
        if (key.startsWith('numTracks_user_')) {
            sessionStorage.removeItem(key)
        }
    }
}
