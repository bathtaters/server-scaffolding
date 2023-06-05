import type { Middleware } from "../types/express"

export default function httpArgs(
  injectReq: Partial<Parameters<Middleware>['0']> = {},
  injectRes: Partial<Parameters<Middleware>['1']> = {},
): Parameters<Middleware>
{
  return [
    
    // REQ
    {
      getMockName: () => 'req',
      method: 'TEST',
      originalUrl: '/',
      params: {},
      body: {},
      ...injectReq
    },

    // RES
    {
      getMockName: () => 'res',
      status: jest.fn(),
      send: jest.fn(),
      end: jest.fn(),
      render: jest.fn(),
      getHeaders: jest.fn(),
      statusCode: 'STATUS',
      ...injectRes
    },

    // NEXT
    jest.fn().mockName('next'),

  ] as any
}