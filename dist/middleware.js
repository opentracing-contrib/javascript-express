"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = middleware;

var _opentracing = require("opentracing");

var opentracing = _interopRequireWildcard(_opentracing);

var _url = require("url");

var url = _interopRequireWildcard(_url);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function middleware() {
  var options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

  var tracer = options.tracer || opentracing.globalTracer();

  return function (req, res, next) {
    var wireCtx = tracer.extract(opentracing.FORMAT_HTTP_HEADERS, req.headers);
    var pathname = url.parse(req.url).pathname;
    var span = tracer.startSpan(pathname, { childOf: wireCtx });
    span.log({ event: 'request_received' });

    // include some useful tags on the trace
    span.setTag('http.method', req.method);
    span.setTag('span.kind', 'server');
    span.setTag('http.url', req.url);

    // include trace ID in headers so that we can debug slow requests we see in
    // the browser by looking up the trace ID found in response headers
    var responseHeaders = {};
    tracer.inject(span, opentracing.FORMAT_TEXT_MAP, responseHeaders);
    Object.keys(responseHeaders).forEach(function (key) {
      return res.setHeader(key, responseHeaders[key]);
    });

    // add the span to the request object for handlers to use
    Object.assign(req, { span: span });

    res.on('finish', function () {
      span.log({ event: 'response_finished' });
      span.setOperationName(req.route && req.route.path || pathname);
      span.setTag('http.status_code', res.statusCode);

      if (res.statusCode >= 500) {
        span.setTag('error', true);
        span.setTag('sampling.priority', 1);
      }
    });

    res.on('close', function () {
      span.log({ event: 'response_closed' });
      span.finish();
    });

    next();
  };
}