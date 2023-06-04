export function deepCopy<T>(obj: T): T {
  if (!obj || typeof obj !== 'object') return obj

  if (Array.isArray(obj)) return obj.map(deepCopy) as T

  return Object.entries(obj).reduce(
    (copy, [key,val]) => ({ ...copy, [key]: deepCopy(val) }),
    {} as T
  )
}