const {
  // ACCESS
  accessInt, accessArray, hasAccess, passwordAccess,
  // MODELS
  modelAccessStr, hasModelAccess, modelsArrayToObj, getModelsString,
  // CORS
  decodeCors, encodeCors, displayCors, isRegEx, modelAccessToInts,
} = require('../../utils/users.utils')

const errors = require('../../config/errors.engine')

/* ---- ACCESS ADAPTERS ---- */

describe('accessInt', () => {
  it('number input', () => {
    expect(accessInt(1)).toBe(1)
    expect(accessInt("3")).toBe(3)
  })
  it('falsy input', () => {
    expect(accessInt(0)).toBe(0)
    expect(accessInt(null)).toBe(0)
    expect(accessInt(false)).toBe(0)
  })
  it('string input', () => {
    expect(accessInt('one')).toBe(1)
    expect(accessInt('two')).toBe(2)
    expect(accessInt('')).toBe(0)
    expect(accessInt('zero')).toBe(0)
  })
  it('array input', () => {
    expect(accessInt(['one'])).toBe(1)
    expect(accessInt(['two'])).toBe(2)
    expect(accessInt(['one','two'])).toBe(3)
    expect(accessInt([])).toBe(0)
    expect(accessInt(['zero'])).toBe(0)
  })
  it('unknown access string', () => {
    expect(() => accessInt(['one','test'])).toThrowError(errors.badAccess('test','key'))
  })
})

describe('accessArray', () => {
  it('falsy input', () => {
    expect(accessArray(0)).toEqual(['zero'])
    expect(accessArray()).toEqual(['zero'])
    expect(accessArray(false)).toEqual(['zero'])
  })
  it('number input', () => {
    expect(accessArray(0)).toEqual(['zero'])
    expect(accessArray(1)).toEqual(['one'])
    expect(accessArray(2)).toEqual(['two'])
    expect(accessArray(3)).toEqual(['one','two'])
  })
  it('string input', () => {
    expect(accessArray('')).toEqual(['zero'])
    expect(accessArray('0')).toEqual(['zero'])
    expect(accessArray('1')).toEqual(['one'])
    expect(accessArray('2')).toEqual(['two'])
    expect(accessArray('3')).toEqual(['one','two'])
  })
  it('unknown type or out of range number', () => {
    expect(() => accessArray('test')).toThrowError(errors.badAccess('test', 'int'))
    expect(() => accessArray({})).toThrowError(errors.badAccess({}, 'int'))
    expect(() => accessArray(100)).toThrowError(errors.badAccess(100, 'int'))
    expect(() => accessArray(-1)).toThrowError(errors.badAccess(-1, 'int'))
  })
})

describe('hasAccess', () => {
  it('works with values', () => {
    expect(hasAccess(1,1)).toBeTruthy()
    expect(hasAccess(2,3)).toBeTruthy()
    expect(hasAccess(3,1)).toBeTruthy()
    expect(hasAccess(0,1)).toBeFalsy()
    expect(hasAccess(1,2)).toBeFalsy()
    expect(hasAccess(4,2)).toBeFalsy()
  })
  it('works with missing values', () => {
    expect(hasAccess(1)).toBeFalsy()
    expect(hasAccess(null,12)).toBeFalsy()
    expect(hasAccess(undefined,false)).toBeFalsy()
  })
})

describe('passwordAccess', () => {
  it('equals expectred value', () => { expect(passwordAccess).toBe(4) })
})


/* ---- MODEL ADAPTERS ---- */

