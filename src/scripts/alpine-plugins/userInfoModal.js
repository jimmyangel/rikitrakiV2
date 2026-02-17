import {
    validatePassword,
    validateRepassword,
	validateAll
} from '../utils/validation.js'

export default function (Alpine) {
    Alpine.data('userInfoModal', () => ({

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

            const ok = await this.$store.user.changePassword(this.newPassword)
            if (!ok) return

            this.clearForm()
        }

    }))
}
