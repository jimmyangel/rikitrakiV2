document.addEventListener('DOMContentLoaded', () => {
	const sidePanel = document.querySelector('.side-panel')
	const sidePanelContent = document.querySelector('.side-panel-content')
	const toggleSide = document.getElementById('toggleSidePanel')
	const closeSide = document.querySelector('.side-panel-close-button')

	const bottomPanel = document.querySelector('.bottom-panel')
	const openBottom = document.getElementById('toggleBottomPanel')
	const closeBottom = document.querySelector('.bottom-panel-close-button')

	// PANEL OPEN
	const openSide = () => {
		toggleSide.classList.add('hidden') 
		sidePanel.classList.add('isopen')
		sidePanelContent.classList.add('isopen')
	}

	// PANEL CLOSE (with mobile timing delay)
	const closeSidePanel = () => {
		sidePanel.classList.remove('isopen')
		sidePanelContent.classList.remove('isopen')

		// Desktop: no animation → show immediately
		// Mobile: wait for max-height transition (300ms)
		const delay = window.innerWidth <= 768 ? 300 : 0

		setTimeout(() => {
			toggleSide.classList.remove('hidden')
		}, delay)
	}

	// Initial state: open
	openSide()

	// Event listeners
	toggleSide?.addEventListener('click', openSide)
	closeSide?.addEventListener('click', closeSidePanel)

	// Bottom panel 
	openBottom?.addEventListener('click', () => {
		bottomPanel.classList.add('isopen')
	})

	closeBottom?.addEventListener('click', () => {
		bottomPanel.classList.remove('isopen')
	})
})