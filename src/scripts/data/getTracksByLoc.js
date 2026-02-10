import { constants } from '../config.js'

export async function getTracksByLoc({ lat, lon, username = null }) {
    const params = new URLSearchParams({
        lat: String(lat),
        lon: String(lon)
    })

    if (username) {
        params.set('username', username)
    }

    const url = `${constants.APIV2_BASE_URL}/loctracks?${params}`

    const res = await fetch(url)
    if (!res.ok) {
        throw new Error(`getTracksByLoc failed: ${res.status} ${res.statusText}`)
    }

    return await res.json()
}
