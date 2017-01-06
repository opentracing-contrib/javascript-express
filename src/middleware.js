import tracer from "opentracing";
import * as url from "url";

export default function middleware(options = {}) {
  if (options.tracer) {
    tracer.initGlobalTracer(options.tracer);
  } else {
    tracer.initGlobalTracer();
  }

  return (req, res, next) => {
    const wireCtx = tracer.extract(tracer.FORMAT_HTTP_HEADERS, req.headers);
    const pathname = url.parse(req.url).pathname;
    const span = tracer.startSpan(pathname, {childOf: wireCtx});
    span.logEvent("request_received");

    // include some useful tags on the trace
    span.setTag("http.method", req.method);
    span.setTag("span.kind", "server");
    span.setTag("http.url", req.url);

    // include trace ID in headers so that we can debug slow requests we see in
    // the browser by looking up the trace ID found in response headers
    const responseHeaders = {};
    tracer.inject(span, tracer.FORMAT_TEXT_MAP, responseHeaders);
    Object.keys(responseHeaders).forEach(key => res.setHeader(key, responseHeaders[key]));

    // add the span to the request object for handlers to use
    Object.assign(req, {span});

    // finalize the span when the response is completed
    res.on("finish", () => {
      span.logEvent("request_finished");
      // Route matching often happens after the middleware is run. Try changing the operation name
      // to the route matcher.
      const opName = (req.route && req.route.path) || pathname;
      span.setOperationName(opName);
      span.setTag("http.status_code", res.statusCode);
      if (res.statusCode >= 500) {
        span.setTag("error", true);
        span.setTag("sampling.priority", 1);
      }
      span.finish();
    });
    next();
  };
}
