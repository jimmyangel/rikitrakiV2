
import descWidth from '../alpine-plugins/formatting.js'
import initTracksStore from './tracks.js'
import initUserStore from './user.js'

export default  function initStores(Alpine) {
	Alpine.plugin(descWidth)
	initTracksStore(Alpine)
	initUserStore(Alpine)

	Alpine.store('ui', {
		showSearchCenterModal: false,
		showLoginModal: false,
		showUserInfoModal: false
	})
}