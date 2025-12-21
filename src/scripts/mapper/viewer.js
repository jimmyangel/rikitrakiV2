import { constants } from '../config.js'
import { imageryProviders } from './basemaps.js'
import { wireLayerControl, wireLayerControlToggle, updateAttribution } from './layerControl.js'
import { wireLookDownControl } from './mapLookDownControl.js'
import { Cartesian3, Ion, Math as CesiumMath, Terrain, Viewer, UrlTemplateImageryProvider } from 'cesium'
import * as Cesium from 'cesium'
import 'cesium/Build/Cesium/Widgets/widgets.css'

export const viewer = () => {
	window.CESIUM_BASE_URL = constants.CESIUM_BASE_URL

	Ion.defaultAccessToken = constants.CESIUM_ACCESS_TOKEN

	// Initialize the Cesium Viewer in the HTML element with the `cesiumContainer` ID.
	const viewer = new Viewer('cesiumContainer', {
		baseLayerPicker: false,
		imageryProvider: false,
		animation: false,
		fullscreenButton: false,
		geocoder: false,
		homeButton: false,
		infoBox: false,
		sceneModePicker: false,
		selectionIndicator: false,
		timeline: false,
		navigationHelpButton: false,
		navigationInstructionsInitiallyVisible: false,
		scene3DOnly: true,
		terrain: Terrain.fromWorldTerrain(),
		terrainExaggeration: 2
	})

	imageryProviders[0].providers.forEach(providerFn => {
		viewer.imageryLayers.addImageryProvider(providerFn())
	})
	
	updateAttribution(0)

	//viewer.cesiumWidget._creditContainer.style.display = 'none'

	wireLayerControl(viewer)
	wireLayerControlToggle()
	wireLookDownControl(viewer)
}
