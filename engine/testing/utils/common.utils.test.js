const {
  capitalizeHyphenated, filterDupes, hasDupes, filterByField,
  exceptRoute, deepMap, deepEquals, debounce, throttle,
  getMatchingKey, caseInsensitiveObject, splitUnenclosed
} = require('../../utils/common.utils')

describe('capitalizeHyphenated', () => {
  it('capitalizes first letter', () => {
    expect(capitalizeHyphenated('test')).toBe('Test')
  })
  it('spaces + capitalizes after hyphen', () => {
    expect(capitalizeHyphenated('test-word')).toBe('Test Word')
  })
})

describe('filterDupes', () => {
  it('ignores non-dupes', () => {
    expect(filterDupes([])).toEqual([])
    expect(filterDupes([1, 2, 3])).toEqual([1, 2, 3])
    expect(filterDupes(['t', 'T', 'test'])).toEqual(['t', 'T', 'test'])
  })
  it('removes duped values', () => {
    expect(filterDupes([1, 2, 3, 2, 1, 4, 4])).toEqual([1, 2, 3, 4])
    expect(filterDupes(['t', 'T', 't', 'test', 'T'])).toEqual(['t','T','test'])
  })
})

describe('hasDupes', () => {
  it('false', () => {
    expect(hasDupes([])).toBeFalsy()
    expect(hasDupes([1, 2, 3])).toBeFalsy()
    expect(hasDupes(['t', 'T', 'test'])).toBeFalsy()
  })
  it('true', () => {
    expect(hasDupes([1, 2, 3, 2, 1, 4, 4])).toBeTruthy()
    expect(hasDupes(['t', 'T', 't', 'test', 'T'])).toBeTruthy()
  })
  it('returns 1-based index of first duplicate', () => {
    expect(hasDupes([1, 2, 3])).toBe(0)
    expect(hasDupes([1, 2, 3, 2, 1, 4, 4])).toBe(4)
    expect(hasDupes(['t', 'T', 't', 'test', 'T'])).toBe(3)
  })
})

describe('filterByField', () => {
  it('returns "field" for each key', () => {
    expect(filterByField({
      test: { a: 1, b: 2, c: 3 },
      data: { a: 4, b: 5, c: 6 },
      key:  { a: 7, b: 8, c: 9 },
    }, 'b')).toEqual({
      test: 2, data: 5, key: 8
    })
  })
  it('skips nullish values', () => {
    expect(filterByField({
      test: { a: 1, b: null, c: 3 },
      data: { a: 4, b: undefined, c: 6 },
      key:  { a: 7, c: 9 },
    }, 'b')).toEqual({})
  })
})

