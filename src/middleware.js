import * as opentracing from "opentracing";
import * as url from "url";

export default function middleware(options = {}) {
  const tracer = options.tracer || opentracing.globalTracer();

  return (req, res, next) => {
    const wireCtx = tracer.extract(opentracing.FORMAT_HTTP_HEADERS, req.headers);
    const pathname = url.parse(req.url).pathname;
    const span = tracer.startSpan(pathname, { childOf: wireCtx });
    span.log({ event: 'request_received' });

    // include some useful tags on the trace
    span.setTag('http.method', req.method);
    span.setTag('span.kind', 'server');
    span.setTag('http.url', req.url);

    // include trace ID in headers so that we can debug slow requests we see in
    // the browser by looking up the trace ID found in response headers
    const responseHeaders = {};
    tracer.inject(span, opentracing.FORMAT_TEXT_MAP, responseHeaders);
    Object.keys(responseHeaders).forEach((key) =>
      res.setHeader(key, responseHeaders[key]),
    );

    // add the span to the request object for handlers to use
    Object.assign(req, { span });

    res.on('finish', () => {
      span.log({ event: 'response_finished' });
      span.setOperationName(req.route && req.route.path || pathname);
      span.setTag('http.status_code', res.statusCode);

      if (res.statusCode >= 500) {
        span.setTag('error', true);
        span.setTag('sampling.priority', 1);
      }
    });

    res.on('close', () => {
      span.log({ event: 'response_closed' });
      span.finish();
    });
    
    next()
  };
}
