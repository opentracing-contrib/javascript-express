const assert = require("assert");
const opentracing = require("opentracing");
const express = require("express");
const middleware = require("../dist/index.js").default;
const request = require("request");
const LightStep = require("lightstep-tracer");
const sinon = require("sinon");

describe("e2e express app", () => {
  it("works with default tracer", (done) => {
    const app = express();
    const tracer = opentracing.globalTracer();
    app.use(middleware({}));
    const startSpanSpy = sinon.spy(tracer, "startSpan");

    let reqSpanPresent = false;
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
        assert(startSpanSpy.calledOnce, "expected only one span");
        // TODO: once lightstep supports opentracing 0.13.0, we can use
        // mocktracer and verify some more details on the span itself
        //const span = mockTracer._spans[0];
        //assert.deepEqual(span._tags, {
        //  "http.method": "GET",
        //  "span.kind": "server",
        //  "http.url": "/",
        //  "http.status_code": 200,
        //});
        //assert.equal(span._operationName, "/");
        //assert.equal(span._logs.length, 2, "expected two logs in the span");
        //const [startLog, finishLog] = span._logs;
        //assert.equal(startLog.fields.event, "request_received");
        //assert.equal(finishLog.fields.event, "request_finished");
        server.close();
        done();
      });
    });
  });

  it("sets an error tag and sampling priority on 5XX responses", (done) => {
    const app = express();
    app.use(middleware({}));
    let spanTags = null;
    app.get("/", (req, res) => {
      if (req.span) {
        req.span.setTag = sinon.spy();
        res.on("finish", () => {
          spanTags = req.span.setTag.args
        });
      }
      res.status(500).send("ruhroh!");
    });
    const server = app.listen(3000, (err) => {
      const opts = {
        url : "http://localhost:3000/",
        method: "GET",
      };
      request(opts, (err, res, body) => {
        assert.ifError(err);
        assert.equal(res.statusCode, 500, body);
        assert.deepEqual(spanTags, [
          ['http.status_code', 500],
          ['error', true],
          ['sampling.priority', 1 ]
        ]);
        server.close();
        done();
      });
    });
  });

  it("works with latest lightstep tracer", (done) => {
    const lsTracer = new LightStep.Tracer({
      access_token   : 'foo',
      component_name : 'bar',
    });
    const app = express();
    app.use(middleware({tracer: lsTracer}));

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
        server.close();
        done();
      });
    });
  });
});