describe('exceptRoute', () => {
  const next = jest.fn(), mw1 = jest.fn(), mw2 = jest.fn(), mw3 = jest.fn()

  it('path starts w/ skipPath', () => {
    exceptRoute('test',mw1)({ path: 'test' },{},next)
    expect(next).toBeCalledTimes(1)
    expect(mw1).toBeCalledTimes(0)
    exceptRoute('test',mw1)({ path: 'test/' },{},next)
    expect(next).toBeCalledTimes(2)
    expect(mw1).toBeCalledTimes(0)
    exceptRoute('test',mw1)({ path: 'test/path' },{},next)
    expect(next).toBeCalledTimes(3)
    expect(mw1).toBeCalledTimes(0)
  })
  it('is case-insensitive', () => {
    exceptRoute('test',mw1)({ path: 'TEST' },{},next)
    expect(next).toBeCalledTimes(1)
    expect(mw1).toBeCalledTimes(0)
    exceptRoute('test',mw1)({ path: 'TEST/' },{},next)
    expect(next).toBeCalledTimes(2)
    expect(mw1).toBeCalledTimes(0)
    exceptRoute('test',mw1)({ path: 'TEST/PATH' },{},next)
    expect(next).toBeCalledTimes(3)
    expect(mw1).toBeCalledTimes(0)
  })
  it('does not match skipPath', () => {
    exceptRoute('test',mw1)({ path: '' },{},next)
    expect(next).toBeCalledTimes(0)
    expect(mw1).toBeCalledTimes(1)
    exceptRoute('test',mw1)({ path: 'tes' },{},next)
    expect(next).toBeCalledTimes(0)
    expect(mw1).toBeCalledTimes(2)
    exceptRoute('test',mw1)({ path: 'other/path' },{},next)
    expect(next).toBeCalledTimes(0)
    expect(mw1).toBeCalledTimes(3)
  })
  it('passes params to middleware', () => {
    exceptRoute('test',mw1)({ path: '' },{ res: true },next)
    expect(mw1).toBeCalledWith({ path: '' },{ res: true },next)
    exceptRoute('test',mw1)({ path: 'tes' },{ res: true },next)
    expect(mw1).toBeCalledWith({ path: 'tes' },{ res: true },next)
    exceptRoute('test',mw1)({ path: 'other/path' },{ res: true },next)
    expect(mw1).toBeCalledWith({ path: 'other/path' },{ res: true },next)
  })
  it('accepts array of middleware', () => {
    const allMw = exceptRoute('test',[mw1,mw2,mw3])
    expect(Array.isArray(allMw)).toBe(true)
    allMw.forEach((mw) => mw({ path: '' },{},next))
    expect(next).toBeCalledTimes(0)
    expect(mw1).toBeCalledTimes(1)
    expect(mw2).toBeCalledTimes(1)
    expect(mw3).toBeCalledTimes(1)
  })
  it('accepts array of middleware', () => {
    exceptRoute('test',[mw1,mw2,mw3]).forEach((mw,idx) => mw({ path: '' },{ idx },next))
    expect(next).toBeCalledTimes(0)
    expect(mw1).toBeCalledWith({ path: '' },{ idx: 0 },next)
    expect(mw2).toBeCalledWith({ path: '' },{ idx: 1 },next)
    expect(mw3).toBeCalledWith({ path: '' },{ idx: 2 },next)
  })
  it('rejects middleware array if skipPath', () => {
    exceptRoute('test',[mw1,mw2,mw3]).forEach((mw) => mw({ path: 'test' },{},next))
    expect(next).toBeCalledTimes(3)
    expect(mw1).toBeCalledTimes(0)
    expect(mw2).toBeCalledTimes(0)
    expect(mw3).toBeCalledTimes(0)
  })
})

describe('deepMap', () => {
  const callback = jest.fn()

  it('calls callback', () => {
    deepMap('TEST', callback)
    expect(callback).toHaveBeenNthCalledWith(1, 'TEST')
    deepMap(12, callback)
    expect(callback).toHaveBeenNthCalledWith(2, 12)
    deepMap(false, callback)
    expect(callback).toHaveBeenNthCalledWith(3, false)
    deepMap(null, callback)
    expect(callback).toHaveBeenNthCalledWith(4, null)
    expect(callback).toBeCalledTimes(4)
  })
  it('calls for each array string', () => {
    deepMap(['a','b','c','d'], callback)
    expect(callback.mock.calls).toEqual([['a'],['b'],['c'],['d']])
    callback.mockClear()
    deepMap(['a',undefined,'c',false,6], callback)
    expect(callback.mock.calls).toEqual([['a'],[undefined],['c'],[false],[6]])
  })
  it('calls on nested arrays', () => {
    deepMap(['a',[['b','c'],'d']], callback)
    expect(callback.mock.calls).toEqual([['a'],['b'],['c'],['d']])
  })
  it('calls for each object string value', () => {
    deepMap({ a: 'test', b: 'val', c: 'esc' }, callback)
    expect(callback.mock.calls).toEqual([['test'],['val'],['esc']])
    callback.mockClear()
    deepMap({ a: 'test', b: 12, c: 'val', d: null }, callback)
    expect(callback.mock.calls).toEqual([['test'],[12],['val'],[null]])
  })
  it('calls on nested objects', () => {
    deepMap({ a: 'test', b: { in: 'val', more: { c: 'esc' }}}, callback)
    expect(callback.mock.calls).toEqual([['test'],['val'],['esc']])
  })
  it('calls on nested arrays/objects', () => {
    deepMap([{ a: 'test', b: [ 'val', { c: 'esc' } ]}, {}], callback)
    expect(callback.mock.calls).toEqual([['test'],['val'],['esc']])
  })
  it('mutates obj', () => {
    callback.mockImplementation(v => v + 10)
    const input = { a: 1, b: [2, { c: 3, d: 4 }] }
    const output = deepMap(input, callback)
    expect(output).toBe(input)
    expect(output).toEqual({ a: 11, b: [12, { c: 13, d: 14 }] })
    callback.mockReset()
  })
  it('mutates array', () => {
    callback.mockImplementation(v => v + 20)
    const input = [ 1, [2, { a: 3, b: 4 }] ]
    const output = deepMap(input, callback)
    expect(output).toBe(input)
    expect(output).toEqual([ 21, [22, { a: 23, b: 24 }] ])
    callback.mockReset()
  })
})

