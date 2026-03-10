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
        photos: [],           // File objects (unused in edit mode but required)
        photoMeta: [],        // { preview, timestamp, hasExifGps }
        timeOffset: 0,        // required by PhotosPanel
        dragIndex: null,      // required by PhotosPanel

		confirmRemoval: false,

        // -----------------------------------------------------
        // INIT
        // -----------------------------------------------------
		init() {
			// Watch for modal opening
			this.$watch('$store.ui.showEditTrackModal', value => {
				if (value) this.populateForm()
			})

			// Watchers identical to upload modal
			this.$watch('timeOffset', () => {
				assignLatLngToPhotos(this)
			})

			this.$watch('selectedRegionOverride', value => {
				this.trackRegionTags = value ? value.split('|') : []
			})
		},

		populateForm() {
			const id = this.$store.tracks.activeTrackId
			if (!id) return

			const t = this.$store.tracks.items[id].details

			// Always start on info tab
			this.tab = 'info'

			// -------------------------------
			// GPX / Coordinates
			// -------------------------------
			// Edit modal does NOT use GPX upload
			this.trackGPXBlob = null
			this.trackGPX = ''
			this.trackCoordinates = t.coordinates || []
			this.trackLatLng = t.latLng || null

			// -------------------------------
			// Schema fields
			// -------------------------------
			this.trackName = t.name || ''
			this.trackDescription = t.description || ''
			this.trackFav = !!t.fav
			this.trackLevel = t.level || 'Easy'
			this.trackType = t.type || 'Hiking'

			// -------------------------------
			// Region override
			// -------------------------------
			this.trackRegionTags = t.regionTags || []
			this.regionOverrideOptions = t.regionTags || []
			this.selectedRegionOverride = t.regionOverride || null

			// -------------------------------
			// Photos
			// -------------------------------
			this.trackPhotos = t.photos || []
			this.hasPhotos = this.trackPhotos.length > 0

			// Build photoMeta from photos (canonical)
			this.photoMeta = this.trackPhotos.map(p => ({
				id: p.id,
				caption: p.caption || '',
				latLng: p.latLng || null,
				timestamp: p.timestamp || null
			}))

			// Time offset starts at 0 for editing
			this.timeOffset = 0

			this.confirmRemoval = false

			// -------------------------------
			// UI state
			// -------------------------------
			this.$store.ui.error = null
			this.$store.ui.errorField = ''
			this.$store.ui.uploading = false
		},

        // -----------------------------------------------------
        // ACTIONS
        // -----------------------------------------------------
        update() {
            // TODO: implement updateTrack lambda call
        },

		async removeTrack() {
			try {
				//await this.$store.tracks.removeTrack(activeTrackId)

				// Success → show info message in footer
				this.$store.ui.info = "Track has been removed."
				this.$store.ui.error = null

				setTimeout(() => {
					this.$store.ui.info = ''
					this.$store.ui.showEditTrackModal = false
				}, 2500)
			} catch (err) {
				// Error → show error message in footer
				this.$store.ui.error = err.message || "Failed to remove track."
				this.$store.ui.info = null
			}
		}

    }))
}
