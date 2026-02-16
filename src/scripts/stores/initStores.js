
import descWidth from '../alpine-plugins/formatting.js'
import loginModal from '../alpine-plugins/loginModal.js'
import initTracksStore from './tracks.js'
import initUserStore from './user.js'

export default  function initStores(Alpine) {
	Alpine.plugin(descWidth)
	Alpine.plugin(loginModal)
	initTracksStore(Alpine)
	initUserStore(Alpine)

	Alpine.store('ui', {
		showSearchCenterModal: false,
		showLoginModal: false,
		showUserInfoModal: false
	})
}