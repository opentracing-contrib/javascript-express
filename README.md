# tracing-middleware

Middleware for express to enable opentracing.
Supports any opentracing tracer compatible with version 0.11.0 of the opentracing javascript library.

## Install
```
npm install --save tracing-middleware
```

## Usage

E.g., using LightStep as your tracer:

```
import * as express from "express";
import middleware from "tracing-middleware";
import * as LightStep from "lightstep-tracer";

const lsTracer = LightStep.tracer({
  access_token   : 'foo',
  component_name : 'bar',
});

const app = express();
app.use(middleware({tracer: lsTracer}));
```

## Options
The `middleware` function takes in an options object as its only argument.
```
const options = {
  tracer: [Tracer], // Defaults to the opentracing no-op tracer.
}
```
