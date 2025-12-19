import { lookDown } from './lookDown.js'

export function wireLookDownControl(viewer) {
  const el = document.getElementById('lookDown')

  el.addEventListener('click', e => {
    e.preventDefault()
    lookDown(viewer)
  })
}
