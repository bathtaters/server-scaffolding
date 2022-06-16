const { filterDupes } = require('../../utils/common.utils')

describe('filterDupes', () => {
  it('ignores non-dupes', () => {
    expect(filterDupes([])).toEqual([])
    expect(filterDupes([1, 2, 3])).toEqual([1, 2, 3])
    expect(filterDupes(['a', 'A', 'b'])).toEqual(['a', 'A', 'b'])
  })
  it('removes duped values', () => {
    expect(filterDupes([1, 2, 3, 2, 1, 4, 4])).toEqual([1, 2, 3, 4])
    expect(filterDupes(['a', 'A', 'a', 'b', 'a'])).toEqual(['a','A','b'])
  })
})

it.todo('hasDupes')
it.todo('capitalizeHyphenated')