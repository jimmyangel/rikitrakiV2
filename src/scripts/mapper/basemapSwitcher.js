import { imageryProviders } from './basemaps.js'

export function switchBasemap(viewer, index) {
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