describe('modelAccessToInts', () => {
  it('Ints passthrough', () => {
    expect(modelAccessToInts(0)).toBe(0)
    expect(modelAccessToInts(1)).toBe(1)
    expect(modelAccessToInts(12345)).toBe(12345)
    expect(modelAccessToInts(-999)).toBe(-999)
  })
  it('Number string to int', () => {
    expect(modelAccessToInts('0')).toBe(0)
    expect(modelAccessToInts('1')).toBe(1)
    expect(modelAccessToInts('12345')).toBe(12345)
    expect(modelAccessToInts('-999')).toBe(-999)
  })
  it('Access key to access value', () => {
    expect(modelAccessToInts('none')).toBe(0)
    expect(modelAccessToInts('alpha')).toBe(1)
    expect(modelAccessToInts('bravo')).toBe(2)
  })
  it('Access letter to access value', () => {
    expect(modelAccessToInts('a')).toBe(1)
    expect(modelAccessToInts('b')).toBe(2)
    expect(modelAccessToInts('-')).toBe(0)
    expect(modelAccessToInts('n')).toBe(0)
  })
  it('Access letter string to combined access values', () => {
    expect(modelAccessToInts('an')).toBe(1)
    expect(modelAccessToInts('-b')).toBe(2)
    expect(modelAccessToInts('ab')).toBe(3)
    expect(modelAccessToInts('n-')).toBe(0)
  })
  it('Int array to combined ints', () => {
    expect(modelAccessToInts([1,2,4])).toBe(7)
    expect(modelAccessToInts([2])).toBe(2)
    expect(modelAccessToInts([12,48,100])).toBe(124)
    expect(modelAccessToInts([])).toBe(0)
  })
  it('Number string array to combined ints', () => {
    expect(modelAccessToInts(['1','2','4'])).toBe(7)
    expect(modelAccessToInts(['2'])).toBe(2)
    expect(modelAccessToInts(['12','48','100'])).toBe(124)
    expect(modelAccessToInts(['0'])).toBe(0)
  })
  it('Access key array to combined values', () => {
    expect(modelAccessToInts(['bravo'])).toBe(2)
    expect(modelAccessToInts(['alpha','none'])).toBe(1)
    expect(modelAccessToInts(['alpha','bravo'])).toBe(3)
    expect(modelAccessToInts(['none'])).toBe(0)
  })
  it('Access letter array to combined values', () => {
    expect(modelAccessToInts(['b'])).toBe(2)
    expect(modelAccessToInts(['a','n'])).toBe(1)
    expect(modelAccessToInts(['a','b'])).toBe(3)
    expect(modelAccessToInts(['-'])).toBe(0)
  })
  it('Object runs each value through function', () => {
    expect(modelAccessToInts({
      testA: 'alpha',
      testB: '-',
      testC: [1, 'n', 'bravo', '4', 'none'],
      testD: {
        innerA: 1234, innerB: [], innerC: '0'
      }
    })).toEqual({
      testA: 1,
      testB: 0,
      testC: 7,
      testD: {
        innerA: 1234, innerB: 0, innerC: 0
      }
    })
  })
  it('Unknown strings throw error', () => {
    expect(() => modelAccessToInts('calypso')).toThrowError(expect.objectContaining({
      message: expect.stringContaining('modelAccessChar')
    }))
    expect(() => modelAccessToInts('$')).toThrowError(expect.objectContaining({
      message: expect.stringContaining('modelAccessChar')
    }))
    expect(() => modelAccessToInts(['alph'])).toThrowError(expect.objectContaining({
      message: expect.stringContaining('modelAccessChar')
    }))
    expect(() => modelAccessToInts(['bravoed'])).toThrowError(expect.objectContaining({
      message: expect.stringContaining('modelAccessChar')
    }))
    expect(() => modelAccessToInts({ a: 1, b: '6', x: 'break' })).toThrowError(expect.objectContaining({
      message: expect.stringContaining('modelAccessChar')
    }))
  })
  it('Unknown types throw error', () => {
    expect(() => modelAccessToInts(() => {})).toThrowError(expect.objectContaining({
      message: expect.stringContaining('modelAccess<function>')
    }))
    expect(() => modelAccessToInts(Symbol('test'))).toThrowError(expect.objectContaining({
      message: expect.stringContaining('modelAccess<symbol>')
    }))
  })
})

