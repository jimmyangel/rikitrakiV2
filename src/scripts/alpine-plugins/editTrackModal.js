import { sampleNearbyLocs, parseGPXtoGeoJSON, extractSingleLineString } from '../utils/geoUtils'
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
        trackName: '',
        trackDescription: '',
        trackFav: false,
        trackLevel: 'Easy',
        trackType: 'Hiking',
        trackRegionTags: [],
        trackLatLng: null,
        hasPhotos: false,
        trackPhotos: [],

        // Real GPX data for interpolation
        trackCoordinates: [],
        trackTimes: [],

        // -----------------------------------------------------
        // REGION OVERRIDE
        // -----------------------------------------------------
        regionOverrideOptions: [],
        selectedRegionOverride: '',

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

        // -----------------------------------------------------
        // INIT
        // -----------------------------------------------------
        init() {
            this.$watch('$store.ui.showEditTrackModal', value => {
                if (value) this.populateForm()
            })

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

            const track = this.$store.tracks.items[id]
            const t = track.details
            const geotags = track.geotags?.geoTags?.trackPhotos || []

            this.tab = 'info'

            // -----------------------------------------------------
            // RE-PARSE GPX TO GET REAL COORDINATES + REAL TIMES
            // -----------------------------------------------------
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

            // -----------------------------------------------------
            // Schema fields
            // -----------------------------------------------------
            this.trackName = t.trackName || ''
            this.trackDescription = t.trackDescription || ''
            this.trackFav = !!t.trackFav
            this.trackLevel = t.trackLevel || 'Easy'
            this.trackType = t.trackType || 'Hiking'
            this.trackLatLng = t.trackLatLng || null

            // -----------------------------------------------------
            // Region override
            // -----------------------------------------------------
            this.trackRegionTags = t.trackRegionTags || []
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

                    this.regionOverrideOptions = [...new Map(
                        all.map(r => [r.join('|'), r])
                    ).values()]
                }
            } catch (e) {
                this.regionOverrideOptions = t.trackRegionTags
                    ? [t.trackRegionTags]
                    : []
            }

            this.selectedRegionOverride = t.regionOverride || null
            this.trackRegionTags = this.selectedRegionOverride
                ? this.selectedRegionOverride.split('|')
                : []

            // -----------------------------------------------------
            // Photos (canonical merge)
            // -----------------------------------------------------
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

            // -----------------------------------------------------
            // Compute nextPicIndex
            // -----------------------------------------------------
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
        // ACTIONS
        // -----------------------------------------------------
        update() {
            // TODO: implement updateTrack lambda call
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
