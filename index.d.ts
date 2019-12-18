declare module 'express-opentracing' {
  import { Tracer } from 'opentracing'
  import { RequestHandler } from 'express'
  export type MiddlewareOptions = {
    tracer: Tracer
  }
  export default function middleware(options: MiddlewareOptions): RequestHandler
}
