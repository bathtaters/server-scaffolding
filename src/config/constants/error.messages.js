module.exports = {
  defaultError: { 
    status: 500,
    message: "Unknown server error"
  },
  missingError: {
    status: 404,
    message: "Invalid address and/or method."
  },
  testError: {
    status: 418,
    message: "API is not a Teapot."
  },
}