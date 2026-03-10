import { sampleNearbyLocs } from '../utils/geoUtils'
import { 
	addPhotos,
	createThumbnail, 
	normalizeImage,
	extractExif,
	interpolateTrackLatLng,
	assignLatLngToPhotos
} from '../utils/photoUtils.js'

import {
    startDrag,
    dropOn,
    deletePhoto
} from '../utils/photoStateUtils.js'

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
        trackCoordinates: [],

        // -----------------------------------------------------
        // REGION OVERRIDE
        // -----------------------------------------------------
        regionOverrideOptions: [],
        selectedRegionOverride: '',

        // -----------------------------------------------------
        // PHOTOS PANEL REQUIRED FIELDS
        // -----------------------------------------------------
        photos: [],           // File objects (for newly added photos)
        photoMeta: [],        // { preview, timestamp, tagType, latLng }
        timeOffset: 0,        // required by PhotosPanel
        dragIndex: null,      // required by PhotosPanel

        confirmRemoval: false,
        idPrefix: null,

        // -----------------------------------------------------
        // INIT
        // -----------------------------------------------------
        init() {
            // Watch for modal opening
            this.$watch('$store.ui.showEditTrackModal', value => {
                if (value) this.populateForm()
            })

            // Same behavior as upload modal
            this.$watch('timeOffset', () => {
                assignLatLngToPhotos(this)
            })

            this.$watch('selectedRegionOverride', value => {
                this.trackRegionTags = value ? value.split('|') : []
            })
        },

        // -----------------------------------------------------
        // POPULATE FROM STORE
        // -----------------------------------------------------
        async populateForm() {
            const id = this.$store.tracks.activeTrackId
            if (!id) return

            const t = this.$store.tracks.items[id].details
            const geotags = this.$store.tracks.items[id].geotags?.geoTags?.trackPhotos || []

            // Always start on info tab
            this.tab = 'info'

            // -------------------------------
            // GPX / Coordinates
            // -------------------------------
            this.trackGPXBlob = null
            this.trackGPX = ''
            this.trackCoordinates = t.coordinates || []
            this.trackLatLng = t.trackLatLng || null

            // -------------------------------
            // Schema fields
            // -------------------------------
            this.trackName = t.trackName || ''
            this.trackDescription = t.trackDescription || ''
            this.trackFav = !!t.trackFav
            this.trackLevel = t.trackLevel || 'Easy'
            this.trackType = t.trackType || 'Hiking'

            // -------------------------------
            // Region override (canonical)
            // -------------------------------
            this.trackRegionTags = t.trackRegionTags || []
            this.regionOverrideOptions = []

            try {
                if (this.trackLatLng) {
                    const [lat, lon] = this.trackLatLng

                    // 1. Sample nearby regions (skip detectRegion)
                    const nearby = await sampleNearbyLocs(lat, lon, 1000)

                    // 2. Start with DB regionTags (always first)
                    let all = []
                    if (t.trackRegionTags && Array.isArray(t.trackRegionTags)) {
                        all.push(t.trackRegionTags)
                    }

                    // 3. Add nearby sampled regions
                    all.push(...nearby)

                    // 4. Deduplicate by "country|region"
                    this.regionOverrideOptions = [...new Map(
                        all.map(r => [r.join('|'), r])
                    ).values()]
                }
            } catch (e) {
                // Fallback: only DB region
                this.regionOverrideOptions = t.trackRegionTags
                    ? [t.trackRegionTags]
                    : []
            }

            // 5. Selected override = DB value
            this.selectedRegionOverride = t.regionOverride || null

            // 6. Canonical: trackRegionTags always array-of-strings
            this.trackRegionTags = this.selectedRegionOverride
                ? this.selectedRegionOverride.split('|')
                : []

            // -------------------------------
            // Photos (canonical merge)
            // -------------------------------
            const metaPhotos = t.trackPhotos || []

            this.trackPhotos = metaPhotos.map((p, index) => {
                const match = geotags.find(g =>
                    (p.picIndex != null && g.picIndex === p.picIndex) ||
                    (p.picName && g.picName === p.picName)
                )

                return {
                    picIndex: p.picIndex ?? index,
                    picName: p.picName ?? index.toString(),
                    picCaption: p.picCaption || '',
                    picLatLng: p.picLatLng || null,
                    picThumb: p.picThumb ?? null,
                    picThumbDataUrl: match?.picThumbBlob || null,
                }
            })

            this.hasPhotos = this.trackPhotos.length > 0

            this.photoMeta = this.trackPhotos.map((p, index) => ({
                id: p.picIndex ?? index,
                caption: p.picCaption || '',
                latLng: p.picLatLng || null,
                timestamp: null,
                preview: p.picThumbDataUrl
                    ? `data:image/jpeg;base64,${p.picThumbDataUrl}`
                    : null,
                tagType: p.picLatLng ? 'previous' : 'none',
            }))

            this.timeOffset = 0
            this.confirmRemoval = false
            this.photos = []      // new photos added during edit

            // -------------------------------
            // UI state
            // -------------------------------
            this.$store.ui.error = null
            this.$store.ui.errorField = ''
            this.$store.ui.uploading = false
        },

        // -----------------------------------------------------
        // PHOTO ADD / PROCESSING (same pipeline as upload)
        // -----------------------------------------------------
        selectPhotos(e) {
            const files = Array.from(e.target.files || [])
            if (!files.length) return

            // Reuse the canonical upload pipeline
			addPhotos(files, this, {
				extractExif,
				normalizeImage,
				createThumbnail
			})

            // Reset input so selecting the same file again works
            e.target.value = ''
        },

        // --- DRAG/DROP REORDER ---
        startDrag(i) {
            startDrag(this, i)
        },

        dropOn(i) {
            dropOn(this, i)
        },

        deletePhoto(i) {
            deletePhoto(this, i)
        },

        // -----------------------------------------------------
        // ACTIONS
        // -----------------------------------------------------
        update() {
            // TODO: implement updateTrack lambda call
        },

        async removeTrack() {
            try {
                // await this.$store.tracks.removeTrack(activeTrackId)

                // Success → show info message in footer
                this.$store.ui.info = 'Track has been removed.'
                this.$store.ui.error = null

                setTimeout(() => {
                    this.$store.ui.info = ''
                    this.$store.ui.showEditTrackModal = false
                }, 2500)
            } catch (err) {
                // Error → show error message in footer
                this.$store.ui.error = err.message || 'Failed to remove track.'
                this.$store.ui.info = null
            }
        },

    }))
}
