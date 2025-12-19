
import { imageryProviders } from './basemaps.js'
import { switchBasemap } from './basemapSwitcher.js'

export function wireLayerControl(viewer) {
    const control = document.getElementById('layerControl')
    const radios = document.querySelectorAll('.basemap-layer')

    radios.forEach(radio => {
        radio.addEventListener('change', e => {
        const index = Number(e.target.value)

        // Switch the Cesium basemap
        switchBasemap(viewer, index)
        updateAttribution(index)

        // Close the control after selection
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

    // Optional: close when clicking outside
    document.addEventListener('click', e => {
        if (!control.contains(e.target)) {
            control.classList.remove('map-control-layers-expanded')
        }
    })
}

export function updateAttribution(index) {
  const el = document.getElementById('attributionText')
  if (!el) return

  const providerInstance = imageryProviders[index].provider()
  const credit = providerInstance.credit

  const text = credit?.html || credit?.text || ''

  const cesiumLink = `<a href="https://cesium.com" target="_blank" rel="noopener noreferrer">Cesium</a>`

  el.innerHTML = `${cesiumLink} | ${text}`
}