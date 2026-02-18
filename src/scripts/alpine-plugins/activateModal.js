import { activateUser } from '../data/activateUser.js'

const params = new URLSearchParams(window.location.search)
const ACTIVATE_USERNAME = params.get('username')
const ACTIVATE_TOKEN = params.get('token')

// Clean URL (remove query params)
const cleanUrl = window.location.origin + window.location.pathname
window.history.replaceState({}, '', cleanUrl)

export default function (Alpine) {
    Alpine.data('activateModal', () => ({

        modalOpen: true,
        showCard: false,

        errorField: null,
        success: false,
        invalidLink: false,

        username: ACTIVATE_USERNAME,
        token: ACTIVATE_TOKEN,

        init() {
            // Trigger slide‑down animation
            setTimeout(() => {
                this.showCard = true
            }, 10)

            // Validate URL params
            if (!this.username || !this.token) {
                this.invalidLink = true
            }
        },

        async activate() {
            if (this.invalidLink) return

            if (!this.username || !this.token) {
                this.$store.ui.error = 'Invalid or missing activation token'
                return
            }

            const result = await activateUser(
                this.username,
                this.token
            )

            if (!result.ok) {
                this.$store.ui.error = result.error
                return
            }

            // Clear errors and show success
            this.$store.ui.error = null
            this.success = true

            // AUTO‑LOGIN
            localStorage.setItem('rikitraki-username', this.username)
            localStorage.setItem('rikitraki-token', this.token)

            // Redirect to main app after a short delay
            setTimeout(() => {
                window.location.href = '/'
            }, 2000)
        }
    }))
}
