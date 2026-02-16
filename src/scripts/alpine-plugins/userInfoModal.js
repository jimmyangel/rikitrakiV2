import {
    validatePassword,
    validateRepassword
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
            this.$store.user.error = null
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

        validateAll(formName) {
            const rules = this.validators[formName]

            for (const field in rules) {
                const value = this[field]
                const error = rules[field](value, this)

                if (error) {
                    this.$store.user.error = error
                    this.errorField = field
                    return false
                }
            }

            this.$store.user.error = null
            this.errorField = null
            return true
        },

        async update() {
            if (!this.validateAll('update')) return

            const ok = await this.$store.user.changePassword(this.newPassword)
            if (!ok) return

            this.clearForm()
        }

    }))
}
