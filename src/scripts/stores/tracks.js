import * as map from '../mapper/map.js'
import { getTracksByLoc } from '../data/getTracksByLoc'
import { getMotd } from '../data/getMotd'
import { constants } from '../config.js'
import { getTrackDetails } from '../data/getTrackDetails.js'
import {
    parseGPXtoGeoJSON,
    computeBounds,
    extractSingleLineString,
    smoothElevation3,
    computeTrackMetrics,
    extractTrackDate,
    computeProfileArrays
} from '../utils/geoUtils.js'
import { buildCZMLForTrack } from '../utils/buildCZMLForTrack.js'

//
// Helpers (must be ABOVE Alpine.store)
//
function buildHaystack(track) {
    return [
        track.trackName,
        track.username,
        track.trackType,
        track.trackLevel,
        ...(track.trackRegionTags || []),
        track.trackFav ? 'favorite fav' : ''
    ]
    .join(' ')
    .toLowerCase()
}

function filterTracks(all, filter) {
    const q = filter.toLowerCase().trim()
    if (!q) return all

    const tokens = q.split(' ').filter(Boolean)

    return all.filter(track => {
        const haystack = buildHaystack(track)
        return tokens.every(token => haystack.includes(token))
    })
}

function getUsernameFromUrl() {
    const seg = window.location.pathname.split('/').filter(Boolean)
    return seg.length === 1 ? seg[0] : null
}

async function reloadTracks(store, { fly = true } = {}) {
    if (store.lat == null || store.lon == null) return

    store.loadingTracks = true

    try {
        const username = getUsernameFromUrl()

        const { tracks, radiusKm, count } =
            await getTracksByLoc({
                lat: store.lat,
                lon: store.lon,
                maxTracksTarget: 200,
                username
            })

        if (username && tracks.length === 0) {
            history.replaceState(null, '', '/')
            return reloadTracks(store)
        }

        tracks.sort((a, b) =>
            a.trackName.localeCompare(b.trackName, undefined, { sensitivity: 'base' })
        )

        store.all = tracks
        store.radiusKm = radiusKm
        store.count = count

        await map.setTracks(tracks, { fly: fly })

        const filteredIds = new Set(store.filtered.map(t => t.trackId))
        map.applyFilter(filteredIds)

    } finally {
        store.loadingTracks = false
    }
}

async function openTrack(trackId) {
    const store = Alpine.store('tracks')
    store.loadingTracks = true

    // Always clear thumbnails before loading a new track
    map.clearMapThumbnails()

    if (store.activeTrackId) {
        map.showSearchMarker(store.activeTrackId)
    }

    store.clear()

    let track = store.items[trackId]

    if (!track) {
        const { details, gpxBlob, geotags } = await getTrackDetails(trackId)

        const rawGeoJSON = await parseGPXtoGeoJSON(gpxBlob)
        details.trackDate = extractTrackDate(rawGeoJSON)

        const single = extractSingleLineString(rawGeoJSON)
        const metrics = computeTrackMetrics(single)

        single.geometry.coordinates =
            smoothElevation3(single.geometry.coordinates)

        const geojson = {
            type: 'FeatureCollection',
            features: [single]
        }

        const bounds = computeBounds(geojson)
        const czmlOriginal = buildCZMLForTrack(geojson, bounds, details.trackType)
        const { distancesKm, elevationsM } = computeProfileArrays(geojson)

        track = {
            details,
            metrics,
            gpxBlob,
            geojson,
            geotags,
            bounds,
            czmlOriginal,
            distancesKm,
            elevationsM
        }

        console.log(track)

        store.setTrack(trackId, track)
    }

    // Update search center (lat/lon from details)
    const [lat, lon] = track.details.trackLatLng
    store.setSearchCenter(lat, lon, { fly: false })

    // Reload nearby tracks but skip flyTo inside setTracks()
    //await store.reload({ fly: false })

    store.activate(trackId)
    store.activeTrackId = trackId

    // Render thumbnails for this track
    map.clearMapThumbnails()
    map.renderMapThumbnails(track.geotags.geoTags)

    const ds = await map.loadTrackCZML(track.czmlOriginal)
    await ds.readyPromise

    track.dataSource = ds

    map.hideSearchMarker(trackId)

    map.setClockToEnd(ds)
    map.showTrailheadMarker(ds)
    map.flyToActiveTrack()

    store.loadingTracks = false
}


async function loadMotd(store) {
    const { motdTracks } = await getMotd()

    store.motdTracks = motdTracks.map(([trackId, index, title]) => ({
        trackId,
        index,
        title
    }))
}