describe('deepEquals', () => {
  it('literals', () => {
    expect(deepEquals('TEST','TEST')).toBeTruthy()
    expect(deepEquals('TEST','TES')).toBeFalsy()
    expect(deepEquals(123,123)).toBeTruthy()
    expect(deepEquals(123,-123)).toBeFalsy()
    expect(deepEquals(false,false)).toBeTruthy()
    expect(deepEquals(false,true)).toBeFalsy()
    expect(deepEquals(false,12)).toBeFalsy()
    expect(deepEquals(40,'TEST')).toBeFalsy()
  })
  it('null/undefined', () => {
    expect(deepEquals(null,null)).toBeTruthy()
    expect(deepEquals(undefined,undefined)).toBeTruthy()
    expect(deepEquals(undefined,null)).toBeFalsy()
  })
  it('strict equals', () => {
    expect(deepEquals(123,'123')).toBeFalsy()
    expect(deepEquals(false,'false')).toBeFalsy()
    expect(deepEquals(false,0)).toBeFalsy()
    expect(deepEquals(false,'')).toBeFalsy()
    expect(deepEquals(true,1)).toBeFalsy()
    expect(deepEquals(null,undefined)).toBeFalsy()
  })
  it('functions', () => {
    const testFunc = () => 'test'
    expect(deepEquals(testFunc,testFunc)).toBeTruthy()
    expect(deepEquals(testFunc,() => {})).toBeFalsy()
    expect(deepEquals(testFunc,() => 'test')).toBeFalsy()
  })
  it('arrays', () => {
    expect(deepEquals(['a','b','c','d'], ['a','b','c','d'])).toBeTruthy()
    expect(deepEquals([1,2,3,4,5,6,7,8], [1,2,3,4,5,6,7,8])).toBeTruthy()
    expect(deepEquals([1,2,3,4,5,6,7,8], ['a','b','c','d'])).toBeFalsy()
    expect(deepEquals([1,2,3,4,5,6,7,8], [1,2,3,4,5,6,7])).toBeFalsy()
    expect(deepEquals([1,2,3,4,5,6,7], [1,2,3,4,5,6,7,8])).toBeFalsy()
    expect(deepEquals([null, undefined], [null, undefined])).toBeTruthy()
    expect(deepEquals([null, undefined], [undefined, null])).toBeFalsy()
    expect(deepEquals([], [])).toBeTruthy()
    expect(deepEquals([1], 1)).toBeFalsy()
  })
  it('nested arrays', () => {
    expect(deepEquals(['a',[['b','c'],'d']], ['a',[['b','c'],'d']])).toBeTruthy()
    expect(deepEquals(['a',[['b','c'],'d']], ['a','b','c','d'])).toBeFalsy()
    expect(deepEquals(['a',[['b','c'],'d']], ['a',[['b','e'],'d']])).toBeFalsy()
  })
  it('objects', () => {
    expect(deepEquals({ a: 'test', b: 'val', c: 'ue' }, { a: 'test', b: 'val', c: 'ue' })).toBeTruthy()
    expect(deepEquals({ a: 1, b: 2, c: 3, d: 4, e: 5 }, { e: 5, d: 4, c: 3, b: 2, a: 1 })).toBeTruthy()
    expect(deepEquals({ a: 1, b: 2, c: 3, d: 4, e: 5 }, { a: 'test', b: 'val', c: 'ue' })).toBeFalsy()
    expect(deepEquals({ a: 1, b: 2, c: 3, d: 4, e: 5 }, { a: 1, b: 2, c: 3, d: 4 })).toBeFalsy()
    expect(deepEquals({ a: 1, b: 2, c: 3, d: 4 }, { a: 1, b: 2, c: 3, d: 4, e: 5 })).toBeFalsy()
    expect(deepEquals({ part2: undefined, part1: null }, { part1: null, part2: undefined })).toBeTruthy()
    expect(deepEquals({ part2: undefined, part1: null }, { part1: undefined, part2: null })).toBeFalsy()
    expect(deepEquals({}, {})).toBeTruthy()
    expect(deepEquals({ a: 'a' }, 'a')).toBeFalsy()
  })
  it('nested objects', () => {
    expect(deepEquals({ a: 'test', b: { in: 'val', more: { c: 'ue' }}}, { a: 'test', b: { in: 'val', more: { c: 'ue' }}})).toBeTruthy()
    expect(deepEquals({ a: 'test', b: { in: 'val', more: { c: 'ue' }}}, { a: 'test', b: 'val', c: 'ue' })).toBeFalsy()
    expect(deepEquals({ a: 'test', b: { in: 'val', more: { c: 'ue' }}}, { a: 'test', b: { in: 'val', more: { e: 'ue' }}})).toBeFalsy()
    expect(deepEquals({ a: 'test', b: { in: 'val', more: { c: 'ue' }}}, { a: 'test', b: { in: 'val', more: { c: 'ues' }}})).toBeFalsy()
  })
  it('nested arrays/objects', () => {
    expect(deepEquals([{ a: 'test', b: [ 'val', { c: 'ue' } ]}, {}], [{ a: 'test', b: [ 'val', { c: 'ue' } ]}, {}])).toBeTruthy()
    expect(deepEquals([{ a: 'test', b: [ 'val', { c: 'ue' } ]}, {}], [{ a: 'test', b: 'val', c: 'ue' }])).toBeFalsy()
    expect(deepEquals([{ a: 'test', b: [ 'val', { c: 'ue' } ]}, {}], [{ a: 'test', b: [ 'val', { e: 'ue' } ]}, {}])).toBeFalsy()
    expect(deepEquals([{ a: 'test', b: [ 'val', { c: 'ue' } ]}, {}], [{ a: 'test', b: [ 'val', { c: 'ues' } ]}, {}])).toBeFalsy()
  })
  it('custom compare function', () => {
    const looseCompare = (a,b) => a == b
    expect(deepEquals(1, '1')).toBeFalsy()
    expect(deepEquals(1, '1', looseCompare)).toBeTruthy()
    expect(deepEquals(null, undefined)).toBeFalsy()
    expect(deepEquals(null, undefined, looseCompare)).toBeTruthy()
  })
})

