import { enter2DMode, enter3DMode } from './mapMode.js'
import { globeSVG, mapSVG } from './icons.js'

export function wireMapModeControl(viewer, Cesium) {
  let mode = '3d'

  const toggle = e => {
    e.preventDefault()

    if (mode === '2d') {
      enter3DMode(viewer)
      mode = '3d'
    } else {
      enter2DMode(viewer, Cesium)
      mode = '2d'
    }

    const icon = document.getElementById('mapModeToggleIcon')
    icon.innerHTML = mode === '3d' ? mapSVG : globeSVG 
  }

  document
    .getElementById('mapModeToggle')
    .addEventListener('click', toggle)
}

