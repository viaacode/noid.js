import { Command, Option } from 'commander'
import shlex from 'shlex'
import fs from 'fs'
import ini from 'ini'
import process from 'process'

export const DEFAULT_NAA = ''
export const DEFAULT_SCHEME = 'ark:/'
export const DEFAULT_TEMPLATE = 'zeeddk'

const program = new Command()

program
    .name('noid')
    .description('generate nice and opaque identifiers')
    .argument('[noid]', 'a noid')
    .option('-c, --config-file <path>', 'path to a config file with a noid section', null)
    .addOption(new Option('-V, --validate', 'validate the given noid').default(false).conflicts('checkDigit'))
    .addOption(new Option('-d, --check-digit', 'compute and print the corresponding check digit for the given noid').default(false).conflicts('validate'))
    .option('-s, --scheme <scheme>', 'the noid scheme', DEFAULT_SCHEME)
    .option('-N, --naa <naa>', 'the name assigning authority (NAA) number', DEFAULT_NAA)
    .option('-t, --template <template>', 'the template by which to generate noids', DEFAULT_TEMPLATE)
    .option('-n, --index <number>', 'a number for which to generate a valid noid', parseInt, -1)
    .option('-v, --verbose', 'turn on verbose text', false)

// Throw error instead of exit
program.exitOverride();

class ConfigParser {
    constructor() {
        this.config = {}
    }

    read(filePath) {
        const fileContent = fs.readFileSync(filePath, 'utf-8')
        this.config = ini.parse(fileContent)
    }

    sections() {
        return Object.keys(this.config)
    }

    get(section, option, raw = false) {
        const value = this.config[section][option] || null
        //TODO figure out raw
        return raw ? value : value
    }

    toString() {
        let string = ""
        for (const section of this.sections()) {
            string += `[${section}]\n`
            for (const option in this.config[section]) {
                string += `${option} = ${this.get(section, option, true)}\n`
            }
            string += "\n"
        }
        return string
    }
}

function readConfigs(configFile) {
    const configs = new ConfigParser()
    configs.read(configFile)
    return configs
}

export function parseArgs() {
    program.parse()
    const options = program.opts()

    if (options.configFile) {
        if (options.verbose) {
            console.error(`using configs: ${options.configFile}`)
        }
        const configs = readConfigs(options.configFile)
        const configOptions = ['template', 'scheme', 'naa']
        if (configs.sections().includes('noid')) {
            for (const o of configOptions) {
                if (o in configs.config.noid) {
                    options[o] = configs.get('noid', o)
                } else {
                    console.error(`warning: configs missing option '${o}'; using default value (${options[o]})`)
                }
            }
        } else {
            console.error(`warning: config file '${options.configFile}' lacks 'noid' section; ignoring config file`)
        }
    }

    if ((options.validate || options.checkDigit) && !program.args[0]) {
        console.error("error: missing noid to validate")
        return null
    }
    return { ...options, noid: program.args[0] || null }
}

export default function cli(cmd) {
    process.argv = ['node', ...shlex.split(cmd)]
    return parseArgs()
}


