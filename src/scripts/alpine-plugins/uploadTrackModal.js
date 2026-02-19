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

        // --- AUTO-DETECTED REGION ---
        detectedRegion: null,

        // --- PHOTOS TAB ---
        photos: [],
        photoPreviews: [],
        timeOffset: 0,

        // --- STATE ---
        uploading: false,
        uploaded: false,
        errorField: null,

        // --- INIT ---
        init() {
            this.$watch('$store.ui.showUploadTrackModal', value => {
                if (value) this.clearForm()
            })
        },

        // --- RESET ---
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

            this.uploading = false
            this.uploaded = false

            this.$store.ui.error = null
            this.errorField = null
        },

        // --- FILE HANDLERS ---
        async selectGpxFile(event) {
            const file = event.target.files?.[0]
            if (!file) return

            this.gpxFile = file

            // Region detection will be wired here in the next step:
            // 1. parseGPXtoGeoJSON
            // 2. extractFirstLatLon
            // 3. detectRegion(lat, lon)
            // 4. this.detectedRegion = `${state}, ${country}`
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

        // --- UPLOAD (stub) ---
        async upload() {
            this.$store.ui.error = null
            this.uploading = true
            this.uploaded = false

            await new Promise(r => setTimeout(r, 800))

            this.uploading = false
            this.uploaded = true
        }

    }))
}
