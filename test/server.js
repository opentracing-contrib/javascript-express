const assert = require("assert");
const opentracing = require("opentracing");
const {MockTracer} = require("opentracing/lib/mock_tracer");
const express = require("express");
const middleware = require("../dist/index.js").default;
const request = require("request");

describe("e2e express app", () => {
  it("works", (done) => {
    // create and start an express server, hit it with a request
    const mockTracer = new MockTracer();
    const noopTracer = new opentracing.Tracer();
    mockTracer._extract = noopTracer._extract;
    mockTracer._inject = noopTracer._inject;
    const app = express();
    app.use(middleware({tracer: mockTracer}));

    var reqSpanPresent = false;
    app.get("/", (req, res) => {
      if (req.span) {
        reqSpanPresent = true;
      }
      res.send("Hello World!")
    });

    const server = app.listen(3000, (err) => {
      const opts = {
        url : "http://localhost:3000/",
        method: "GET",
      };
      request(opts, (err, res, body) => {
        assert.ifError(err);
        assert.equal(res.statusCode, 200, body);
        assert(reqSpanPresent, "expected req.span to be set");
        assert.equal(mockTracer._spans.length, 1, "expected only one span");
        const span = mockTracer._spans[0];
        assert.deepEqual(span._tags, {
          "http.method": "GET",
          "span.kind": "server",
          "http.url": "/",
          "http.status_code": 200,
        });
        assert.equal(span._operationName, "/");
        assert.equal(span._logs.length, 2, "expected two logs in the span");
        const [startLog, finishLog] = span._logs;
        assert.equal(startLog.fields.event, "request_received");
        assert.equal(finishLog.fields.event, "request_finished");
        server.close();
        done();
      });
    });
  });
});
