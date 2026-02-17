export default function initUiStore(Alpine) {
	Alpine.store('ui', {
		showSearchCenterModal: false,
		showLoginModal: false,
		showUserInfoModal: false,
		error: null,
		info: null,
		showInfo(message, duration = 2000) {
			this.info = message

			setTimeout(() => {
				this.info = null
			}, duration)
		}
	})
}