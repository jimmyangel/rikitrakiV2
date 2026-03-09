// ------------------------------
// Drag start
// ------------------------------
export function startDrag(state, index) {
    state.dragIndex = index
}

// ------------------------------
// Drop on
// ------------------------------
export function dropOn(state, index) {
    const { dragIndex, trackPhotos, photoMeta } = state

    if (dragIndex === null || dragIndex === index) return

    const movedPhoto = trackPhotos.splice(dragIndex, 1)[0]
    const movedMeta = photoMeta.splice(dragIndex, 1)[0]

    trackPhotos.splice(index, 0, movedPhoto)
    photoMeta.splice(index, 0, movedMeta)

    state.dragIndex = null
}

// ------------------------------
// Delete photo
// ------------------------------
export function deletePhoto(state, index) {
    state.trackPhotos.splice(index, 1)
    state.photoMeta.splice(index, 1)
    state.hasPhotos = state.trackPhotos.length > 0
}
