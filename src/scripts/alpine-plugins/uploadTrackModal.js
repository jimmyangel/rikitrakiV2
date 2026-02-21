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

import EXIF from 'exif-js'

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
        async resizeImage(file) {
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

        // --- EXIF HELPERS ---
        convertDMSToDD(dms) {
            if (!Array.isArray(dms) || dms.length !== 3) return null
            const [deg, min, sec] = dms
            return deg + (min / 60) + (sec / 3600)
        },

		async extractExif(file) {
			return new Promise(resolve => {
				const reader = new FileReader()

				reader.onload = e => {
					const img = new Image()

					img.onload = () => {
						try {
							EXIF.getData(img, function () {
								let gps = null
								let timestamp = null

								// GPS
								let lat = EXIF.getTag(this, 'GPSLatitude')
								let lon = EXIF.getTag(this, 'GPSLongitude')

								if (lat && lon) {
									const latRef = EXIF.getTag(this, 'GPSLatitudeRef') || 'N'
									const lonRef = EXIF.getTag(this, 'GPSLongitudeRef') || 'W'

									const latDD = lat[0] + lat[1] / 60 + lat[2] / 3600
									const lonDD = lon[0] + lon[1] / 60 + lon[2] / 3600

									gps = [
										lonRef === 'W' ? -lonDD : lonDD,
										latRef === 'N' ?  latDD : -latDD
									]
								}

								// Timestamp
								const date = EXIF.getTag(this, 'DateTimeOriginal')
								if (date && /^[0-9]{4}:[0-9]{2}:[0-9]{2} [0-9]{2}:[0-9]{2}:[0-9]{2}$/.test(date)) {
									const p = date.split(/ |:/)
									timestamp = new Date(
										p[0], parseInt(p[1]) - 1, p[2], p[3], p[4], p[5]
									).getTime()
								}

								resolve({ gps, timestamp })
							})
						} catch (e) {
							resolve({ gps: null, timestamp: null })
						}
					}

					img.src = e.target.result
				}

				reader.readAsDataURL(file)
			})
		},

        // --- PHOTO SELECTION ---
        async selectPhotos(event) {
            const files = Array.from(event.target.files || []).slice(0, 8)

            this.trackPhotos = []
            this.photoMeta = []

            for (const file of files) {
                const preview = await this.resizeImage(file)
                const { gps, timestamp } = await this.extractExif(file)

                this.trackPhotos.push({
                    picName: file.name,
                    picThumb: '',
                    picLatLng: gps,
                    picCaption: ''
                })

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