//
// Alpine store
//
export default function initTracksStore(Alpine) {

    Alpine.store('tracks', {

        all: [],
        filter: '',
        selected: null,

        items: {},

        active: null,
        activeTrackId: null,

        isTrackInPlay: false,

        loadingTracks: false,
        loadingCesium: false,

        lat: null,
        lon: null,
        countryCode: 'US',

        radiusKm: null,
        count: null,

        motdTracks: [],

        get filtered() {
            return filterTracks(this.all, this.filter)
        },

        get loading() {
            return this.loadingTracks || this.loadingCesium
        },

        get distanceUnit() {
            return this.countryCode === 'US' ? 'mi' : 'km'
        },

        get radiusDisplay() {
            if (this.radiusKm == null) return null
            return this.countryCode === 'US'
                ? Math.round(this.radiusKm * 0.621371)
                : this.radiusKm
        },

        get headingReady() {
            return (
                this.count != null &&
                this.radiusDisplay != null &&
                this.lat != null &&
                this.lon != null
            )
        },

        animationFinished: false,

        init() {
            map.setOnAnimationFinished(() => {
                this.animationFinished = true

                const trackId = this.active
                if (!trackId) return

                const track = this.items[trackId]
                if (track && track.dataSource) {
                    map.hideAnimatedMarker(track.dataSource)
                    map.stopTrackingEntity()
                }
            })
        },

        async reload() {
            await reloadTracks(this)
        },

        async setSearchCenter(lat, lon, { fly = true } = {}) {
            this.lat = lat
            this.lon = lon

            map.updateSearchCenterMarker(lat, lon)

            await reloadTracks(this, {fly})
        },

        selectTrack(track) {
            this.selected = track
        },

        clear() {
            this.selected = null
        },

        setTrack(trackId, data) {
            this.items[trackId] = data
        },

        activate(trackId) {
            this.active = trackId
        },

        async loadMotd() {
            await loadMotd(this)
        },

        thumbnailUrl(trackId) {
            return `${constants.APIV2_BASE_URL}/tracks/${trackId}/thumbnail/0`
        },

        animate(isPlaying) {
            const trackId = this.active
            if (!trackId) return

            const track = this.items[trackId]
            if (!track || !track.dataSource) return

            if (isPlaying) {
                map.setNorthArrowDisabled(true)
                if (map.isAtEnd()) {
                    map.setClockToBeginning(track.dataSource)
                    setTimeout(() => {
                        map.syncClockToCZML(track.dataSource)
                        map.showAnimatedMarker(track.dataSource)
                        map.startTrackingEntity(track.dataSource)
                    }, 500)
                    return
                }

                map.showAnimatedMarker(track.dataSource)
                map.startTrackingEntity(track.dataSource)
                map.resumeClock()

            } else {
                map.pauseClock()
                // Stop tracking AND unlock the camera
                map.stopTrackingEntity()
                map.setNorthArrowDisabled(false)
            }
        },

        increaseSpeed() { map.increaseSpeed() },
        decreaseSpeed() { map.decreaseSpeed() },

        resetAnimation() {
            const trackId = this.active
            if (!trackId) return

            const track = this.items[trackId]
            if (!track || !track.dataSource) return

            map.hideAnimatedMarker(track.dataSource)
            map.stopTrackingEntity()
            map.setClockToEnd(track.dataSource)
            map.flyToActiveTrack()

            this.showMarkers()
            map.setNorthArrowDisabled(false)
        },

        exitActiveTrack() {
            if (!this.active) return

            const trackId = this.active
            const track = this.items[trackId]

            if (track && track.dataSource) {
                map.setClockToBeginning(track.dataSource)
                map.hideTrailheadMarker(track.dataSource)
                map.hideAnimatedMarker(track.dataSource)
                map.stopTrackingEntity()
            }

            this.showMarkers()
            map.showSearchMarker(trackId)

            // Patch 2: Clear thumbnails when exiting a track
            map.clearMapThumbnails()

            this.active = null
            map.flyToTrackDataSource()
        },

        hideMarkers() {
            map.hideAllSearchMarkers()
            map.hideSearchCenter()
        },

        showMarkers() {
            const active = this.active
            map.showAllSearchMarkersExcept(active)
            map.showSearchCenter()
        }

    })

    Alpine.store('tracks').openTrack = openTrack

    Alpine.watch(() => Alpine.store('tracks').filter, () => {
        const store = Alpine.store('tracks')

        if (!store.all.length) return

        const ids = new Set(store.filtered.map(t => t.trackId))
        map.applyFilter(ids)
    })
}
