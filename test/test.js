import cli, { DEFAULT_NAA, DEFAULT_SCHEME, DEFAULT_TEMPLATE } from '../src/cli'
import { mint } from '../src/noid'
import {
    DIGIT, XDIGIT
} from '../src/util.js'
import { jest } from '@jest/globals'
import fs from 'fs'
import path from 'path'
import os from 'node:os'
import {CommanderError} from 'commander'

const BASE_DIR = path.resolve(path.dirname(''))
const CONFIG_FILE = path.join(BASE_DIR, 'noid', 'noid.cfg')

describe('Command-line', () => {
    test('test_default', () => {
        const args = cli('noid')
        expect(args.noid).toBeNull()
        expect(args.configFile).toBeNull()
        expect(args.validate).toBe(false)
        expect(args.scheme).toBe(DEFAULT_SCHEME)
        expect(args.naa).toBe(DEFAULT_NAA)
        expect(args.template).toBe(DEFAULT_TEMPLATE)
        expect(args.index).toBe(-1)
        expect(args.verbose).toBe(false)
    })

    test('test_validate', () => {
        expect(cli('noid -V')).toBeNull()
    })

    test('test_check_digit', () => {
        const args = cli('noid -d 123456')
        expect(args.noid).toBe('123456')
        expect(args.check_digit).toBe(true)
        expect(() => cli('noid -d -V 123456')).toThrow(CommanderError)
    })

    test('test_config', () => {
        const args = cli(`noid -c ${CONFIG_FILE}`)
        expect(args.noid).toBeNull()
        expect(args.configFile).toBe(CONFIG_FILE)
        expect(args.validate).toBe(false)
        expect(args.scheme).toBe('http://')
        expect(args.naa).toBe('83812')
        expect(args.template).toBe('zeeeeddddk')
        expect(args.index).toBe(-1)
        expect(args.verbose).toBe(false)
        const configs = read_configs(args)
        console.log(configs)
        // /(?ms:.*\[noid\].*template.*scheme.*naa.*)/
        expect(configs).toMatch(/(ms:.*\[noid\].*template.*scheme.*naa.*)/)
    })

    test('test_missing_noid_validate', () => {
        expect(cli('noid -V')).toBeNull()
    })

    test('test_invalid_configs', () => {
        const _configs1 = `[noids]\ntemplate = zeedddeeek\nscheme = doi:\nnaa = 1234\n`
        const tempConfigs1 = fs.mkdtempSync(path.join(os.tmpdir(), 'config-'))
        fs.writeFileSync(tempConfigs1, _configs1)
        console.error = jest.fn()
        cli(`noid -c ${tempConfigs1}`)
        expect(console.error).toMatch(/(ms:^warning: config file .* lacks 'noid' section.*ignoring.*)/)

        const _configs2 = `[noid]\ntemplates = zeedddeeek\nschemes = doi:\nnaat = 1234\n`
        const tempConfigs2 = fs.mkdtempSync(path.join(os.tmpdir(), 'config-'))
        fs.writeFileSync(tempConfigs2, _configs2)
        console.error = jest.fn()
        cli(`noid -c ${tempConfigs2}`)
        // /(?ms:^warning: configs missing option 'template'.*missing option 'scheme'.*missing option 'naa'.*)/
        expect(console.error).toMatch(/(ms:^warning: configs missing option 'template'.*missing option 'scheme'.*missing option 'naa'.*)/)
    })
})

