import { getTrackInfo } from './getTrackInfo.js'
import { haversineKm } from '../utils/geoUtils.js'

export async function getTracksByLoc({ lat, lon, username = null, maxTracksTarget = 200, minTracksTarget = 10, maxRadius = 500 }) {

    const filter = username ? JSON.stringify({ username }) : null

    const all = await getTrackInfo(filter)

    const allTracks = Object.values(all.tracks)

    const withDist = allTracks.map(t => {
        const [tLat, tLon] = t.trackLatLng
        return {
            ...t,
            distKm: haversineKm(lat, lon, tLat, tLon)
        }
    })

    withDist.sort((a, b) => a.distKm - b.distKm)

    const withinMaxRadius = withDist.filter(t => t.distKm <= maxRadius)

    let selected = []

    if (withinMaxRadius.length >= minTracksTarget) {
        selected = withinMaxRadius.slice(0, maxTracksTarget)
    } else {
        selected = withDist.slice(0, minTracksTarget)
    }

    const radiusKm = selected.length
        ? selected[selected.length - 1].distKm
        : 0

    return {
        center: { lat, lon },
        radiusKm,
        count: selected.length,
        tracks: selected
    }
}