describe('splitUnenclosed', () => {
  it('splits based on delimiter', () => {
    const splitter = splitUnenclosed('|', { enclosures: [], trim: false, escape: '\\' })
    expect(splitter('1|2|3')).toEqual(['1','2','3'])
    expect(splitter('add|bad|cab')).toEqual(['add','bad','cab'])
  })
  it('allows multi-char delimiter', () => {
    const splitter = splitUnenclosed('-/-', { enclosures: [], trim: false, escape: '\\' })
    expect(splitter('1-/-2-/-3')).toEqual(['1','2','3'])
    expect(splitter('add-/-bad-/cab-/-dab')).toEqual(['add','bad-/cab','dab'])
  })
  it('allows regex delimiter', () => {
    const splitter = splitUnenclosed(/arg?/, { enclosures: [], trim: false, escape: '\\' })
    expect(splitter('1ar2arg3')).toEqual(['1','2','3'])
    expect(splitter('addargbadarcab')).toEqual(['add','bad','cab'])
  })
  it('trims whitespace around delimiter', () => {
    const splitter = splitUnenclosed('|', { enclosures: [], trim: true, escape: '\\' })
    expect(splitter('1 |  2  |3')).toEqual(['1','2','3'])
    expect(splitter('  add|\nbad\t\t|cab     ')).toEqual(['add','bad','cab'])
    
  })
  it('keeps whitespace around delimiter', () => {
    const splitter = splitUnenclosed('|', { enclosures: [], trim: false, escape: '\\' })
    expect(splitter('1 |  2  |3')).toEqual(['1 ','  2  ','3'])
    expect(splitter('  add|\nbad\t\t|cab     ')).toEqual(['  add','\nbad\t\t','cab     '])
    
  })
  it('skips empty values', () => {
    const splitter = splitUnenclosed('|', { enclosures: [], trim: false, escape: '\\' })
    expect(splitter('1|2||3|')).toEqual(['1','2','3'])
    expect(splitter('||add||||bad|cab')).toEqual(['add','bad','cab'])
  })
  it('skips empty values post trim', () => {
    const trimSplit = splitUnenclosed('|', { enclosures: [], trim: true, escape: '\\' })
    expect(trimSplit('1|2| ')).toEqual(['1','2'])
    const noTrim = splitUnenclosed('|', { enclosures: [], trim: false, escape: '\\' })
    expect(noTrim('1|2| ')).toEqual(['1','2',' '])
  })
  it('splits around enclosures', () => {
    const splitter = splitUnenclosed('|', { enclosures: ['^$','**'], trim: false, escape: '\\' })
    expect(splitter('1|^2|3|4$|5')).toEqual(['1','^2|3|4$','5'])
    expect(splitter('add|ba^^d|cab$|da$b|ed')).toEqual(['add','ba^^d|cab$|da$b','ed'])
    expect(splitter('1|^2|3*|4$|5*|6')).toEqual(['1','^2|3*|4$|5*','6'])
  })
  it('ignores escaped enclosures + hides escape char (unless escaped)', () => {
    const splitter = splitUnenclosed('|', { enclosures: ['^$','**'], trim: false, escape: '(' })
    expect(splitter('1|(^2|3|4$|5')).toEqual(['1','^2','3','4$','5'])
    expect(splitter('1|^2|3(*|4$|5|6(*')).toEqual(['1','^2|3*|4$','5','6*'])
    expect(splitter('(1|^2|((3)|4$|((5')).toEqual(['1','^2|(3)|4$','(5'])
  })
  it('passes non-strings', () => {
    const splitter = splitUnenclosed('|', { enclosures: [], trim: false, escape: '\\' })
    expect(splitter({ a: 1, b: 2 })).toEqual({ a: 1, b: 2 })
    expect(splitter([1,2,3])).toEqual([1,2,3])
    expect(splitter(123)).toBe(123)
    expect(splitter(true)).toBe(true)
    expect(splitter()).toBeUndefined()
    expect(splitter(splitter)).toBe(splitter)
  })
})

