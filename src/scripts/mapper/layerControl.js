
import { imageryProviders } from './basemaps.js'
import { switchBasemap } from './basemapSwitcher.js'

export function wireLayerControl(viewer) {
	const control = document.getElementById('layerControl')
	const radios = document.querySelectorAll('.basemap-layer')

	radios.forEach(radio => {
		radio.addEventListener('change', e => {
			const index = Number(e.target.value)

			switchBasemap(viewer, index)

			control.classList.remove('map-control-layers-expanded')
		})
	})
}


export function wireLayerControlToggle() {
	const control = document.getElementById('layerControl')
	const toggle = control.querySelector('.map-control-layers-toggle')

	// Click to toggle open/close
	toggle.addEventListener('click', e => {
		e.preventDefault()
		control.classList.toggle('map-control-layers-expanded')
	})

	// Close when clicking outside
	document.addEventListener('click', e => {
		if (!control.contains(e.target)) {
				control.classList.remove('map-control-layers-expanded')
		}
	})
}






