export function startDrag(state, index) {
    state.dragIndex = index
}

export function dropOn(state, index) {
    if (state.dragIndex === null || state.dragIndex === index) return

    const movedPhoto = state.trackPhotos.splice(state.dragIndex, 1)[0]
    const movedMeta = state.photoMeta.splice(state.dragIndex, 1)[0]

    state.trackPhotos.splice(index, 0, movedPhoto)
    state.photoMeta.splice(index, 0, movedMeta)

    if (state.photos) {
        const movedFile = state.photos.splice(state.dragIndex, 1)[0]
        state.photos.splice(index, 0, movedFile)
    }

    state.dragIndex = null
}

export function deletePhoto(state, index) {
    state.trackPhotos.splice(index, 1)
    state.photoMeta.splice(index, 1)

    if (state.photos) {
        state.photos.splice(index, 1)
    }

    state.dragIndex = null
    state.hasPhotos = state.trackPhotos.length > 0
}

