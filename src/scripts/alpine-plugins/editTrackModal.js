import {
    validateTrackName,
    validateDescription,
    validateFileRequired,
    validateAll
} from '../utils/validation.js'
import { 
    sampleNearbyLocs, 
    parseGPXtoGeoJSON, 
    extractSingleLineString 
} from '../utils/geoUtils'
import { 
    addPhotos,
    createThumbnail, 
    normalizeImage,
    extractExif,
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
        trackId: null,

        trackName: '',
        trackDescription: '',
        trackFav: false,
        trackLevel: 'Easy',
        trackType: 'Hiking',
        trackRegionTags: [],          // flat array of strings per schema
        trackLatLng: null,
        hasPhotos: false,
        trackPhotos: [],              // UI photos

        // Real GPX data for interpolation
        trackCoordinates: [],
        trackTimes: [],

        // -----------------------------------------------------
        // REGION OVERRIDE (UI)
        // -----------------------------------------------------
        regionOverrideOptions: [],    // array of [country, region] pairs
        selectedRegionOverride: null, // "US|California"

        // -----------------------------------------------------
        // PHOTOS PANEL REQUIRED FIELDS
        // -----------------------------------------------------
        photos: [],
        photoMeta: [],
        timeOffset: 0,
        dragIndex: null,

        // -----------------------------------------------------
        // INTERNAL COUNTER FOR NEW picIndex VALUES
        // -----------------------------------------------------
        nextPicIndex: 0,

        confirmRemoval: false,
        idPrefix: null,

        originalTrackDetails: null,   // snapshot of UI state
        ready: false,

        // -----------------------------------------------------
        // INIT
        // -----------------------------------------------------
        init() {
            // Open/close modal
            this.$watch('$store.ui.showEditTrackModal', async value => {
                if (!value) {
                    this.reset()
                    return
                }

                const id = this.$store.tracks.activeTrackId
                if (!id) return

                const track = this.$store.tracks.items[id]
                if (!track || !track.details) return

                // 1) Populate full UI state
                await this.populateForm()

                // 2) Snapshot UI state for diffing
                this.originalTrackDetails = JSON.parse(JSON.stringify({
                    trackId: this.trackId,
                    trackName: this.trackName,
                    trackDescription: this.trackDescription,
                    trackFav: this.trackFav,
                    trackLevel: this.trackLevel,
                    trackType: this.trackType,
                    trackRegionTags: this.trackRegionTags,
                    trackPhotos: this.trackPhotos
                }))

                // 3) Ready
                this.ready = true
            })

            // timeOffset → reassign lat/lng to photos
            this.$watch('timeOffset', () => {
                assignLatLngToPhotos(this)
            })

            // Region override → update trackRegionTags
            this.$watch('selectedRegionOverride', value => {
                if (!this.ready) return

                if (!value) {
                    // Restore original region tags from snapshot
                    this.trackRegionTags = [
                        ...(this.originalTrackDetails?.trackRegionTags || [])
                    ]
                    return
                }

                // Apply override (flat array of strings)
                this.trackRegionTags = value.split('|')
            })
        },

        // -----------------------------------------------------
        // RESET ALL STATE
        // -----------------------------------------------------
        reset() {
            this.ready = false
            this.originalTrackDetails = null

            // Schema fields
            this.trackId = null
            this.trackName = ''
            this.trackDescription = ''
            this.trackFav = false
            this.trackLevel = 'Easy'
            this.trackType = 'Hiking'
            this.trackRegionTags = []
            this.trackLatLng = null
            this.hasPhotos = false
            this.trackPhotos = []

            // GPX / interpolation
            this.trackCoordinates = []
            this.trackTimes = []

            // Region override
            this.regionOverrideOptions = []
            this.selectedRegionOverride = null

            // Photos panel
            this.photos = []
            this.photoMeta = []
            this.timeOffset = 0
            this.dragIndex = null

            // Internal counters
            this.nextPicIndex = 0
            this.confirmRemoval = false

            this.$store.ui.error = null
            this.$store.ui.errorField = ''
            this.$store.ui.uploading = false
        },

        // -----------------------------------------------------
        // POPULATE FROM STORE (single source of truth)
        // -----------------------------------------------------
        async populateForm() {
            const id = this.$store.tracks.activeTrackId
            if (!id) return
            this.trackId = id

            const track = this.$store.tracks.items[id]
            const t = track.details
            const geotags = track.geotags?.geoTags?.trackPhotos || []

            this.tab = 'info'

            // GPX → coordinates + times
            try {
                const rawGeoJSON = await parseGPXtoGeoJSON(track.gpxBlob)
                const singleReal = extractSingleLineString(rawGeoJSON, { useRealTimestamps: true })

                this.trackCoordinates = singleReal.geometry.coordinates || []
                const rawTimes = singleReal.properties.coordTimes || []
                this.trackTimes = rawTimes.map(t =>
                    t instanceof Date ? t.getTime() :
                    typeof t === 'string' ? Date.parse(t) :
                    t
                )
            } catch (err) {
                console.error('Failed to reparse GPX for edit mode:', err)
                this.trackCoordinates = []
                this.trackTimes = []
            }

            // Schema fields
            this.trackName = t.trackName || ''
            this.trackDescription = t.trackDescription || ''
            this.trackFav = !!t.trackFav
            this.trackLevel = t.trackLevel || 'Easy'
            this.trackType = t.trackType || 'Hiking'
            this.trackLatLng = t.trackLatLng || null

            // Region tags (flat array of strings)
            this.trackRegionTags = [...(t.trackRegionTags || [])]
            this.selectedRegionOverride = t.regionOverride || null
            this.regionOverrideOptions = []

            try {
                if (this.trackLatLng) {
                    const [lat, lon] = this.trackLatLng
                    const nearby = await sampleNearbyLocs(lat, lon, 1000)

                    let all = []
                    if (t.trackRegionTags && Array.isArray(t.trackRegionTags)) {
                        all.push(t.trackRegionTags)
                    }
                    all.push(...nearby)

                    // nearby + existing as pairs
                    this.regionOverrideOptions = [...new Map(
                        all.map(r => [r.join('|'), r])
                    ).values()]
                }
            } catch (e) {
                this.regionOverrideOptions = t.trackRegionTags
                    ? [t.trackRegionTags]
                    : []
            }

            // Apply override if present (flat array)
            if (this.selectedRegionOverride) {
                this.trackRegionTags = this.selectedRegionOverride.split('|')
            }

            // Photos (merge)
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
                hasExifGps: false
            }))

            // nextPicIndex
            const existing = this.trackPhotos
                .map(p => p.picIndex)
                .filter(v => v != null)

            this.nextPicIndex = existing.length
                ? Math.max(...existing) + 1
                : 0

            this.timeOffset = 0
            this.confirmRemoval = false
            this.photos = []

            this.$store.ui.error = null
            this.$store.ui.errorField = ''
            this.$store.ui.uploading = false
        },

        validators: {
            info: {
                trackName: validateTrackName,
                trackDescription: validateDescription
            }
        },

        // -----------------------------------------------------
        // PHOTO ADD / PROCESSING
        // -----------------------------------------------------
        async selectPhotos(e) {
            const files = Array.from(e.target.files || [])
            if (!files.length) return

            await addPhotos(files, this, {
                extractExif,
                normalizeImage,
                createThumbnail
            })

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
        // DIRTY CHECK (vs snapshot)
        // -----------------------------------------------------
        get isDirty() {
            if (this.trackId === null) return false
            if (!this.ready) return false
            if (!this.originalTrackDetails) return false

            // Simple fields
            if (this.trackName !== this.originalTrackDetails.trackName) return true
            if (this.trackDescription !== this.originalTrackDetails.trackDescription) return true
            if (this.trackFav !== this.originalTrackDetails.trackFav) return true
            if (this.trackLevel !== this.originalTrackDetails.trackLevel) return true
            if (this.trackType !== this.originalTrackDetails.trackType) return true

            // Region tags (flat arrays)
            if (
                JSON.stringify(this.trackRegionTags) !==
                JSON.stringify(this.originalTrackDetails.trackRegionTags)
            ) {
                return true
            }

            // Photos (vs snapshot)
            if (
                JSON.stringify(this.trackPhotos) !==
                JSON.stringify(this.originalTrackDetails.trackPhotos)
            ) {
                return true
            }

            return false
        },

        // -----------------------------------------------------
        // ACTIONS
        // -----------------------------------------------------
        async update() {
            this.$store.ui.error = null

            if (!validateAll('info', this)) return

            // Assign picThumb based on final order
            for (let i = 0; i < this.trackPhotos.length; i++) {
                this.trackPhotos[i].picThumb = i.toString()
            }

            this.$store.ui.uploading = true
            this.$store.ui.showInfo('Saving changes…', 3000)

            const result = await Alpine.store('tracks').updateTrack({
                trackId: this.trackId,
                trackName: this.trackName,
                trackDescription: this.trackDescription,
                trackFav: this.trackFav,
                trackLevel: this.trackLevel,
                trackType: this.trackType,
                trackRegionTags: this.trackRegionTags,
                trackPhotos: this.trackPhotos,
                photos: this.photos,
                originalTrackDetails: this.originalTrackDetails
            })

            this.$store.ui.uploading = false

            if (!result.ok) {
                this.$store.ui.error = result.error || 'Failed to update track.'
                return
            }

            this.$store.ui.showInfo('Track updated.', 3000)
            this.uploaded = true
            this.$store.ui.showEditTrackModal = false
        },

        async removeTrack() {
            try {
                this.$store.ui.info = 'Track has been removed.'
                this.$store.ui.error = null

                setTimeout(() => {
                    this.$store.ui.info = ''
                    this.$store.ui.showEditTrackModal = false
                }, 2500)
            } catch (err) {
                this.$store.ui.error = err.message || 'Failed to remove track.'
                this.$store.ui.info = null
            }
        },

    }))
}
