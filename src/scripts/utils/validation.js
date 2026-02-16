export function validateEmail(value) {
    if (!value) return 'Email is required'
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return re.test(value) ? null : 'Please enter a valid email'
}

export function validateUsername(value) {
    if (!value) return 'Username is required'
    if (value.length < 6 || value.length > 40) {
        return 'Username must be 6–40 characters'
    }
    const re = /^[^~,;%`'"<>{}()[\]/]*$/
    return re.test(value) ? null : 'Invalid characters in username'
}

export function validatePassword(value) {
    if (!value) return 'Password is required'
    if (value.length < 6 || value.length > 18) {
        return 'Password must be 6–18 characters'
    }
    return null
}

export function validateRepassword(value, form) {
    if (!value) return 'Please repeat your password'
    if (value !== form.regPassword) {
        return 'Passwords do not match'
    }
    return null
}
