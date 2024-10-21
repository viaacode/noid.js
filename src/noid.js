import os from 'os'
import crypto from 'crypto'
import {
    validateMask,
    removePrefix,
    getNoidRange,
    DIGIT, XDIGIT, CHECKDIG, GENTYPES
} from './util.js'
import { parseArgs } from './cli.js'
import process from 'process'

/**
 * Mint identifiers according to template with a prefix of scheme + naa.
 *
 * @param {string} template - a string consisting of GENTYPE + (DIGTYPE)+ [+ CHECKDIGIT]
 * @param {number} n - a number to convert to a noid; default is -1 meaning create from random number
 * @param {string} scheme - a scheme e.g. 'ark:/', 'doi:', 'http://', 'https://' etc.
 * @param {string} naa - name assigning authority (number); can also be a string
 * @returns {string} a valid noid with/out check digit or the empty string (failure)
 *
 * Template is of form [mask] or [prefix].[mask] where prefix is any URI-safe string and mask is a string of any
 * combination 'e' and 'd', optionally beginning with a mint order indicator ('r'|'s'|'z') and/or ending
 * with a checkdigit ('k'):
 *
 * Example Templates:
 * d      : 0, 1, 2, 3
 * zek    : 00, xt, 3f0, 338bh
 * 123.zek: 123.00, 123.xt, 123.3f0, 123.338bh
 * seddee : 00000, k50gh, 637qg
 * seddeek: 000000, k06178, b661qj
 *
 * The result is appended to the scheme and naa as follows: scheme + naa + '/' + [id].
 *
 * There is no checking to ensure ids are not reminted. Instead, minting can be controlled by supplying a (int)
 * value for 'n'. It is possible to implement ordered or random minting from available ids by manipulating this
 * number from another program. If no 'n' is given, minting is random from within the namespace. An indicator is
 * added between '/' and [id] to mark these ids as for short term testing only. An override may be added later to
 * accommodate applications which don't mind getting used ids.
 *
 * A note about 'r', 's', and 'z': 'z' indicates that a namespace should expand on its first element to accommodate
 * any 'n' value (eg. 'de' becomes 'dde' then 'ddde' as numbers get larger). That expansion can be handled by this
 * method. 'r' and 's' (typically meaning 'random' and 'sequential') are recognized as valid values, but ignored
 * and must be implemented elsewhere.
 */
export function mint(template = 'zek', n = -1, scheme = '', naa = '') {
    const [prefix, mask] = removePrefix(template)
    if (!validateMask(mask)) {
        return ''
    }
    if (naa) {
        naa += '/'
    }
    const _noid = generateNoid(mask, n)
    let noid = `${scheme}${naa}${prefix}${_noid}`
    if (CHECKDIG.includes(mask[mask.length - 1])) {
        noid = `${noid}${calculateCheckDigit(_noid)}`
    }
    return noid
}

/**
 * The actual noid generation
 *
 * @param {string} mask - the mask string
 * @param {number} n - the number to use (default: -1, random number)
 * @returns {string} the noid or an empty string
 */
function generateNoid(mask, n) {
    if (n < 0) {
        if (GENTYPES.includes(mask[0])) {
            mask = mask.slice(1)
        }
        n = crypto.randomInt(0, getNoidRange(mask))
    }
    const length = n
    let noid = ''

    for (let char of mask.split('').reverse()) {
        let div
        if (char === 'e') {
            div = XDIGIT.length
        } else if (char === 'd') {
            div = DIGIT.length
        } else {
            continue
        }
        const value = n % div
        n = Math.floor(n / div)
        noid += XDIGIT[value]
    }

    if (mask[0] === 'z') {
        const char = mask[1]
        while (n > 0) {
            let div
            if (char === 'e') {
                div = XDIGIT.length
            } else if (char === 'd') {
                div = DIGIT.length
            } else {
                console.error(`error: template mask is corrupt; cannot process character: ${char}`)
                return ''
            }
            const value = n % div
            n = Math.floor(n / div)
            noid += XDIGIT[value]
        }
    }

    if (n > 0) {
        console.error(`error: cannot mint a noid for (counter = ${length}) within this namespace.`)
        return ''
    }
    return noid.split('').reverse().join('')
}

/**
 * Checks if the final character is a valid checkdigit for the id. Will fail for ids with no checkdigit.
 *
 * This will also attempt to strip scheme strings (eg. 'doi:', 'ark:/') from the beginning of the string.
 * This feature is limited, however, so if you haven't tested with your particular namespace,
 * it's best to pass in ids with that data removed.
 *
 * @param {string} noid - a noid to validate
 * @returns {boolean} whether or not the noid is valid
 */
export function validate(noid) {
    return calculateCheckDigit(noid.slice(0, -1)) === noid[noid.length - 1]
}

/**
 * Given a noid determine the check digit to be appended from the alphabet
 *
 * @param {string} noid - a valid noid string
 * @returns {string} a single character that is a check digit for the noid
 */
export function calculateCheckDigit(noid) {
    try {
        if (noid[3] === ':') {
            noid = noid.slice(4).replace(/^\/+/, '')
        }
    } catch (error) {
        console.error(error)
    }

    function indexOf(x) {
        try {
            return XDIGIT.indexOf(x)
        } catch (error) {
            console.error(`error: invalid character '${x}'; digits should be in '${XDIGIT.join('')}: '`, error)
            return 0
        }
    }

    const total = noid.split('').map((char, i) => indexOf(char) * (i + 1))
    const index = total.reduce((a, b) => a + b, 0) % XDIGIT.length
    return XDIGIT[index]
}

/**
 * Main entry point
 */
function main() {
    const args = parseArgs()
    if (args === null) {
        return os.constants.errno.EINVAL
    }
    if (args.validate) {
        if (args.verbose) {
            console.error(`info: validating '${args.noid}'...`)
        }
        console.log(`'${args.noid}' valid? ${validate(args.noid)}`)
    } else if (args.check_digit) {
        if (args.verbose) {
            console.error(`info: computing check digit for '${args.noid}'...`)
        }
        const checkDigit = calculateCheckDigit(args.noid)
        console.log(checkDigit)
    } else {
        if (args.verbose) {
            console.error(`info: generating noid using template=${args.template}, n=${args.index}, scheme=${args.scheme}, naa=${args.naa}...`)
        }
        const noid = mint(args.template, args.index, args.scheme, args.naa)
        console.log(noid)
    }
    return 0
}

if (import.meta.url === `file://${process.argv[1]}`) {
    main()
}

