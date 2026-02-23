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
    detectRegion
} from '../utils/geoUtils.js'

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
        trackRegionTags: null,
        trackLatLng: null,
        hasPhotos: false,
        trackPhotos: [],   // schema objects only

        // --- UI-ONLY FIELDS ---
        photoMeta: [],     // { preview, timestamp, hasExifGps }
        timeOffset: 0,
        uploaded: false,
        errorField: null,

        // Drag/drop
        dragIndex: null,

        init() {
            this.$watch('$store.ui.showUploadTrackModal', value => {
                if (value) this.clearForm()
            })

            this.$watch('timeOffset', () => {
                this.assignLatLngToPhotos()
            })
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
            this.hasPhotos = false

            this.uploaded = false

            this.$store.ui.error = null
            this.errorField = null
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
                this.trackRegionTags = await detectRegion(lat, lon)
            } catch (e) {
                this.trackRegionTags = null
            }

            this.trackCoordinates = single.geometry.coordinates.map(([lon, lat], i) => ({
                lon,
                lat,
                timestamp: single.properties?.coordTimes?.[i]
                    ? new Date(single.properties.coordTimes[i]).getTime()
                    : null
            }))

            this.assignLatLngToPhotos()
        },

        // --- IMAGE RESIZING (300x225 center-crop) ---
        async createThumbnail(file) {
            const W = 300
            const H = 225

            return new Promise(resolve => {
                const reader = new FileReader()
                reader.onload = e => {
                    const img = new Image()
                    img.onload = () => {
                        const canvas = document.createElement('canvas')
                        canvas.width = W
                        canvas.height = H

                        const ctx = canvas.getContext('2d')

                        const scale = Math.max(W / img.width, H / img.height)
                        const scaledWidth = img.width * scale
                        const scaledHeight = img.height * scale

                        const offsetX = (W - scaledWidth) / 2
                        const offsetY = (H - scaledHeight) / 2

                        ctx.drawImage(img, offsetX, offsetY, scaledWidth, scaledHeight)

                        resolve(canvas.toDataURL('image/jpeg', 0.85))
                    }
                    img.src = e.target.result
                }
                reader.readAsDataURL(file)
            })
        },

		async normalizeImage(file) {
			const maxBytes = 1_000_000
			const maxWidth = 2048

			// If already small enough, skip everything
			if (file.size <= maxBytes) {
				return file
			}

			// Load image
			const img = await new Promise((resolve, reject) => {
				const i = new Image()
				i.onload = () => resolve(i)
				i.onerror = reject
				i.src = URL.createObjectURL(file)
			})

			// Determine target dimensions
			let targetWidth = img.naturalWidth
			let targetHeight = img.naturalHeight

			if (img.naturalWidth > maxWidth) {
				targetWidth = maxWidth
				targetHeight = img.naturalHeight * (maxWidth / img.naturalWidth)
			}

			// Draw resized image to canvas
			const canvas = document.createElement('canvas')
			canvas.width = targetWidth
			canvas.height = targetHeight
			const ctx = canvas.getContext('2d')
			ctx.drawImage(img, 0, 0, targetWidth, targetHeight)

			// Iteratively compress until <= 1MB
			let quality = 0.92
			let blob = await new Promise(resolve =>
				canvas.toBlob(resolve, 'image/jpeg', quality)
			)

			while (blob.size > maxBytes && quality > 0.5) {
				quality -= 0.05
				blob = await new Promise(resolve =>
					canvas.toBlob(resolve, 'image/jpeg', quality)
				)
			}

			return new File([blob], file.name, { type: 'image/jpeg' })
		},

        // --- EXIF HELPERS ---
        convertDMSToDD(dms) {
            if (!Array.isArray(dms) || dms.length !== 3) return null
            const [deg, min, sec] = dms
            return deg + (min / 60) + (sec / 3600)
        },

		async extractExif(file) {
			try {
				const data = await parse(file, {
					gps: true,
					tiff: true,
					exif: true
				})

				let gps = null
				let timestamp = null

				// GPS
				if (data && data.latitude != null && data.longitude != null) {
					gps = [data.longitude, data.latitude]
				}

				// Timestamp
				if (data && data.DateTimeOriginal instanceof Date) {
					timestamp = data.DateTimeOriginal.getTime()
				}

				return { gps, timestamp }

			} catch (err) {
				console.warn('EXIF parsing failed:', err)
				return { gps: null, timestamp: null }
			}
		},	

		async addPhotos(files) {
			const MAX = 8

			for (const file of files) {
				if (this.trackPhotos.length >= MAX) {
					this.$store.ui.error = `Maximum of ${MAX} photos allowed`
					break
				}

				// 1) EXIF from original file (keeps GPS + timestamp working)
				const { gps, timestamp } = await this.extractExif(file)

				// 2) Normalize for size/resolution
				const normalized = await this.normalizeImage(file)

				// 3) Thumbnail from normalized file
				const preview = await this.createThumbnail(normalized)

				// --- SCHEMA OBJECT ---
				this.trackPhotos.push({
					picName: normalized.name,
					picThumb: '',        // filled after upload
					picLatLng: gps,      // EXIF GPS or null
					picCaption: ''
				})

				// --- UI METADATA ---
				this.photoMeta.push({
					preview,
					timestamp,
					hasExifGps: !!gps
				})
			}

			this.hasPhotos = this.trackPhotos.length > 0

			if (this.trackCoordinates.length) {
				this.assignLatLngToPhotos()
			}
		},

        // --- PHOTO SELECTION ---
		async selectPhotos(event) {
			const files = Array.from(event.target.files || [])
			await this.addPhotos(files)
			event.target.value = ''
		},

        assignLatLngToPhotos() {

            if (!this.trackCoordinates.length) return
            if (!this.trackPhotos.length) return

            for (let i = 0; i < this.trackPhotos.length; i++) {
                const meta = this.photoMeta[i]
                const photo = this.trackPhotos[i]

                if (meta.hasExifGps) continue
                if (!meta.timestamp) continue

                const shifted = meta.timestamp + this.timeOffset * 3600 * 1000
                photo.picLatLng = this.interpolateTrackLatLng(shifted)
            }
        },

        interpolateTrackLatLng(ts) {
            const coords = this.trackCoordinates
            if (!coords.length) return null

            for (let i = 0; i < coords.length - 1; i++) {
                const a = coords[i]
                const b = coords[i + 1]

                if (!a.timestamp || !b.timestamp) continue

                if (ts >= a.timestamp && ts <= b.timestamp) {
                    const ratio = (ts - a.timestamp) / (b.timestamp - a.timestamp)
                    const lat = a.lat + ratio * (b.lat - a.lat)
                    const lon = a.lon + ratio * (b.lon - a.lon)
                    return [lon, lat]
                }
            }

            return null
        },

        // --- DRAG/DROP REORDER ---
        startDrag(i) {
            this.dragIndex = i
        },

        dropOn(i) {
            if (this.dragIndex === null || this.dragIndex === i) return

            const movedPhoto = this.trackPhotos.splice(this.dragIndex, 1)[0]
            const movedMeta = this.photoMeta.splice(this.dragIndex, 1)[0]

            this.trackPhotos.splice(i, 0, movedPhoto)
            this.photoMeta.splice(i, 0, movedMeta)

            this.dragIndex = null
        },

		deletePhoto(index) {
			this.trackPhotos.splice(index, 1)
			this.photoMeta.splice(index, 1)
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
