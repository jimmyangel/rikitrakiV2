import { getToken } from '../data/getToken.js'
import { getResetToken } from '../data/getResetToken.js'
import { updateUserProfile } from '../data/updateUserProfile.js'
import { createUser } from '../data/createUser.js'
import { setUsernamePath } from '../utils/history.js'
import { getUsernameFromUrl } from '../utils/env.js'

export default function initUserStore(Alpine) {

    Alpine.store('user', {

        username: null,
        token: null,
		usernameFromUrl: null,

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
			const a = localStorage.getItem('rikitraki-isAdmin')

			this.usernameFromUrl = getUsernameFromUrl()

			if (u && t) {
				this.username = u
				this.token = t
				this.isAdmin = a === '1'
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

			// Decode JWT payload
			const payload = decodeJwt(token)

			this.username = username
			this.token = token
			this.isAdmin = payload.isAdmin === true

			// Persist essentials
			localStorage.setItem('rikitraki-username', username)
			localStorage.setItem('rikitraki-token', token)

			// Only store admin flag if true
			if (this.isAdmin) {
				localStorage.setItem('rikitraki-isAdmin', '1')
			} else {
				localStorage.removeItem('rikitraki-isAdmin')
			}

			return true
		},

		logout() {
			this.username = null
			this.token = null
			this.error = null
			this.isAdmin = false

			localStorage.removeItem('rikitraki-username')
			localStorage.removeItem('rikitraki-token')
			localStorage.removeItem('rikitraki-isAdmin')
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
        // URL username handling
        //
		applyUsernameToUrl() {
			if (!this.username) return
			setUsernamePath(this.username)
			this.usernameFromUrl = getUsernameFromUrl()
			Alpine.store('tracks').loadMotd()
		},

		removeUsernameFromUrl() {
			setUsernamePath(null)
			this.usernameFromUrl = null
			Alpine.store('tracks').loadMotd()
		},

		applyAnyUsernameToUrl(username) {
			if (!username) return
			if (this.usernameFromUrl === username) return

			setUsernamePath(username)
			this.usernameFromUrl = getUsernameFromUrl()
			Alpine.store('tracks').loadMotd()
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

function decodeJwt(token) {
    try {
        const payload = token.split('.')[1]
        const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'))
        return JSON.parse(json)
    } catch (e) {
        return {}
    }
}
