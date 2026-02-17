
import { validatePassword, validateRepassword, validateAll } from '../utils/validation.js'
import { updateUserPassword } from '../data/updateUserPassword.js'

const params = new URLSearchParams(window.location.search)
const RESET_USERNAME = params.get('username')
const RESET_TOKEN = params.get('token')

const cleanUrl = window.location.origin + window.location.pathname
window.history.replaceState({}, '', cleanUrl)

export default function (Alpine) {
    Alpine.data('resetpModal', () => ({

        modalOpen: true,
        showCard: false,

        newPassword: '',
        confirmPassword: '',
        errorField: null,
        success: false,
		invalidLink: false,

        // Use the captured values
        username: RESET_USERNAME,
        token: RESET_TOKEN,

		init() {
			setTimeout(() => {
				this.showCard = true
			}, 10)

			if (!this.username || !this.token)	{ 
				this.invalidLink = true 
			}
		},

		validators: {
			reset: {
				newPassword(value) {
					return validatePassword(value)
				},

				confirmPassword(value, state) {
					return validateRepassword(value, {
						regPassword: state.newPassword
					})
				}
			}
		},

		async reset() {
			if (this.invalidLink) return
			if (!validateAll('reset', this)) return

			if (!this.username || !this.token) {
				this.errorField = 'newPassword'
				this.errors.newPassword = 'Invalid or missing reset token'
				return
			}

			const result = await updateUserPassword(
				this.username,
				this.token,
				this.newPassword
			)

			if (!result.ok) {
				this.errorField = 'newPassword'
				this.errors.newPassword = result.error
				return
			}

			this.success = true
		}
	}))
}