describe('API', () => {
    test('test_mint', () => {
        const args = cli('noid')
        const noid = mint({ template: args.template, n: args.index, scheme: args.scheme, naa: args.naa })
        expect(noid).toMatch(/^ark[:][/][\w\d]+/)
    })

    test('test_mint_index', () => {
        const index = Math.floor(Math.random() * 1000)
        const args = cli(`noid -n ${index}`)
        const noid1 = mint({ template: args.template, n: args.index, scheme: args.scheme, naa: args.naa })
        const noid2 = mint({ template: args.template, n: args.index, scheme: args.scheme, naa: args.naa })
        expect(noid1).toBe(noid2)
    })

    test('test_mint_scheme', () => {
        const index = Math.floor(Math.random() * (9000 - 1000 + 1)) + 1000
        const args = cli(`noid --scheme doi: --index ${index}`)
        const noid = mint({ template: args.template, n: args.index, scheme: args.scheme, naa: args.naa })
        expect(noid).toMatch(/^doi[:][\w\d]+/)
        const args2 = cli(`noid --index ${index}`)
        const noid2 = mint({ template: args2.template, n: args2.index, scheme: args2.scheme, naa: args2.naa })
        const _noid = noid.match(/doi[:](?<noid>[\w]+)/).groups.noid
        const _noid2 = noid2.match(/ark[:][/](?<noid>[\w]+)/).groups.noid
        expect(_noid).toBe(_noid2)
    })

    test('test_mint_template_with_prefix', () => {
        const args = cli('noid --template empiar.dddddk')
        const noid = mint({ template: args.template, n: args.index, scheme: args.scheme, naa: args.naa })
        expect(noid).toMatch(/.*empiar\.[\w\d]+/)
    })

    test('test_mint_with_naa', () => {
        const naa = Math.floor(Math.random() * (99999 - 9999 + 1)) + 9999
        const args = cli(`noid --naa ${naa}`)
        const noid = mint({ template: args.template, n: args.index, scheme: args.scheme, naa: args.naa })
        expect(noid).toMatch(new RegExp(`^ark[:][/]{1}${naa}[/][\\w\\d]+`))
    })

    test('test_mint_combined', () => {
        const naa = Math.floor(Math.random() * (99999 - 9999 + 1)) + 9999
        const index = Math.floor(Math.random() * (99999 - 9999 + 1)) + 9999
        const args = cli(`noid --scheme https:// --naa ${naa} --index ${index} --template zeeeeek`)
        const noid = mint({ template: args.template, n: args.index, scheme: args.scheme, naa: args.naa })
        expect(noid).toMatch(new RegExp(`^https[:][/]{{2}}${naa}[/][\\w\\d]+`))
    })

    test('test_mint_invalid_template', () => {
        const args = cli('noid --template abcdefg')
        const noid = mint({ template: args.template, n: args.index, scheme: args.scheme, naa: args.naa })
        expect(noid).toBe('')
    })
})

describe('Noid', () => {
    test('test_default', () => {
        cli('noid -v')
        const output = main()
        expect(output).toMatch(/(ms:^info: generating noid.*template=.*scheme=.*ark[:][/][\w\d]+)/)
    })

    test('test_error', () => {
        cli('noid -V')
        const ex = main()
        expect(ex).toBe(os.EX_USAGE)
    })

    test('test_config', () => {
        cli(`noid -v -c ${CONFIG_FILE}`)
        const output = main()
        expect(output).toMatch(/(ms:^info: generating noid.*template=zeeeeddddk.*scheme=http[:][/][/].*naa=83812.*http[:][/][/]83812[/][\w\d]+)/)
    })

    test('test_validate', () => {
        const noid = mint({ template: 'zeeeek' })
        cli(`noid -v -V ${noid}`)
        const output = main()
        expect(output).toMatch(new RegExp(`(ms:^info: validating '${noid}'.*'${noid}' valid[?] True)`))
    })

    test('test_check_digit', () => {
        const noid = '123456'
        const check_digit = calculate_check_digit(noid)
        cli(`noid -v -d ${noid}`)
        const output = main()
        expect(output).toMatch(new RegExp(`(ms:^info: computing check digit for '${noid}'.*${check_digit})`))
    })

    test('test_scheme_naa_template', () => {
        cli('noid -v -t zeeddk -s https:// -N 54321')
        const output = main()
        expect(output).toMatch(/(ms:^info: generating noid.*template=zeeddk.*scheme=https[:][/][/].*naa=54321.*https[:][/][/]54321[/][\w\d]+)/)
    })

    test('test_index', () => {
        const index = Math.floor(Math.random() * (2000 - 1000 + 1)) + 1000
        cli(`noid -v -n ${index}`)
        const output = main()
        expect(output).toMatch(new RegExp(`(ms:^info: generating noid.*template=zeeddk.*n=${index}.*scheme=ark[:][/].*naa=.*ark[:][/][\\w\\d]+)`))
    })
})