describe('modelAccessStr', () => {
  it('normal model vals', () => {
    expect(modelAccessStr(1)).toBe('a')
    expect(modelAccessStr(2)).toBe('b')
    expect(modelAccessStr(3)).toBe('ab')
  })
  it('no models or zero', () => {
    expect(modelAccessStr(0)).toBe('-')
    expect(modelAccessStr()).toBe('-')
    expect(modelAccessStr(false)).toBe('-')
  })
  it('non-int or out of range', () => {
    expect(() => modelAccessStr('test')).toThrowError(errors.badAccess('test','modelAccessInt'))
    expect(() => modelAccessStr(true)).toThrowError(errors.badAccess(true,'modelAccessInt'))
    expect(() => modelAccessStr({})).toThrowError(errors.badAccess({},'modelAccessInt'))
  })
})

describe('hasModelAccess', () => {
  const modelObj = { a: 1, b: 2, c: 3, d: 0, all: 4 }
  it('no access returns modelObj val', () => {
    expect(hasModelAccess(modelObj, 'a')).toBe(1)
    expect(hasModelAccess(modelObj, 'c')).toBe(3)
    expect(hasModelAccess(modelObj, 'd')).toBe(0)
  })
  it('uses default key when unknown name', () => {
    expect(hasModelAccess(modelObj, 'e')).toBe(4)
    expect(hasModelAccess(modelObj, 'any')).toBe(4)
  })
  it('accessType string', () => {
    expect(hasModelAccess(modelObj, 'a', 'alpha')).toBeTruthy()
    expect(hasModelAccess(modelObj, 'c', 'bravo')).toBeTruthy()
    expect(hasModelAccess(modelObj, 'd', 'alpha')).toBeFalsy()
    expect(hasModelAccess(modelObj, 'b', 'none')).toBeFalsy()
    expect(hasModelAccess(modelObj, 'b', 'other')).toBeFalsy()
  })
  it('accessType int', () => {
    expect(hasModelAccess(modelObj, 'a', 1)).toBeTruthy()
    expect(hasModelAccess(modelObj, 'c', 2)).toBeTruthy()
    expect(hasModelAccess(modelObj, 'd', 3)).toBeFalsy()
    expect(hasModelAccess(modelObj, 'b', 0)).toBeFalsy()
  })
})

describe('modelsArrayToObj', () => {
  it('works with single entry', () => {
    expect(modelsArrayToObj(['all-alpha'])).toEqual({ all: 1 })
  })
  it('works with single access per model', () => {
    expect(modelsArrayToObj(['a-alpha','b-bravo','all-none']))
      .toEqual({ a: 1, b: 2, all: 0 })
  })
  it('works with multi access per model', () => {
    expect(modelsArrayToObj(['all-alpha','all-bravo'])).toEqual({ all: 3 })
    expect(modelsArrayToObj(['a-alpha','b-bravo','c-alpha','c-bravo','all-none']))
      .toEqual({ a: 1, b: 2, c: 3, all: 0 })
  })
  it('ignores unknown access key', () => {
    expect(modelsArrayToObj(['a-other','a-skip'])).not.toHaveProperty('a')
  })
  it('includes allKey in result', () => {
    expect(modelsArrayToObj([])).toHaveProperty('all',0)
  })
})

describe('getModelsString', () => {
  it('single model/access', () => {
    expect(getModelsString({ test: 1 })).toBe('test [a]')
    expect(getModelsString({ test: 2 })).toBe('test [b]')
  })
  it('multi model', () => {
    expect(getModelsString({ testA: 1, testB: 2 })).toBe('testA [a], testB [b]')
  })
  it('multi access', () => {
    expect(getModelsString({ test: 3 })).toBe('test [ab]')
  })
  it('no access', () => {
    expect(getModelsString({ test: 0 })).toBe('test [-]')
  })
})


/* ---- CORS ADAPTERS ---- */

const RegEx = require('../../libs/regex')

