import * as pm2 from 'pm2'

export const connect = () => new Promise<void>((res, rej) => {
  pm2.connect((err) => err ? rej(err) : res())
})

export const disconnect = () => new Promise<void>((res, rej) => {
  (pm2.disconnect as typeof pm2.connect)((err) => err ? rej(err) : res())
})

export const list = () => new Promise<pm2.ProcessDescription[]>((res, rej) => {
  pm2.list((err, list) => err ? rej(err) : res(list))
})

export const restart = (procId: string | number, updateEnv = true) => new Promise<void>((res, rej) => {
  (pm2.restart as typeof pm2.reload)(procId, { updateEnv }, (err) => err ? rej(err) : res())
})


// Include process.env vars
declare global {
  namespace NodeJS {
      interface ProcessEnv {
          NODE_APP_INSTANCE?: string;
      }
  }
}