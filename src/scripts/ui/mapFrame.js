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

	// Fix: Two‑frame nudge to reset Chrome's phantom scroll on iPad after keyboard close
	if (isChromeOniPad() && window.visualViewport) {
		let last = window.visualViewport.height

		window.visualViewport.addEventListener('resize', () => {
			const now = window.visualViewport.height

			// Keyboard closing → height increases
			if (now > last) {
				requestAnimationFrame(() => {
					document.documentElement.scrollTop = 1

					requestAnimationFrame(() => {
						document.documentElement.scrollTop = 0
					})
				})
			}

			last = now
		})
	}
}

function isChromeOniPad() {
	const ua = navigator.userAgent
	return ua.includes('CriOS') && navigator.maxTouchPoints > 1
}
