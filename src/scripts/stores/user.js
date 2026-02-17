import { getToken } from '../data/getToken.js'
import { getResetToken } from '../data/getResetToken.js'
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

        //
        // Change password (placeholder backend call)
        //
        async changePassword(newPassword) {
            Alpine.store('ui').error = null

            // TODO: real backend call
            const ok = false // placeholder

            if (!ok) {
                Alpine.store('ui').error = 'Password update failed'
                return false
            }

            return true
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
		}

    })
}
