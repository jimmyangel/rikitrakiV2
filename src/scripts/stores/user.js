import { getToken } from '../data/getToken.js'
import { getResetToken } from '../data/getResetToken.js'
import { updateUserProfile } from '../data/updateUserProfile.js'
import { createUser } from '../data/createUser.js'
import { setUsernamePath } from '../utils/history.js'

export default function initUserStore(Alpine) {

    Alpine.store('user', {

        username: null,
        token: null,

        //
        // Derived state
        //
        get isLoggedIn() {
            return !!this.token
        },

        //
        // Init: load from localStorage
        //
        init() {
            const u = localStorage.getItem('rikitraki-username')
            const t = localStorage.getItem('rikitraki-token')

            if (u && t) {
                this.username = u
                this.token = t
            }
        },

        //
        // Actions
        //
        async login(username, password) {
            Alpine.store('ui').error = null

            const { token, error } = await getToken(username, password)

            if (error) {
                Alpine.store('ui').error = error
                return false
            }

            this.username = username
            this.token = token

            localStorage.setItem('rikitraki-username', username)
            localStorage.setItem('rikitraki-token', token)

            return true
        },

        logout() {
            this.username = null
            this.token = null
            this.error = null

            localStorage.removeItem('rikitraki-username')
            localStorage.removeItem('rikitraki-token')
        },

		async changePassword(currentPassword, newPassword) {
			// Clear UI errors
			Alpine.store('ui').error = null

			// Must be logged in
			if (!this.username) {
				const msg = 'Not logged in'
				Alpine.store('ui').error = msg
				return { ok: false, error: msg }
			}

			// Call backend
			const result = await updateUserProfile(
				this.username,
				currentPassword,
				newPassword
			)

			// Handle failure
			if (!result.ok) {
				Alpine.store('ui').error = result.error
				return result
			}

			// Success
			return { ok: true }
		},

        //
        // Canonical URL username handling
        //
		applyUsernameToUrl() {
			if (!this.username) return
			setUsernamePath(this.username)
		},

		removeUsernameFromUrl() {
			setUsernamePath(null)
		},

		async reset(email) {
			Alpine.store('ui').error = null

			const result = await getResetToken(email)

			if (!result.ok) {
				Alpine.store('ui').error = result.error
				return false
			}

			return true
		},

		async register(username, email, password) {
			// Clear UI errors
			Alpine.store('ui').error = null

			// Build return URL (same as reset flow)
			const rturl = window.location.origin + '/'

			// Call backend
			const result = await createUser(username, email, password, rturl)

			// Handle failure
			if (!result.ok) {
				Alpine.store('ui').error = result.error
				return false
			}

			// Success
			return true
		}
    })
}
