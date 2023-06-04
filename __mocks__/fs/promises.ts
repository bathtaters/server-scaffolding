let files: Record<string,string> = {}

export const writeFile = jest.fn((k: string, v: string) => Promise.resolve(files[k] = v  ))
export const readFile  = jest.fn((k: string)            => Promise.resolve(files[k] ?? ''))