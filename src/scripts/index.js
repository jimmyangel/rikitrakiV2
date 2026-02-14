import * as mapFrame from './ui/mapFrame'
import * as map from './mapper/map'
import { getApproxLocation } from './utils/geoUtils'
import { sanitizeUrl } from './utils/sanitizeUrl'
import { initFromUrl } from './utils/history'
import { isIOS, isChromeOniPad } from './utils/env'
import { constants } from './config'

// ------------------------------------------------------------
// Main app initialization
// ------------------------------------------------------------
export default async function initApp() {

    // UI + Map init
    mapFrame.initUI()
    map.initMap()

    const tracks = Alpine.store('tracks')
    tracks.loadingCesium = true

    // Expose map helpers globally
    window.map = {
        whenViewerReady: map.whenViewerReady,
        showMapThumbnails: map.showMapThumbnails,
        hideMapThumbnails: map.hideMapThumbnails,
        renderMapThumbnails: map.renderMapThumbnails,
        clearMapThumbnails: map.clearMapThumbnails
    }

    // Expose environment globals
    window.env = {
        isIOS,
        isChromeOniPad
    }

    window.constants = constants

    // --------------------------------------------------------
    // Determine initial center (URL → approx location fallback)
    // --------------------------------------------------------
    const { lat: urlLat, lon: urlLon } = sanitizeUrl()

    let initialLat
    let initialLon

    if (urlLat !== null && urlLon !== null) {
        initialLat = urlLat
        initialLon = urlLon
    } else {
        const approx = await getApproxLocation()
        initialLat = approx.lat
        initialLon = approx.lon
        tracks.countryCode = approx.countryCode
    }

    tracks.defaultLat = initialLat
    tracks.defaultLon = initialLon

    await tracks.setSearchCenter(initialLat, initialLon, { fromInit: true })

    // Wait for Cesium viewer
    await map.whenViewerReady()

	tracks.loadingCesium = false

    // --------------------------------------------------------
    // Restore track/world mode from URL
    // --------------------------------------------------------
    const { trackId } = initFromUrl()

    if (trackId) {
        await tracks.openTrack(trackId, { fromInit: true })
        history.replaceState({ trackId }, '')
    } else {
        history.replaceState(
            { trackId: null, center: { lat: initialLat, lon: initialLon } },
            ''
        )
    }

    // --------------------------------------------------------
    // Canonical popstate handler 
    // --------------------------------------------------------
    let lastPathname = window.location.pathname

    window.addEventListener('popstate', async e => {
        const state = e.state
        const tracks = Alpine.store('tracks')
        const currentPath = window.location.pathname

        const pathnameChanged = currentPath !== lastPathname
        lastPathname = currentPath

        // If username path changed → exit track mode
        if (pathnameChanged && tracks.activeTrackId) {
            tracks.exitActiveTrack({ fromHistory: true })
        }

        // Track mode restoration
        if (state?.trackId) {
            await tracks.openTrack(state.trackId, { fromHistory: true })
            return
        }

        // Exit track mode if needed
        if (tracks.activeTrackId) {
            tracks.exitActiveTrack({ fromHistory: true })
        }

        // Restore center
        if (state?.center) {
            await tracks.setSearchCenter(
                state.center.lat,
                state.center.lon,
                { fromHistory: true }
            )
            return
        }

        // Default center
        await tracks.setSearchCenter(
            tracks.defaultLat,
            tracks.defaultLon,
            { fromHistory: true }
        )
    })
}
