//
// scripts/stores/user.js
//
import { getToken } from '../data/getToken.js'

export default function initUserStore(Alpine) {

    Alpine.store('user', {

        username: null,
        token: null,
        error: null,

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
            this.error = null

            const { token, error } = await getToken(username, password)

			console.log(error)

            if (error) {
                this.error = error
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
        }
    })
}
