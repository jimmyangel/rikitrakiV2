export default function initUiStore(Alpine) {
	Alpine.store('ui', {
		showSearchCenterModal: false,
		showLoginModal: false,
		showUserInfoModal: false,
		showUploadTrackModal: false,
		showEditTrackModal: false,
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
}