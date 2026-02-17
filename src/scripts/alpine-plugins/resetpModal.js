
import { validatePassword, validateRepassword, validateAll } from '../utils/validation.js'

export default function (Alpine) {
		Alpine.data('resetpModal', () => ({

			// STATE
			modalOpen: true,
			showCard: false,

			newPassword: '',
			confirmPassword: '',
			errorField: null,

			success: false,

			// These will eventually come from URL params
			username: null,
			token: null,

			// INIT
			init() {
				// Trigger slide‑down animation
				setTimeout(() => {
					this.showCard = true
				}, 10)

				// Placeholder: parse URL params later
				// const params = new URLSearchParams(window.location.search)
				// this.username = params.get('username')
				// this.token = params.get('token')
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

			reset() {
				console.log('validate first')
				if (!validateAll('reset', this)) return
				console.log('success')
				this.success = true
			}

	}))

}
