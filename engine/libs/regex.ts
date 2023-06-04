import RE2 from 're2'

/** Create a safe RegEx (RE2) from a RegExp, string or Buffer object */
export default function RegEx(pattern: Pattern, flags?: string | Buffer) {
    return typeof pattern === 'string' ? new RE2(pattern, flags) : new RE2(pattern)
}

const regexChars = new RE2(/([\.\^\$\(\[\]\)\|])/g)
/** Escape RegEx characters from a string, or retrieve a RegEx string from a RegEx */
export const escapeRegexPattern = (stringOrRegex: string | RE2 | globalThis.RegExp) =>
    typeof stringOrRegex === 'string' ?
        stringOrRegex.replace(regexChars,'\\$1') :
        stringOrRegex.source


/** Test if object is a RegExp */
export function isRegEx(re: any): re is RegExp {
    return re instanceof RE2 || re instanceof globalThis.RegExp
}

/** Safe RegEx (RE2) */
export type RegExp = RE2
/** All possible RegEx Pattern types */
export type Pattern = string | globalThis.RegExp | Buffer | RE2