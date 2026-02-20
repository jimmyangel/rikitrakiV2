import {
    validateTrackName,
    validateDescription,
    validateAll
} from '../utils/validation.js'

import {
    parseGPXtoGeoJSON,
    extractSingleLineString,
    computeBounds,
    detectRegion
} from '../utils/geoUtils.js'

export default function (Alpine) {
    Alpine.data('uploadTrackModal', () => ({

        tab: 'info',

        // --- SCHEMA FIELDS ---
        trackGPXBlob: null,          // File object
        trackGPX: '',                // original filename
        trackName: '',
        trackDescription: '',
        trackFav: false,
        trackLevel: 'Easy',
        trackType: 'Hiking',
        trackRegionTags: null,       // array of strings
        trackLatLng: null,           // [lat, lon]
        hasPhotos: false,
        trackPhotos: [],             // schema objects

        // --- UI-ONLY FIELDS ---
        photoPreviews: [],
        timeOffset: 0,
        uploaded: false,
        errorField: null,

        init() {
            this.$watch('$store.ui.showUploadTrackModal', value => {
                if (value) this.clearForm()
            })
        },

        clearForm() {
            this.tab = 'info'

            this.trackGPXBlob = null
            this.trackGPX = ''
            this.trackName = ''
            this.trackDescription = ''
            this.trackFav = false
            this.trackLevel = 'Easy'
            this.trackType = 'Hiking'
            this.trackRegionTags = null
            this.trackLatLng = null

            this.trackPhotos = []
            this.photoPreviews = []
            this.timeOffset = 0
            this.hasPhotos = false

            this.uploaded = false

            this.$store.ui.error = null
            this.errorField = null
            this.$store.ui.uploading = false
        },

        // --- VALIDATORS ---
        validators: {
            info: {
                trackName: validateTrackName,
                trackDescription: validateDescription
            }
        },

        // --- GPX VALIDATION ---
        async validateGpx(file) {
            this.$store.ui.error = null
            this.$store.ui.info = null

            let fc
            try {
                fc = await parseGPXtoGeoJSON(file)
            } catch (e) {
                this.$store.ui.error = 'This GPX file is invalid or unreadable.'
                return null
            }

            let single
            try {
                single = extractSingleLineString(fc)
            } catch (e) {
                this.$store.ui.error = 'This GPX file contains no valid track.'
                return null
            }

            if (!single.geometry.coordinates ||
                single.geometry.coordinates.length < 2) {
                this.$store.ui.error = 'This GPX file contains no valid track.'
                return null
            }

            const bounds = computeBounds({ features: [single] })
            if (!isFinite(bounds.west) || !isFinite(bounds.east)) {
                this.$store.ui.error = 'Track bounds could not be computed.'
                return null
            }

            this.$store.ui.info = 'GPX loaded successfully.'
            return single
        },

        // --- FILE HANDLERS ---
        async selectGpxFile(event) {
            const file = event.target.files?.[0]
            if (!file) return

            // Save original filename
            this.trackGPX = file.name

            // 4MB limit
            if (file.size > 4 * 1024 * 1024) {
                this.$store.ui.error = 'GPX file must be 4 MB or smaller.'
                this.trackGPXBlob = null
                this.trackGPX = ''
                this.trackRegionTags = null
                return
            }

            this.trackGPXBlob = file

            const single = await this.validateGpx(file)
            if (!single) {
                this.trackGPXBlob = null
                this.trackGPX = ''
                this.trackRegionTags = null
                return
            }

            try {
                const [lon, lat] = single.geometry.coordinates[0]
                this.trackLatLng = [lat, lon]
                this.trackRegionTags = await detectRegion(lat, lon)
            } catch (e) {
                this.trackRegionTags = null
            }
        },

        selectPhotos(event) {
            const files = Array.from(event.target.files || [])
            const limited = files.slice(0, 8)

            this.trackPhotos = []
            this.photoPreviews = []

            limited.forEach(file => {
                const reader = new FileReader()
                reader.onload = e => {
                    this.photoPreviews.push(e.target.result)
                    this.trackPhotos.push({
                        picName: file.name,
                        picThumb: '',          // filled server-side
                        picLatLng: null,       // optional
                        picCaption: '',
                        picThumbDataUrl: e.target.result
                    })
                }
                reader.readAsDataURL(file)
            })

            this.hasPhotos = this.trackPhotos.length > 0
        },

        // --- UPLOAD ---
        async upload() {
            this.$store.ui.error = null

            if (!validateAll('info', this)) return

            this.$store.ui.uploading = true
            this.$store.ui.showInfo('Uploading…', 3000)

            this.uploaded = false

            await new Promise(r => setTimeout(r, 800))

            this.$store.ui.uploading = false
            this.uploaded = true

            this.$store.ui.showInfo('Track uploaded.', 3000)
        }

    }))
}
