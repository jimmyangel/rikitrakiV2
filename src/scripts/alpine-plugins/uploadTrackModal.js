import {
    validateTrackName,
    validateDescription,
	validateFileRequired,
    validateAll
} from '../utils/validation.js'

import {
    parseGPXtoGeoJSON,
    extractSingleLineString,
    computeBounds,
    detectRegion,
	sampleNearbyLocs
} from '../utils/geoUtils.js'

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

import { parse } from 'exifr'

export default function (Alpine) {
    Alpine.data('uploadTrackModal', () => ({

        tab: 'info',

        // --- TRACK COORDINATES (with timestamps) ---
        trackCoordinates: [],

        // --- SCHEMA FIELDS ---
        trackGPXBlob: null,
        trackGPX: '',
        trackName: '',
        trackDescription: '',
        trackFav: false,
        trackLevel: 'Easy',
        trackType: 'Hiking',
        trackRegionTags: [],
        trackLatLng: null,
        hasPhotos: false,
        trackPhotos: [],   // schema objects only

		photos: [], // File objects

        // --- UI-ONLY FIELDS ---
        photoMeta: [],     // { preview, timestamp, hasExifGps }
        timeOffset: 0,
        uploaded: false,
		regionOverrideOptions: [],
		selectedRegionOverride: '',

		idPrefix: null,

        // Drag/drop
        dragIndex: null,

        init() {
            this.$watch('$store.ui.showUploadTrackModal', value => {
                if (!value) this.clearForm()
            })

            this.$watch('timeOffset', (v) => {
                assignLatLngToPhotos(this)
            })

			this.$watch('selectedRegionOverride', value => {
				this.trackRegionTags = value ? value.split('|') : []
			})
			this.clearForm()
        },

        clearForm() {
            this.tab = 'info'

			this.trackGPXBlob = null
			this.trackGPX = ''

			if (this.$refs.gpxInput) {
				this.$refs.gpxInput.value = ''
			}

            this.trackName = ''
            this.trackDescription = ''
            this.trackFav = false
            this.trackLevel = 'Easy'
            this.trackType = 'Hiking'
            this.trackRegionTags = null
            this.trackLatLng = null

            this.trackCoordinates = []
            this.trackPhotos = []
            this.photoMeta = []
            this.timeOffset = 0
			this.regionOverrideOptions = []
			this.selectedRegionOverride = null

            this.hasPhotos = false

            this.uploaded = false

            this.$store.ui.error = null
			this.$store.ui.errorField = ''
            this.$store.ui.uploading = false

        },

        // --- VALIDATORS ---
		validators: {
			info: {
				gpxFile: (value, ctx) => validateFileRequired(ctx.trackGPXBlob, 'GPX file'),
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

			// Reject GPX files that contain routes (<rte>)
			if (fc.features.some(f => f.properties?._gpxType === 'rte')) {
				this.$store.ui.error = 'Routes are not supported. Please upload a GPX track.'
				return null
			}

			let single
			try {
				single = extractSingleLineString(fc, { useRealTimestamps: true })
			} catch (e) {
				this.$store.ui.error = 'This GPX file contains no valid track.'
				return null
			}

			if (!single.geometry.coordinates ||
				single.geometry.coordinates.length < 2) {
				this.$store.ui.error = 'This GPX file contains no valid track.'
				return null
			}

			// Reject missing timestamps
			const times = single.properties.coordTimes
			if (!times || times.length < 2 || times.some(t => !t)) {
				this.$store.ui.error = 'This GPX track does not contain timestamps.'
				return null
			}

			// Reject missing elevation
			const coords = single.geometry.coordinates
			const hasElevation = coords.every(c => c.length >= 3 && typeof c[2] === 'number')
			if (!hasElevation) {
				this.$store.ui.error = 'This GPX track does not contain elevation data.'
				return null
			}

			const bounds = computeBounds({ features: [single] })
			if (!isFinite(bounds.west) || !isFinite(bounds.east)) {
				this.$store.ui.error = 'Track bounds could not be computed.'
				return null
			}

			this.$store.ui.info = 'GPX loaded successfully'

			// Normalize coordTimes to epoch ms
			single.properties.coordTimes = single.properties.coordTimes.map(t =>
				t instanceof Date ? t.getTime() :
				typeof t === 'string' ? Date.parse(t) :
				t
			)

			setTimeout(() => {
				this.$store.ui.info = ''
			}, 2500)

			return single
		},

        // --- FILE HANDLERS ---
        async selectGpxFile(event) {
            const file = event.target.files?.[0]
            if (!file) return

            this.trackGPX = file.name

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

				// 1. Detect the primary region
				const detected = await detectRegion(lat, lon)

				// 2. Sample nearby regions (1km)
				const nearby = await sampleNearbyLocs(lat, lon, 1000)

				// 3. Force-include the detected region even if nearby doesn't contain it
				const all = detected ? [detected, ...nearby] : nearby

				// 4. Deduplicate by "country|region"
				this.regionOverrideOptions = [...new Map(
					all.map(r => [r.join('|'), r])
				).values()]

				// 5. Set default selection to detected region (or null)
				this.selectedRegionOverride = detected ? detected.join('|') : null

				// 6. trackRegionTags always array-of-strings
				this.trackRegionTags = this.selectedRegionOverride
					? this.selectedRegionOverride.split('|')
					: []

			} catch (e) {
				this.regionOverrideOptions = []
				this.selectedRegionOverride = null
				this.trackRegionTags = []
			}

			this.trackCoordinates = single.geometry.coordinates
			this.trackTimes = single.properties.coordTimes.map(t =>
				t ? new Date(t).getTime() : null
			)

            assignLatLngToPhotos(this)
        },

		// --- EXIF HELPERS ---
		convertDMSToDD(dms) {
			if (!Array.isArray(dms) || dms.length !== 3) return null
			const [deg, min, sec] = dms
			return deg + (min / 60) + (sec / 3600)
		},

		// --- PHOTO SELECTION ---
		async selectPhotos(event) {
			const files = Array.from(event.target.files || [])

			await addPhotos(
				files,
				this, // Alpine component state
				{
					extractExif,
					normalizeImage,
					createThumbnail
				}
			)

			event.target.value = ''
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

        // --- UPLOAD ---
		async upload() {
			// Validate name + description (info tab)
			if (!validateAll('info', this)) return

			// Assign picThumb based on final order
			for (let i = 0; i < this.trackPhotos.length; i++) {
				this.trackPhotos[i].picThumb = i.toString()
			}

			// Delegate to the tracks store
			const result = await Alpine.store('tracks').upload({
				trackLatLng: this.trackLatLng,
				trackRegionTags: this.trackRegionTags,
				trackLevel: this.trackLevel,
				trackType: this.trackType,
				trackFav: this.trackFav,
				trackGPX: this.trackGPX,
				trackGPXBlob: this.trackGPXBlob,
				trackName: this.trackName,
				trackDescription: this.trackDescription,
				hasPhotos: this.hasPhotos,
				trackPhotos: this.trackPhotos,
				photos: this.photos
			})

			if (!result) return 

			const trackId = result

			this.uploaded = true

			// ------------------------------------------------------------
			// POST‑UPLOAD FLOW
			// ------------------------------------------------------------

			// 1. Set search center to the track’s trailhead
			const [lat, lon] = this.trackLatLng
			this.$store.tracks.setSearchCenter(lat, lon, {
				fly: false,
				skipHistory: true
			})

			// 2. Open the track (now using the real trackId)
			this.$store.tracks.openTrack(trackId)

			// 3. Close modal
			this.$store.ui.showUploadTrackModal = false
		}
    }))
}
