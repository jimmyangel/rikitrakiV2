import { gpx } from '@tmcw/togeojson'

export function haversineKm(lat1, lon1, lat2, lon2) {
    const R = 6371 // km
    const dLat = (lat2 - lat1) * Math.PI / 180
    const dLon = (lon2 - lon1) * Math.PI / 180

    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(lat1 * Math.PI / 180) *
        Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) ** 2

    return 2 * R * Math.asin(Math.sqrt(a))
}

export async function getApproxLocation() {
    // 1. Primary: ipapi.co (most reliable)
    try {
        const res = await fetch('https://ipapi.co/json/');
        if (res.ok) {
            const data = await res.json();
            if (data && data.latitude && data.longitude) {
                return {
                    lat: data.latitude,
                    lon: data.longitude,
                    countryCode: data.country_code || 'US'
                }
            }
        }
    } catch (e) {
        console.warn('ipapi.co failed', e)
    }

    // 2. Fallback: ipwho.is (fast + simple)
    try {
        const res = await fetch('https://ipwho.is/');
        if (res.ok) {
            const data = await res.json();
            if (data && data.latitude && data.longitude) {
                return {
                    lat: data.latitude,
                    lon: data.longitude,
                    countryCode: data.country_code || 'US'
                }
            }
        }
    } catch (e) {
        console.warn('ipwho.is failed', e)
    }

    // 3. Final fallback: your default location (Portland)
    return {
        lat: 45.5152,
        lon: -122.6784,
        countryCode: 'US'
    }
}

export async function parseGPXtoGeoJSON(gpxBlob) {
    const text = await gpxBlob.text()
    const xml = new DOMParser().parseFromString(text, 'application/xml')
    return gpx(xml)
}

export function computeBounds(geojson) {
    let west = Infinity
    let south = Infinity
    let east = -Infinity
    let north = -Infinity

    for (const feature of geojson.features) {
        if (feature.geometry.type !== 'LineString') continue

        for (const [lon, lat] of feature.geometry.coordinates) {
            if (lon < west) west = lon
            if (lon > east) east = lon
            if (lat < south) south = lat
            if (lat > north) north = lat
        }
    }

    return { west, south, east, north }
}

export function extractSingleLineString(fc) {
    const out = {
        type: 'Feature',
        geometry: {
            type: 'LineString',
            coordinates: []
        },
        properties: {
            coordTimes: []
        }
    }

    // synthetic timestamp generator (10s increments)
    let synthetic = new Date(2015, 0, 1)

    function nextSynthetic() {
        const t = synthetic.toISOString()
        synthetic.setSeconds(synthetic.getSeconds() + 10)
        return t
    }

    function normalizeCoord(c) {
        if (c.length === 2) return [c[0], c[1], 0]
        if (c.length === 3 && (c[2] == null || isNaN(c[2]))) return [c[0], c[1], 0]
        return c
    }

    function isValidISO(t) {
        if (typeof t !== 'string') return false
        const d = new Date(t)
        return !isNaN(d.getTime())
    }

    function mergeSegment(coords, times) {
        for (let i = 0; i < coords.length; i++) {
            const c = normalizeCoord(coords[i])
            out.geometry.coordinates.push(c)

            const t = times && times[i]
            if (isValidISO(t)) {
                out.properties.coordTimes.push(t)
            } else {
                out.properties.coordTimes.push(nextSynthetic())
            }
        }
    }

    for (const f of fc.features) {
        if (!out.properties.time && f.properties && f.properties.time) {
            out.properties.time = f.properties.time
        }

        if (!f.geometry) continue

        if (f.geometry.type === 'LineString') {
            const coords = f.geometry.coordinates
            if (coords.length >= 2) {
                mergeSegment(coords, f.properties && f.properties.coordTimes)
            }
        }

        if (f.geometry.type === 'MultiLineString') {
            const segments = f.geometry.coordinates
            for (let i = 0; i < segments.length; i++) {
                const seg = segments[i]
                if (seg.length >= 2) {
                    const times = f.properties &&
                                  Array.isArray(f.properties.coordTimes) &&
                                  f.properties.coordTimes[i]
                    mergeSegment(seg, times)
                }
            }
        }
    }

    return out
}

export function smoothElevation3(coords) {
    if (!Array.isArray(coords) || coords.length < 3) return coords

    const out = coords.map(c => [...c])

    for (let i = 1; i < coords.length - 1; i++) {
        out[i][2] = (
            coords[i - 1][2] +
            coords[i][2] +
            coords[i + 1][2]
        ) / 3
    }

    return out
}

export function computeTrackMetrics(input) {
    // Accept FeatureCollection or Feature
    const feature = input.type === 'FeatureCollection'
        ? input.features[0]
        : input

    const coords = feature.geometry.coordinates

    // Guard: no coords or too few points
    if (!coords || coords.length < 2) {
        return {
            lengthKm: 0,
            elevationGain: 0,
            maxElevation: 0,
            minElevation: 0
        }
    }

    // Ensure elevation exists
    for (let i = 0; i < coords.length; i++) {
        if (coords[i].length < 3 || coords[i][2] == null) {
            coords[i][2] = 0
        }
    }

    // --- Legacy trailing moving average smoother ---
    const smoothElevation = new Array(coords.length)
    const WINDOW = 5

    for (let i = 0; i < coords.length; i++) {
        const w = i < WINDOW ? i + 1 : WINDOW
        let sum = 0
        for (let j = i - w + 1; j <= i; j++) {
            sum += coords[j][2]
        }
        smoothElevation[i] = sum / w
    }

    // --- Metrics ---
    let lengthKm = 0
    let elevationGain = 0

    let maxElevation = coords[0][2]
    let minElevation = coords[0][2]

    for (let i = 0; i < coords.length - 1; i++) {
        const [lon1, lat1] = coords[i]
        const [lon2, lat2] = coords[i + 1]

        // Distance in km 
        lengthKm += haversineKm(lat1, lon1, lat2, lon2)

        // Gain rule: positive delta only, using smoothed elevations
        const delta = smoothElevation[i + 1] - smoothElevation[i]
        if (delta > 0) elevationGain += delta

        // Min/max from RAW elevations
        const rawEle = coords[i][2]
        if (rawEle > maxElevation) maxElevation = rawEle
        if (rawEle < minElevation) minElevation = rawEle
    }

    // Include last point in min/max
    const lastEle = coords[coords.length - 1][2]
    if (lastEle > maxElevation) maxElevation = lastEle
    if (lastEle < minElevation) minElevation = lastEle

    return {
        lengthKm,
        elevationGain,
        maxElevation,
        minElevation
    }
}








