import {
    validateEmail,
    validateUsername,
    validatePassword,
    validateRepassword,
	validateAll
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

            this.$store.ui.error = null
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
				regRepassword(value, state) {
					return validateRepassword(value, { regPassword: state.regPassword })
				}
            }
        },

        async login() {
            this.$store.ui.error = null
            const ok = await this.$store.user.login(this.username, this.password)
            if (ok) this.$store.ui.showLoginModal = false
        },

		async reset() {
			if (!validateAll('reset', this)) return

			const ok = await this.$store.user.reset(this.email)

			if (ok) {
				this.$store.ui.showInfo('Reset email sent')

				setTimeout(() => {
					this.$store.ui.showLoginModal = false
				}, 2000)
			}
		},

		async register() {
			if (!validateAll('register', this)) return

			const ok = await this.$store.user.register(
				this.regUsername,
				this.regEmail,
				this.regPassword
			)

			if (ok) {
				this.$store.ui.showInfo(
					'Welcome to RikiTraki! Check your email to activate your account.'
				)

				setTimeout(() => {
					this.$store.ui.showLoginModal = false
				}, 3000)
			}
		}


    }))
}

