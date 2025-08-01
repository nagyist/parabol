import type {HttpRequest, HttpResponse} from 'uWebSockets.js'
import fs from 'fs'
import mime from 'mime-types'
import path from 'path'
import pipeStreamOverResponse from './pipeStreamOverResponse'

const getProjectRoot = () => {
  let cd = __dirname
  while (cd !== '/') {
    if (fs.existsSync(path.join(cd, 'pnpm-lock.yaml'))) return cd
    cd = path.join(cd, '..')
  }
  return cd
}

const PROJECT_ROOT = getProjectRoot()

const selfHostedHandler = async (res: HttpResponse, req: HttpRequest) => {
  const url = path.join(PROJECT_ROOT, decodeURI(req.getUrl()))
  let stats: fs.Stats
  try {
    stats = fs.statSync(url)
  } catch {
    res.cork(() => res.writeStatus('404').end())
    return
  }
  const {size} = stats
  const ext = path.extname(url).slice(1)
  const contentType = mime.types[ext] ?? 'application/octet-stream'

  res.cork(() => res.writeHeader('content-type', contentType))
  const readStream = fs.createReadStream(url)
  pipeStreamOverResponse(res, readStream, size)
}

export default selfHostedHandler
