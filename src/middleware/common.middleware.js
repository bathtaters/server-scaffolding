// Add any middleware to run on incoming requests
//  - function (req,res,next) [or array of functions]


/* Run on outgoing response
const outgoingMiddleware = (req, res, next) => {
  res._sendOutgoing = res.send
  res.send = (...args) => {
    // Add Code to run on outgoing (Can also substitute 'res.send' for 'res.end')
    return res._sendOutgoing(...args)
  }
  next()
}
//*/


module.exports = {
  // All requests (runs before api & gui)
  all: null,

  // API requests (starts w/ '/api')
  api: null,

  // GUI requests (doesn't start w/ '/api')
  gui: null,
}