describe('decodeCors', () => {
  it('passes null vals', () => {
    expect(decodeCors()).toBeUndefined()
    expect(decodeCors(null)).toBeUndefined()
  })
  it('passes bools/strings', () => {
    expect(decodeCors(true)).toBe(true)
    expect(decodeCors(false)).toBe(false)
    expect(decodeCors('test')).toBe('test')
    expect(decodeCors('test2')).toBe('test2')
  })
  it('converts bool strings/ints to bool', () => {
    expect(decodeCors('true')).toBe(true)
    expect(decodeCors('false')).toBe(false)
    expect(decodeCors('1')).toBe(true)
    expect(decodeCors('0')).toBe(false)
    expect(decodeCors(1)).toBe(true)
    expect(decodeCors(0)).toBe(false)
  })
  it('parses RegEx string', () => {
    expect(decodeCors('RegExp("abc")').source).toBe('abc')
    expect(decodeCors("RegExp('1[23]')  ").source).toBe('1[23]')
  })
  it('parses array string', () => {
    expect(decodeCors('["a","b","c"]')).toEqual(['a','b','c'])
    expect(decodeCors('[1,2,3]')).toEqual([1,2,3])
    expect(decodeCors('[]')).toEqual([])
  })
  it('parses quoted string', () => {
    expect(decodeCors('"test"')).toBe('test')
    expect(decodeCors('"123"')).toBe('123')
  })
})

describe('encodeCors', () => {
  it('passes null vals', () => {
    expect(encodeCors()).toBeUndefined()
    expect(encodeCors(null)).toBeUndefined()
  })
  it('passes strings', () => {
    expect(encodeCors('test')).toBe('test')
    expect(encodeCors('test2')).toBe('test2')
  })
  it('stringifys bools', () => {
    expect(encodeCors(true)).toBe('true')
    expect(encodeCors(false)).toBe('false')
  })
  it('stringifys arrays', () => {
    expect(encodeCors(['a','b','c'])).toBe('["a","b","c"]')
    expect(encodeCors([1,2,3])).toBe('[1,2,3]')
    expect(encodeCors([])).toBe('[]')
  })
  it('stringifys RegEx', () => {
    expect(encodeCors(/abc/)).toBe('RegExp("abc")')
    expect(encodeCors(/1[23]/)).toBe('RegExp("1[23]")')
  })
  it('converts bool strings/ints to bool', () => {
    expect(encodeCors('1')).toBe('true')
    expect(encodeCors('0')).toBe('false')
    expect(encodeCors(1)).toBe('true')
    expect(encodeCors(0)).toBe('false')
  })
  it('converts comma list to array', () => {
    expect(encodeCors('a,b,c')).toBe('["a","b","c"]')
    expect(encodeCors('1, 2,  3')).toBe('["1","2","3"]')
  })
})

describe('displayCors', () => {
  it('passes falsy vals', () => {
    expect(displayCors(0)).toBe(0)
    expect(displayCors()).toBeUndefined()
    expect(displayCors(null)).toBeNull()
    expect(displayCors(false)).toBe(false)
  })
  it('passes strings', () => {
    expect(displayCors('test')).toBe('test')
    expect(displayCors('test2')).toBe('test2')
  })
  it('passes bools', () => {
    expect(displayCors(true)).toBe(true)
    expect(displayCors(false)).toBe(false)
  })
  it('converts array to csv', () => {
    expect(displayCors([1,2,3])).toBe('1, 2, 3')
    expect(displayCors(['a','b','c'])).toBe('a, b, c')
    expect(displayCors([])).toBe('')
  })
  it('stringifys RegExp', () => {
    expect(displayCors(/abc/)).toBe('RegExp("abc")')
    expect(displayCors(/1[23]/)).toBe('RegExp("1[23]")')
  })
})

describe('isRegEx', () => {
  it('identifies RegExp', () => {
    expect(isRegEx(/abc/)).toBeTruthy()
    expect(isRegEx(/1[23]/)).toBeTruthy()
    expect(isRegEx(RegExp('test'))).toBeTruthy()
  })
  it('identifies non-RegExp', () => {
    expect(isRegEx('test')).toBeFalsy()
    expect(isRegEx('/1[23]/')).toBeFalsy()
    expect(isRegEx('RegExp("test")')).toBeFalsy()
  })
})



/* ---- MOCKS ---- */

jest.mock('../../config/users.cfg', () => ({
  // ACCESS
  access: { zero: 0, one: 1, two: 2, password: 4 },
  accessMax: 7,
  requirePassword: ['password'],
  // MODELS
  models: { none: 0, alpha: 1, bravo: 2 },
  modelsMax: 7,
  allModelsKey: 'all',
  noModelAccessChar: '-',
}))