import lightstep from "lightstep-tracer";
import tracer from "opentracing";
import * as url from "url";

export default function middleware(options = {}) {
  if (options.tracer) {
    tracer.initGlobalTracer(options.tracer);
  } else if (options.access_token) {
    // default to lightstep if no tracer is given but access_token is provided
    tracer.initGlobalTracer(lightstep.tracer({
      access_token: options.access_token,
      component_name: options.source,
    }));
  } else {
    tracer.initGlobalTracer();
  }

  return (req, res, next) => {
    const wireCtx = tracer.extract(tracer.FORMAT_HTTP_HEADERS, req.headers);
    const urlp = url.parse(req.url);
    const span = tracer.startSpan(urlp.pathname, {childOf: wireCtx});
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
      span.setTag("http.status_code", res.statusCode);
      if (res.statusCode >= 500) {
        span.setTag("error", true);
      }
      span.finish();
    });
    next();
  };
}
