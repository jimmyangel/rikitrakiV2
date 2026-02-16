import {
    validateEmail,
    validateUsername,
    validatePassword,
    validateRepassword
} from '../utils/validation.js'

export default function (Alpine) {
    Alpine.data('loginModal', () => ({

        tab: 'login',

        username: '',
        password: '',
        email: '',

        regUsername: '',
        regEmail: '',
        regPassword: '',
        regRepassword: '',

		errorField: null,

        init() {
			console.log('loginModal plugin init')
            this.$watch('$store.ui.showLoginModal', value => {
                if (value) this.clearForm()
            })
        },

        clearForm() {
            this.tab = 'login'
            this.username = ''
            this.password = ''
            this.email = ''
            this.regUsername = ''
            this.regEmail = ''
            this.regPassword = ''
            this.regRepassword = ''
            this.$store.user.error = null
			this.errorField = null
        },

        validators: {
            reset: {
                email: validateEmail
            },
            register: {
                regUsername: validateUsername,
                regEmail: validateEmail,
                regPassword: validatePassword,
                regRepassword: validateRepassword
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

        async login() {
            this.$store.user.error = null
            const ok = await this.$store.user.login(this.username, this.password)
            if (ok) this.$store.ui.showLoginModal = false
        },

        async reset() {
            if (!this.validateAll('reset')) return
            await this.$store.user.resetPassword(this.email)
        },

        async register() {
            if (!this.validateAll('register')) return
            await this.$store.user.register(
                this.regUsername,
                this.regEmail,
                this.regPassword
            )
        }

    }))
}

