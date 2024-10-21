export const DIGIT = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9']  // 10
export const XDIGIT = [...DIGIT, 'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w',
    'x', 'y', 'z', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'J', 'K', 'L', 'M', 'N', 'P', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z']
export const GENTYPES = ['r', 's', 'z']
export const DIGTYPES = ['d', 'e']
export const CHECKDIG = ['k']
export const SHORT = ''

// SHORT = '.shrt.';

export function getNoidRange(mask) {
    /** Given the specified mask compute the maximum number of noids available
    * @param {string} mask - the mask; if GENTYPE and CHECKDIG are present they will be ignored; only DIGTYPES are considered
    * @return {number} maxInt - the maximum number of noids
    */
    let maxInt = 1
    for (const c of mask) {
        if (c === 'e') {
            maxInt *= XDIGIT.length
        } else if (c === 'd') {
            maxInt *= DIGIT.length
        }
    }
    return maxInt
}

export function validateMask(mask) {
    /** Check to make sure that we have a valid mask
    * @param {Array} mask - a sequence of characters
    * @return {boolean} - whether or not the mask is valid
    */
    // check the first character
    if (!(GENTYPES.includes(mask[0]) || DIGTYPES.includes(mask[0]))) {
        return false
    }
    // check the last character
    else if (!(CHECKDIG.includes(mask[mask.length - 1]) || DIGTYPES.includes(mask[mask.length - 1]))) {
        return false
    }
    // check all other characters
    else {
        for (const maskchar of mask.slice(1, -1)) {
            if (!DIGTYPES.includes(maskchar)) {
                return false
            }
        }
    }

    return true
}

export function removePrefix(template) {
    /** Split the template into the prefix and mask
    * @param {string} template - a template string
    * @return {Array} - the prefix and mask
    */
    let prefix = ''
    let mask = template
    if (template.includes('.')) {
        [prefix, mask] = template.rsplit('.', 1)
        prefix += '.'
    }
    return [prefix, mask]
}

