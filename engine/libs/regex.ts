import RE2 from 're2'

export default function RegEx(pattern: Pattern, flags?: string | Buffer) {
    return typeof pattern === 'string' ? new RE2(pattern, flags) : new RE2(pattern)
}

const regexChars = new RE2(/([\.\^\$\(\[\]\)\|])/g)
export const escapeRegexPattern = (stringOrRegex: string | RE2 | globalThis.RegExp) =>
    typeof stringOrRegex === 'string' ?
        stringOrRegex.replace(regexChars,'\\$1') :
        stringOrRegex.source


export type RegExp = RE2
export type Pattern = string | globalThis.RegExp | Buffer | RE2