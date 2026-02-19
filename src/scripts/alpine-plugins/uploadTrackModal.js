import {
    validateTrackName,
    validateDescription,
    validateAll
} from '../utils/validation.js'

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

        // --- FILE HANDLERS ---
        async selectGpxFile(event) {
            const file = event.target.files?.[0]
            if (!file) return

            this.gpxFile = file

            // Region detection will be added later
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

			// Optional: auto-close modal after success
			// setTimeout(() => {
			//     this.$store.ui.showUploadTrackModal = false
			// }, 2000)
		}


    }))
}