describe('debounce', () => {
  const baseFunc = jest.fn(() => 'result')

  describe('base behavior', () => {
    it('initial call', () => {
      const [ funcDb ] = debounce(baseFunc)
      expect(baseFunc).toBeCalledTimes(0)
      funcDb(1,2,3)
      expect(baseFunc).toBeCalledTimes(1)
      expect(baseFunc).toBeCalledWith(1,2,3)
    })
    it('multiple calls w/ same args', () => {
      const [ funcDb ] = debounce(baseFunc)
      expect(baseFunc).toBeCalledTimes(0)
      funcDb(1,2,3)
      funcDb(1,2,3)
      funcDb(1,2,3)
      expect(baseFunc).toBeCalledTimes(1)
    })
    it('multiple calls w/ diff args', () => {
      const [ funcDb ] = debounce(baseFunc)
      expect(baseFunc).toBeCalledTimes(0)
      funcDb(1,2,3)
      funcDb(1,2)
      funcDb(1,2,3)
      funcDb()
      expect(baseFunc).toBeCalledTimes(4)
    })
    it('force function', () => {
      const [ funcDb, forceCall ] = debounce(baseFunc)
      expect(baseFunc).toBeCalledTimes(0)
      funcDb(1,2,3)
      funcDb(1,2,3)
      forceCall()
      expect(baseFunc).toBeCalledTimes(1)
      funcDb(1,2,3)
      expect(baseFunc).toBeCalledTimes(2)
    })
    it('time elapses', async () => {
      const [ funcDb ] = debounce(baseFunc, { interval: 100 })
      expect(baseFunc).toBeCalledTimes(0)
      funcDb(1,2,3)
      funcDb(1,2,3)
      expect(baseFunc).toBeCalledTimes(1)
      await new Promise(resolve => setTimeout(resolve, 101))
      funcDb(1,2,3)
      expect(baseFunc).toBeCalledTimes(2)
    })
  })
  
  describe('test options', () => {
    it('falsy interval (always calls function)', () => {
      const [ funcDb ] = debounce(baseFunc, { interval: false })
      expect(baseFunc).toBeCalledTimes(0)
      funcDb(1,2,3)
      funcDb(1,2,3)
      funcDb(1,2,3)
      expect(baseFunc).toBeCalledTimes(3)
    })
    it('negative interval (never times out)', async () => {
      const [ funcDb ] = debounce(baseFunc, { interval: -1 })
      expect(baseFunc).toBeCalledTimes(0)
      funcDb(1,2,3)
      funcDb(1,2,3)
      await new Promise(resolve => setTimeout(resolve, 1001))
      funcDb(1,2,3)
      expect(baseFunc).toBeCalledTimes(1)
    })
    it('negative interval breaks for force/arg change', () => {
      const [ funcDb, forceCall ] = debounce(baseFunc, { interval: -1 })
      expect(baseFunc).toBeCalledTimes(0)
      funcDb(1,2,3)
      funcDb(1,2,3)
      expect(baseFunc).toBeCalledTimes(1)
      forceCall()
      funcDb(1,2,3)
      funcDb(1,2,3)
      expect(baseFunc).toBeCalledTimes(2)
      funcDb(2,4,6)
      funcDb(2,4,6)
      expect(baseFunc).toBeCalledTimes(3)
    })
    it('ignore args (skips matching args)', () => {
      const [ funcDb ] = debounce(baseFunc, { ignoreArgs: true })
      expect(baseFunc).toBeCalledTimes(0)
      funcDb(1,2,3)
      funcDb(2,4,6)
      funcDb()
      expect(baseFunc).toBeCalledTimes(1)
    })
    it('ignore args still breaks for force/interval', async () => {
      const [ funcDb, forceCall ] = debounce(baseFunc, { interval: 100, ignoreArgs: true })
      expect(baseFunc).toBeCalledTimes(0)
      funcDb(1,2,3)
      funcDb(2,4,6)
      expect(baseFunc).toBeCalledTimes(1)
      await new Promise(resolve => setTimeout(resolve, 101))
      funcDb()
      funcDb(2,3,4)
      expect(baseFunc).toBeCalledTimes(2)
      forceCall()
      funcDb(1,2)
      funcDb(1,2,3)
      expect(baseFunc).toBeCalledTimes(3)
    })
  })

  describe('edge cases', () => {
    it('nested args', () => {
      const [ funcDb ] = debounce(baseFunc)
      expect(baseFunc).toBeCalledTimes(0)
      funcDb(1, [2,3,4], {a: 'test', b: 'old'})
      funcDb(1, [2,3,4], {a: 'test', b: 'old'})
      expect(baseFunc).toBeCalledTimes(1)
      funcDb(1, [2,3,4], {a: 'test', b: 'new'})
      expect(baseFunc).toBeCalledTimes(2)
    })
    it('func returns undefined', () => {
      baseFunc.mockImplementationOnce(() => {})
      const [ funcDb ] = debounce(baseFunc)
      expect(baseFunc).toBeCalledTimes(0)
      funcDb(1,2,3)
      funcDb(1,2,3)
      funcDb(1,2,3)
      expect(baseFunc).toBeCalledTimes(1)
    })
  })
})

