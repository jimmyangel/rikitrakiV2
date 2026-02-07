import * as map from '../mapper/map.js'

export function wireResetToSearchCenter(viewer) {
	const el = document.getElementById('resetToSearchCenter')

	el.addEventListener('click', e => {
		e.preventDefault()
		map.flyToTrackDataSource()
	})
}