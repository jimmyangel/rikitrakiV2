import { imageryProviders } from './basemaps.js'

export function switchBasemap(viewer, index) {
    const imageryLayers = viewer.imageryLayers

    // Remove current base layer (layer 0)
    if (imageryLayers.length > 0) {
        imageryLayers.remove(imageryLayers.get(0), true)
    }

    // Add the selected provider
    imageryLayers.addImageryProvider(imageryProviders[index].provider(), 0)
}