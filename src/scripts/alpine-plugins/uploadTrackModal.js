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

        // --- INFO TAB ---
        gpxFile: null,
        name: '',
        description: '',
        favorite: false,
        difficulty: 'Easy',
        activity: 'Hiking',

        detectedRegion: null,

        // --- PHOTOS TAB ---
        photos: [],
        photoPreviews: [],
        timeOffset: 0,

        // --- STATE ---
        uploaded: false,
        errorField: null,

        init() {
            this.$watch('$store.ui.showUploadTrackModal', value => {
                if (value) this.clearForm()
            })
        },

        clearForm() {
            this.tab = 'info'

            this.gpxFile = null
            this.name = ''
            this.description = ''
            this.favorite = false
            this.difficulty = 'Easy'
            this.activity = 'Hiking'

            this.detectedRegion = null

            this.photos = []
            this.photoPreviews = []
            this.timeOffset = 0

            this.uploaded = false

            this.$store.ui.error = null
            this.errorField = null

            this.$store.ui.uploading = false
        },

        // --- VALIDATORS ---
        validators: {
            info: {
                name: validateTrackName,
                description: validateDescription
            }
        },

        // --- GPX VALIDATION ---
		async validateGpx(file) {
			this.$store.ui.error = null
			this.$store.ui.info = null

			// 1. Parse GPX → GeoJSON
			let fc
			try {
				fc = await parseGPXtoGeoJSON(file)
			} catch (e) {
				this.$store.ui.error = 'This GPX file is invalid or unreadable.'
				return false
			}

			// 2. Extract normalized single LineString
			let single
			try {
				single = extractSingleLineString(fc)
			} catch (e) {
				this.$store.ui.error = 'This GPX file contains no valid track.'
				return false
			}

			// 3. Must have at least 2 coordinates
			if (!single.geometry.coordinates ||
				single.geometry.coordinates.length < 2) {
				this.$store.ui.error = 'This GPX file contains no valid track.'
				return false
			}

			// 4. Optional: sanity check bounds
			const bounds = computeBounds({ features: [single] })
			if (!isFinite(bounds.west) || !isFinite(bounds.east)) {
				this.$store.ui.error = 'Track bounds could not be computed.'
				return false
			}

			// 5. Success
			this.$store.ui.info = 'GPX loaded successfully.'
			return single
		},

        // --- FILE HANDLERS ---
		async selectGpxFile(event) {
			const file = event.target.files?.[0]
			if (!file) return

			this.gpxFile = file

			const single = await this.validateGpx(file)
			if (!single) {
				this.gpxFile = null
				this.detectedRegion = null
				return
			}

			console.log(single)
			try {
				const [lon, lat] = single.geometry.coordinates[0]
				this.detectedRegion = await detectRegion(lat, lon)
			} catch (e) {
				this.detectedRegion = null
			}
		},

        selectPhotos(event) {
            const files = Array.from(event.target.files || [])
            this.photos = files.slice(0, 8)

            this.photoPreviews = []
            this.photos.forEach(file => {
                const reader = new FileReader()
                reader.onload = e => this.photoPreviews.push(e.target.result)
                reader.readAsDataURL(file)
            })
        },

        // --- UPLOAD ---
        async upload() {
            this.$store.ui.error = null

            // Validate name + description
            if (!validateAll('info', this)) return

            // Show uploading message
            this.$store.ui.uploading = true
            this.$store.ui.showInfo('Uploading…', 3000)

            this.uploaded = false

            // Simulate async upload
            await new Promise(r => setTimeout(r, 800))

            this.$store.ui.uploading = false
            this.uploaded = true

            // Show success message
            this.$store.ui.showInfo('Track uploaded.', 3000)
        }

    }))
}
