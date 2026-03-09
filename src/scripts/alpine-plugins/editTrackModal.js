export default function (Alpine) {
    Alpine.data('editTrackModal', () => ({

        // -----------------------------------------------------
        // UI STATE
        // -----------------------------------------------------
        tab: 'info',

        // -----------------------------------------------------
        // SCHEMA FIELDS (prefilled from store)
        // -----------------------------------------------------
        trackName: '',
        trackDescription: '',
        trackFav: false,
        trackLevel: 'Easy',
        trackType: 'Hiking',
        trackRegionTags: [],
        trackLatLng: null,
        hasPhotos: false,
        trackPhotos: [],   // schema objects only

        // -----------------------------------------------------
        // REGION OVERRIDE
        // -----------------------------------------------------
        regionOverrideOptions: [],
        selectedRegionOverride: '',

        // -----------------------------------------------------
        // PHOTOS PANEL REQUIRED FIELDS
        // -----------------------------------------------------
        trackGPXBlob: true,   // required so PhotosPanel always mounts
        photos: [],           // File objects (unused in edit mode but required)
        photoMeta: [],        // { preview, timestamp, hasExifGps }
        timeOffset: 0,        // required by PhotosPanel
        dragIndex: null,      // required by PhotosPanel

        // -----------------------------------------------------
        // INIT
        // -----------------------------------------------------
        init() {
            const id = this.$store.tracks.activeTrackId
            if (!id) return

            const t = this.$store.tracks.items[id].details

            // Prefill schema fields
            this.trackName = t.name
            this.trackDescription = t.description
            this.trackFav = t.fav
            this.trackLevel = t.level
            this.trackType = t.type

            // Region override
            this.trackRegionTags = t.regionTags || []
            this.regionOverrideOptions = t.regionTags || []
            this.selectedRegionOverride = t.regionOverride || ''

            // Coordinates
            this.trackLatLng = t.latLng || null

            // Photos
            this.hasPhotos = !!(t.photos && t.photos.length)
            this.trackPhotos = t.photos || []

            // TODO: build photoMeta from trackPhotos
        },

        // -----------------------------------------------------
        // ACTIONS
        // -----------------------------------------------------
        update() {
            // TODO: implement updateTrack lambda call
        },

        removeTrack() {
            // TODO: implement removeTrack lambda call
        },

    }))
}
