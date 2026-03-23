export default function initUiStore(Alpine) {
	Alpine.store('ui', {
		showSearchCenterModal: false,
		showLoginModal: false,
		showUserInfoModal: false,
		showUploadTrackModal: false,
		showEditTrackModal: false,
		showInfoModal: false,
		showWelcomeModal: false,
		showMapHelpModal: false,
		error: null,
		errorField: '',
		info: null,
		showInfo(message, duration = 2000) {
			this.info = message

			setTimeout(() => {
				this.info = null
			}, duration)
		}
	})
	document.addEventListener('alpine:initialized', () => {
		requestAnimationFrame(() => {
		if (!localStorage.getItem('rikitraki-hasSeenWelcome_v2')) {
			Alpine.store('ui').showWelcomeModal = true
		}
		})
	})
}