describe('throttle', () => {
  const testFunc = jest.fn(() => 'result')
  const callback = jest.fn(() => 'result')

  const caller = throttle(testFunc, 100, callback)

  it('groups multiple calls into 1', async () => {
    caller(); caller(); caller()
    await new Promise(resolve => setTimeout(resolve, 101))
    expect(testFunc).toBeCalledTimes(1)
  })
  it('waits "interval" before calling', async () => {
    caller()
    expect(testFunc).toBeCalledTimes(0)
    await new Promise(resolve => setTimeout(resolve, 101))
    expect(testFunc).toBeCalledTimes(1)
  })
  it('calls func with array of args', async () => {
    caller(1,2,3); caller(4,5); caller(6,7,8)
    await new Promise(resolve => setTimeout(resolve, 101))
    expect(testFunc).toBeCalledWith([[1,2,3],[4,5],[6,7,8]])
  })
  it('calls func with 1D array if single arg', async () => {
    caller('a'); caller('b'); caller('c')
    await new Promise(resolve => setTimeout(resolve, 101))
    expect(testFunc).toBeCalledWith(['a','b','c'])
  })
  it('calls func with no args if no args', async () => {
    caller(); caller(); caller()
    await new Promise(resolve => setTimeout(resolve, 101))
    expect(testFunc).toBeCalledWith()
  })
  it('calls callback with result', async () => {
    caller(); caller(); caller()
    await new Promise(resolve => setTimeout(resolve, 101))
    expect(callback).toBeCalledWith('result')
    expect(callback).toBeCalledTimes(1)
  })
})

