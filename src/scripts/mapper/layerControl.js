
import { imageryProviders } from './basemaps.js'

function switchBasemap(viewer, index) {
	const layers = viewer.imageryLayers

	// Remove all existing imagery layers
	while (layers.length > 0) {
		layers.remove(layers.get(0), true)
	}

	// Add all providers for the selected basemap
	const basemap = imageryProviders[index]
	basemap.providers.forEach(providerFn => {
		layers.addImageryProvider(providerFn())
	})
}

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






