export function startDrag(state, index) {
    state.dragIndex = index
}

export function dropOn(state, index) {
    if (state.dragIndex === null || state.dragIndex === index) return

    // Move UI arrays (always index-aligned)
    const movedPhoto = state.trackPhotos.splice(state.dragIndex, 1)[0]
    const movedMeta = state.photoMeta.splice(state.dragIndex, 1)[0]

    state.trackPhotos.splice(index, 0, movedPhoto)
    state.photoMeta.splice(index, 0, movedMeta)

    if (state.idPrefix === 'upload') {
        // UPLOAD MODE: photos[] is index-aligned
        if (state.photos) {
            const movedFile = state.photos.splice(state.dragIndex, 1)[0]
            state.photos.splice(index, 0, movedFile)
        }
    } else {
        // EDIT MODE: reorder by picIndex
        const picIndex = movedPhoto.picIndex
        if (state.photos && state.photos.length > 0) {
            const i = state.photos.findIndex(p => p.picIndex === picIndex)
            if (i !== -1) {
                const movedFile = state.photos.splice(i, 1)[0]
                state.photos.splice(index, 0, movedFile)
            }
        }
    }

    state.dragIndex = null
}

export function deletePhoto(state, index) {
    const removed = state.trackPhotos[index]

    // Remove from UI arrays (always index-aligned)
    state.trackPhotos.splice(index, 1)
    state.photoMeta.splice(index, 1)

    if (state.idPrefix === 'upload') {
        // UPLOAD MODE: photos[] is index-aligned
        if (state.photos) {
            state.photos.splice(index, 1)
        }
    } else {
        // EDIT MODE: photos[] contains only new files, match by picIndex
        const removedPicIndex = removed.picIndex
        if (state.photos && state.photos.length > 0) {
            const i = state.photos.findIndex(p => p.picIndex === removedPicIndex)
            if (i !== -1) state.photos.splice(i, 1)
        }
    }

    state.dragIndex = null
    state.hasPhotos = state.trackPhotos.length > 0
}



