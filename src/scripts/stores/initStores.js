
import descWidth from '../alpine-plugins/formatting.js'
import loginModal from '../alpine-plugins/loginModal.js'
import userInfoModal from '../alpine-plugins/userInfoModal.js'
import initTracksStore from './tracks.js'
import initUserStore from './user.js'
import initUiStore from './ui.js'

export default  function initStores(Alpine) {
	Alpine.plugin(descWidth)
	Alpine.plugin(loginModal)
	Alpine.plugin(userInfoModal)
	initUiStore(Alpine)
	initTracksStore(Alpine)
	initUserStore(Alpine)
}