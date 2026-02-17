import {
    validatePassword,
    validateRepassword,
	validateAll
} from '../utils/validation.js'

export default function (Alpine) {
    Alpine.data('userInfoModal', () => ({

        currentPassword: '',
		newPassword: '',
        confirmPassword: '',
        errorField: null,

        init() {
            this.$watch('$store.ui.showUserInfoModal', value => {
                if (value) this.clearForm()
            })
        },

        clearForm() {
            this.newPassword = ''
            this.confirmPassword = ''

            this.$store.ui.error = null
            this.errorField = null
        },

		validators: {
			update: {
				currentPassword(value) {
					if (!value) return 'Current password is required'
					return null
				},

				newPassword: validatePassword,

				confirmPassword(value, state) {
					return validateRepassword(value, {
						regPassword: state.newPassword
					})
				}
			}
		},

		async update() {
			if (!validateAll('update', this)) return

			const result = await this.$store.user.changePassword(
				this.currentPassword,
				this.newPassword
			)

			if (!result.ok) return

			this.$store.ui.showInfo('Your password has been updated')

			this.clearForm()

			setTimeout(() => {
				this.$store.ui.showUserInfoModal = false
			}, 2000)
		}

    }))
}
