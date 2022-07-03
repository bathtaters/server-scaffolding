module.exports = (injectReq = {}, injectRes = {}) => [
  ({
    getMockName: () => 'req',
    method: 'TEST',
    originalUrl: '/',
    params: {},
    body: {},
    ...injectReq
  }),({
    getMockName: () => 'res',
    status: jest.fn(),
    send: jest.fn(),
    end: jest.fn(),
    render: jest.fn(),
    getHeaders: jest.fn(),
    statusCode: 'STATUS',
    ...injectRes
  }),
  jest.fn().mockName('next')
]