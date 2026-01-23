import * as map from '../mapper/map.js'
import { getTracksByLoc } from '../data/getTracksByLoc'
import { getMotd } from '../data/getMotd'
import { constants } from '../config.js'
import { getTrackDetails } from '../data/getTrackDetails.js'
import { parseGPXtoGeoJSON, computeBounds, extractSingleLineString, smoothElevation3, computeTrackMetrics, extractTrackDate, computeProfileArrays } from '../utils/geoUtils.js'
import { buildCZMLForTrack } from '../utils/buildCZMLForTrack.js'

export default function initTracksStore(Alpine) {

    //
    // Reusable track-opening pipeline
    //
    async function openTrack(trackId) {
        const store = Alpine.store('tracks')
        store.loadingTracks = true

        // re-show previous track's search marker (if any)
        if (store.activeTrackId) {
            map.showSearchMarker(store.activeTrackId)
        }

        store.clear()

        let track = store.items[trackId]

        if (!track) {
            const { details, gpxBlob, geotags } = await getTrackDetails(trackId)

            // Parse GPX → raw GeoJSON
            const rawGeoJSON = await parseGPXtoGeoJSON(gpxBlob)
            details.trackDate = extractTrackDate(rawGeoJSON)
            console.log(rawGeoJSON)

            // Merge + normalize + timestamp repair
            const single = extractSingleLineString(rawGeoJSON)

            // Compute metrics
            const metrics = computeTrackMetrics(single)

            // Apply elevation smoothing
            single.geometry.coordinates =
                smoothElevation3(single.geometry.coordinates)

            // Wrap into FeatureCollection
            const geojson = {
                type: 'FeatureCollection',
                features: [single]
            }

            // Compute bounds on the smoothed, normalized geometry
            const bounds = computeBounds(geojson)

            // Build CZML from the clean, smoothed GeoJSON
            const czmlOriginal = buildCZMLForTrack(geojson, bounds, details.trackType)

            // Compute items for the elevation profile
            const { distancesKm, elevationsM } = computeProfileArrays(geojson)

            track = { details, metrics, gpxBlob, geojson, geotags, bounds, czmlOriginal, distancesKm, elevationsM }
            console.log(track)
            store.setTrack(trackId, track)
        }

        store.activate(trackId)

        const ds = await map.loadTrackCZML(track.czmlOriginal)
        await ds.readyPromise

        track.dataSource = ds

        // hide the search marker for the active track
        map.hideSearchMarker(trackId)

        // remember active track so we can re-show its marker later
        store.activeTrackId = trackId

        map.setClockToEnd(ds)
        map.showTrailheadMarker(ds)
        map.flyToActiveTrack()
        store.loadingTracks = false
    }

    //
    // Helpers
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

    async function reloadTracks(store) {
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

            await map.setTracks(tracks)

            const filteredIds = new Set(store.filtered.map(t => t.trackId))
            map.applyFilter(filteredIds)

        } finally {
            store.loadingTracks = false
        }
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
    Alpine.store('tracks', {
        //
        // Track list state
        //
        all: [],
        filter: '',
        selected: null,

        //
        // Loaded track details
        //
        items: {},

        //
        // Active trackId
        //
        active: null,

        loadingTracks: false,
        loadingCesium: false,

        lat: null,
        lon: null,
        countryCode: 'US',

        radiusKm: null,
        count: null,

        //
        // MOTD state
        //
        motdTracks: [],

        //
        // Derived state
        //
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

        //
        // Actions
        //

        init() {
            map.setOnAnimationFinished(() => {
                this.animationFinished = true
            })
        },

        async reload() {
            await reloadTracks(this)
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
                if (map.isAtEnd()) {
                    // First play
                    map.syncClockToCZML(track.dataSource)
                } else {
                    // Resume
                    map.resumeClock()
                }
            } else {
                map.pauseClock()
            }
        },

        increaseSpeed() { map.increaseSpeed() },
        
        decreaseSpeed() { map.decreaseSpeed() },

        resetAnimation() {
            const trackId = this.active
            if (!trackId) return

            const track = this.items[trackId]
            if (!track || !track.dataSource) return

            map.setClockToEnd(track.dataSource)
        },


        exitActiveTrack() {
            if (!this.active) return

            const trackId = this.active
            const track = this.items[trackId]

            // 1. Reset clock to beginning (if CZML clock exists)
            if (track && track.dataSource) {
                map.setClockToBeginning(track.dataSource)
                map.hideTrailheadMarker(track.dataSource)
            }

            // 2. Remove animation entities
            if (track) {
                if (track.animationEntity) {
                    this.viewer.entities.remove(track.animationEntity)
                    track.animationEntity = null
                }
                if (track.animationMarker) {
                    this.viewer.entities.remove(track.animationMarker)
                    track.animationMarker = null
                }
            }

            // 3. Restore search marker
            map.showSearchMarker(trackId)

            // 4. Clear active track
            this.active = null

            // 5. Go back to all tracks view
            map.flyToTrackDataSource()
        }

    })

    //
    // Attach openTrack to the store so UI can call it
    //
    Alpine.store('tracks').openTrack = openTrack

    //
    // Filter watcher
    //
    Alpine.watch(() => Alpine.store('tracks').filter, () => {
        const store = Alpine.store('tracks')

        if (!store.all.length) return

        const ids = new Set(store.filtered.map(t => t.trackId))
        map.applyFilter(ids)
    })
}
