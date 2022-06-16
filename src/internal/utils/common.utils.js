// Remove hyphens & Capitalize all words (For App Title)
exports.capitalizeHyphenated = (str) => str.replace(/^\w/, a=>a.toUpperCase()).replace(/-(\w)/g, (_,g)=>' '+g.toUpperCase())

// Filter out duplicate values from array
exports.filterDupes = (arr) => arr.filter((val, idx) => !arr.slice(0,idx).includes(val))

// Check if array has any duplicate values
exports.hasDupes = (array) => array.some((val, idx) => array.slice(0, idx).includes(val))