describe('getMatchingKey', () => {
 it('gets exact key', () => {
  expect(getMatchingKey({ test: 'match', other: 'alt' }, 'test')).toBe('test')
  expect(getMatchingKey({ test: 'match', other: 'alt' }, 'other')).toBe('other')
 })
 it('gets case-insensitive key', () => {
  expect(getMatchingKey({ test: 'match', other: 'alt' }, 'TeSt')).toBe('test')
  expect(getMatchingKey({ test: 'match', other: 'alt' }, 'OTHER')).toBe('other')
 })
 it('returns undefined when only partial match', () => {
  expect(getMatchingKey({ test: 'match', other: 'alt' }, 'tes')).toBeUndefined()
  expect(getMatchingKey({ test: 'match', other: 'alt' }, 'otherKey')).toBeUndefined()
 })
 it('returns undefined when missing key', () => {
  expect(getMatchingKey({ test: 'match', other: 'alt' }, 'missing')).toBeUndefined()
  expect(getMatchingKey({ test: 'match', other: 'alt' }, 'newKey')).toBeUndefined()
 })
})

describe('caseInsensitiveObject', () => {
  let baseObj
  beforeEach(() => { baseObj = { a: 1, B: 2, TeSt: 'data' } })

  it('returns identical copy of object', () => {
    expect(caseInsensitiveObject(baseObj)).toEqual({ a: 1, B: 2, TeSt: 'data' })
    expect(caseInsensitiveObject(baseObj)).not.toBe(baseObj)
  })
  it('case-insensitive get', () => {
    expect(caseInsensitiveObject(baseObj).a   ).toBe(1)
    expect(caseInsensitiveObject(baseObj).b   ).toBe(2)
    expect(caseInsensitiveObject(baseObj).test).toBe('data')
    expect(caseInsensitiveObject(baseObj).TEST).toBe('data')
  })
  it('case-insensitive has', () => {
    expect('a'    in caseInsensitiveObject(baseObj)).toBeTruthy()
    expect('b'    in caseInsensitiveObject(baseObj)).toBeTruthy()
    expect('test' in caseInsensitiveObject(baseObj)).toBeTruthy()
    expect('TEST' in caseInsensitiveObject(baseObj)).toBeTruthy()
  })
  it('case-insensitive set', () => {
    const testObj = caseInsensitiveObject(baseObj)
    testObj.a = 11
    testObj.b = 62
    testObj.test = 'temp'
    testObj.TEST = 'new'
    testObj.C = 100
    expect(testObj).toEqual({ a: 11, B: 62, TeSt: 'new', C: 100 })
  })
  it('case-insensitive delete', () => {
    const testObj = caseInsensitiveObject(baseObj)
    delete testObj.A
    delete testObj.test
    expect(testObj).toEqual({ B: 2 })
  })
})