describe('Utils', () => {
    test('test_validate_mask', () => {
        expect(validate_mask('zek')).toBe(true)
        expect(validate_mask('ze')).toBe(true)
        expect(validate_mask('zdk')).toBe(true)
        expect(validate_mask('zd')).toBe(true)
        expect(validate_mask('zededededdeeddk')).toBe(true)
        expect(validate_mask('zededededdeedd')).toBe(true)
        expect(validate_mask('rek')).toBe(true)
        expect(validate_mask('re')).toBe(true)
        expect(validate_mask('rdk')).toBe(true)
        expect(validate_mask('rd')).toBe(true)
        expect(validate_mask('rededededdeeddk')).toBe(true)
        expect(validate_mask('rededededdeedd')).toBe(true)
        expect(validate_mask('sek')).toBe(true)
        expect(validate_mask('se')).toBe(true)
        expect(validate_mask('sdk')).toBe(true)
        expect(validate_mask('sd')).toBe(true)
        expect(validate_mask('sededededdeeddk')).toBe(true)
        expect(validate_mask('sededededdeedd')).toBe(true)
        expect(validate_mask('ek')).toBe(true)
        expect(validate_mask('e')).toBe(true)
        expect(validate_mask('dk')).toBe(true)
        expect(validate_mask('d')).toBe(true)
        expect(validate_mask('ededededdeeddk')).toBe(true)
        expect(validate_mask('ededededdeedd')).toBe(true)
        expect(validate_mask('a')).toBe(false)
        expect(validate_mask('aa')).toBe(false)
        expect(validate_mask('zeeedddl')).toBe(false)
        expect(validate_mask('zeeedtddl')).toBe(false)
        expect(validate_mask('zeeedtdd')).toBe(false)
        expect(validate_mask('adddeeew')).toBe(false)
    })

    test('test_get_noid_range', () => {
        const xsize = XDIGIT.length
        const dsize = DIGIT.length
        expect(get_noid_range('zedek')).toBe(xsize ** 2 * dsize)
        expect(get_noid_range('zddddk')).toBe(dsize ** 4)
        expect(get_noid_range('zeeeek')).toBe(xsize ** 4)
        expect(get_noid_range('seee')).toBe(xsize ** 3)
        expect(get_noid_range('rddee')).toBe(dsize ** 2 * xsize ** 2)
    })

    test('test_remove_prefix', () => {
        expect(remove_prefix('something.eedeede')).toEqual(['something.', 'eedeede'])
        expect(remove_prefix('eedeede')).toEqual(['', 'eedeede'])
        expect(remove_prefix('something.eedeedek')).toEqual(['something.', 'eedeedek'])
        expect(remove_prefix('eedeedek')).toEqual(['', 'eedeedek'])
        expect(remove_prefix('something.reddek')).toEqual(['something.', 'reddek'])
        expect(remove_prefix('reddek')).toEqual(['', 'reddek'])
    })
})

describe('Tests', () => {
    test('test_naa_append', () => {
        const noid = mint({ naa: 'abc' })
        expect(noid.startsWith('abc/')).toBe(true)
    })

    test('test_scheme_append', () => {
        const schemes = ['doi:', 'ark:/', 'http://']
        for (const scheme of schemes) {
            const noid = mint({ scheme })
            expect(noid.startsWith(scheme)).toBe(true)
        }
    })

    test('test_mint_short_term', () => {
        const noid = mint()
        expect(noid.startsWith(SHORT)).toBe(true)
    })

    test('test_mint_ns', () => {
        const ns = Array.from({ length: DIGIT.length }, (_, i) => i)
        for (const n of ns) {
            expect(mint('d', n)).toBe(DIGIT[n])
        }
        const nsX = Array.from({ length: XDIGIT.length }, (_, i) => i)
        for (const n of nsX) {
            expect(mint('e', n)).toBe(XDIGIT[n])
        }
    })

    test('test_namespace_overflow', () => {
        expect(mint({ template: 'd', n: DIGIT.length + 1 })).toBe('')
        expect(mint({ template: 'e', n: XDIGIT.length + 1 })).toBe('')
    })

    test('test_mint_z_rollover', () => {
        expect(mint('zd', DIGIT.length)).toBe('10')
        expect(mint('ze', XDIGIT.length)).toBe('10')
    })

    test('test_validate_valid', () => {
        const valid = 'test31wqw0ws7'
        const valid_scheme = 'ark:/test31wqw0ws7'
        expect(validate(valid)).toBe(true)
        expect(validate(valid_scheme)).toBe(true)
    })

    test('test_validate_invalid', () => {
        const invalid = 'test31qww0wsr'
        const invalid_scheme = 'ark:/test31qww0wsr'
        expect(validate(invalid)).toBe(false)
        expect(validate(invalid_scheme)).toBe(false)
    })

    test('test_checkdigit', () => {
        expect(mint('eek', 100)).toBe('1Hs')
        expect(validate('K1w')).toBe(false)
    })
})