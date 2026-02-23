export function isIOS() {
    return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
           (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
}

export function isChromeOniPad() {
    const ua = navigator.userAgent
    return ua.includes('CriOS') && navigator.maxTouchPoints > 1
}

export function getUsernameFromUrl() {
    const seg = window.location.pathname.split('/').filter(Boolean)
    return seg.length === 1 ? seg[0] : null
}
