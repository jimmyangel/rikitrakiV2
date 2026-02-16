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

        async login() {
            this.$store.user.error = null
            const ok = await this.$store.user.login(this.username, this.password)
            if (ok) this.$store.ui.showLoginModal = false
        },

        async reset() {
            if (!validateAll('reset', this)) return
            await this.$store.user.resetPassword(this.email)
        },

        async register() {
            if (!validateAll('register', this)) return
            await this.$store.user.register(
                this.regUsername,
                this.regEmail,
                this.regPassword
            )
        }

    }))
}

