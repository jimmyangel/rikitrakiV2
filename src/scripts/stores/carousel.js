import { constants } from '../config.js'

export default function initCarouselStore(Alpine) {
    Alpine.store('carousel', {
        isOpen: false,
        index: 0,
        photos: [],

        open(photos, index) {
			console.log('carousel store open')
            this.photos = photos
            this.index = index
            this.isOpen = true
        },

        close() {
            this.isOpen = false
        },

		getFullUrl(p, i) {
			if (!p) return ''   // ← guard against null p

			const trackId = Alpine.store('tracks').activeTrackId
			const picPointer = p.picIndex ?? i

			console.log(`${constants.APIV2_BASE_URL}/tracks/${trackId}/picture/${picPointer}`)

			return `${constants.APIV2_BASE_URL}/tracks/${trackId}/picture/${picPointer}`
		}

    })
}
