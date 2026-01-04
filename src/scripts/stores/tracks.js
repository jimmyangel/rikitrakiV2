import * as map from '../mapper/map.js'
import { getTracksByLoc } from '../data/getTracksByLoc'

export default function initTracksStore(Alpine) {

    //
    // -----------------------------
    // Helpers (pure functions)
    // -----------------------------
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

			// If user filter exists but no tracks found → reset URL and reload
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
		} finally {
			store.loadingTracks = false
		}
	}

    //
    // -----------------------------
    // Alpine store (declarative)
    // -----------------------------
    //

    Alpine.store('tracks', {
        all: [],
        filter: '',
        selected: null,

        loadingTracks: false,
        loadingCesium: false,

        lat: null,
        lon: null,
        countryCode: 'US',

        radiusKm: null,
        count: null,

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
        }
    })
}
