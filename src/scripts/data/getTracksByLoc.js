import { getTrackInfo } from './getTrackInfo.js'
import { haversineKm } from '../utils/geoUtils.js'

export async function getTracksByLoc(lat, lon, maxTracksTarget = 200, minTracksTarget = 10, maxRadius = 500) {
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

    //
    // 5. Determine radius and selection
    //
    const withinMaxRadius = withDist.filter(t => t.distKm <= maxRadius)

    let selected = []

    if (withinMaxRadius.length >= minTracksTarget) {
        // Case A: Enough tracks within maxRadius
        // Take up to maxTracksTarget, but only those within maxRadius
        selected = withinMaxRadius.slice(0, maxTracksTarget)
    } else {
        // Case B: Not enough tracks within maxRadius
        // We are allowed to exceed maxRadius, but only until we reach minTracksTarget
        selected = withDist.slice(0, minTracksTarget)
    }

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
