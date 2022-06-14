module.exports = {

  // Convert field names to form labels { key: 'Label Text' }
  varNameDict: { id: 'ID', swapId: 'Swap ID' },
  
  // Convert SQLite data types to HTML <input> type [ /SQL-Type Name RegEx/, 'input.type' ]
  sql2html: [
    [/INTEGER|REAL/i, 'number'],
    [/TEXT|BLOB/i, 'text'],
  ],
  
  // Mask values when reporting errors for these values
  mask: [ 'password', 'confirm' ],
  MASK_CHAR: '*',
  
}