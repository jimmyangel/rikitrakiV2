import { getTrackInfo } from './getTrackInfo.js'
import { haversineKm } from '../utils/geoUtils.js'

export async function getTracksByLoc(lat, lon, target = 1000) {
    // 1. Fetch all tracks (temporary implementation)
    const all = await getTrackInfo()

    // 2. Convert object → array
    const allTracks = Object.values(all.tracks)

    // 3. Compute distance for each track
    const withDist = allTracks.map(t => {
        const [tLat, tLon] = t.trackLatLng
        return {
            ...t,
            distKm: haversineKm(lat, lon, tLat, tLon)
        }
    })

    // 4. Sort by distance
    withDist.sort((a, b) => a.distKm - b.distKm)

    // 5. Take closest N
    const selected = withDist.slice(0, target)

    // 6. Actual radius = distance to farthest included track
    const radiusKm = selected.length
        ? selected[selected.length - 1].distKm
        : 0

    // 7. Return stable API shape
    return {
        center: { lat, lon },
        radiusKm,
        count: selected.length,
        tracks: selected
    }
}
