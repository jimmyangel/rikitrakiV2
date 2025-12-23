export const initUI = () => {
	// Side panel
	const sidePanel = document.querySelector('.side-panel')
	const sidePanelContent = document.querySelector('.side-panel-content')
	const toggleSide = document.getElementById('toggleSidePanel')
	const closeSide = document.querySelector('.side-panel-close-button')

	// Bottom panel
	const bottomPanel = document.querySelector('.bottom-panel')
	const openBottom = document.getElementById('toggleBottomPanel')
	const closeBottom = document.querySelector('.bottom-panel-close-button')

	const openSide = () => {
		toggleSide.classList.add('hidden')
		sidePanel.classList.add('isopen')
		sidePanelContent.classList.add('isopen')
	}

	const closeSidePanel = () => {
		sidePanel.classList.remove('isopen')
		sidePanelContent.classList.remove('isopen')

		const delay = window.innerWidth <= 768 ? 300 : 0

		setTimeout(() => {
			toggleSide.classList.remove('hidden')
		}, delay)
	}

	// Initial state
	openSide()

	// Event listeners
	toggleSide?.addEventListener('click', openSide)
	closeSide?.addEventListener('click', closeSidePanel)

	openBottom?.addEventListener('click', () => {
		bottomPanel.classList.add('isopen')
	})

	closeBottom?.addEventListener('click', () => {
		bottomPanel.classList.remove('isopen')
	})
}
