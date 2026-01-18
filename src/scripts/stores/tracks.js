import * as map from '../mapper/map.js'
import { getTracksByLoc } from '../data/getTracksByLoc'
import { getMotd } from '../data/getMotd'
import { constants } from '../config.js'
import { getTrackDetails } from '../data/getTrackDetails.js'

export default function initTracksStore(Alpine) {

    //
    // Reusable track-opening pipeline
    //
    async function openTrack(trackId) {
        const store = Alpine.store('tracks')

        // always close popup first
        store.clear()

        // check cache
        let track = store.items[trackId]

        if (!track) {
            const { details, gpxBlob, geotags } = await getTrackDetails(trackId)
            track = { details, gpxBlob, geotags }
            store.setTrack(trackId, track)

            // optional: add GPX to map here
            // map.addTrack(trackId, gpxBlob)
        }

        // activate track
        store.activate(trackId)

        // optional: highlight active track on map
        // map.setActiveTrack(trackId)
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

        //
        // Actions
        //
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
