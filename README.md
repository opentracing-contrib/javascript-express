# tracing-middleware

Middleware for express to enable opentracing. Configured for Lightstep, but supports any opentracing implementation.

## Install
```
npm install --save "tracing-middleware
```

## Usage
```
import * as express from "express";
import middleware from "tracing-middleware";

const app = express();
const LIGHTSTEP_ACCESS_TOKEN = "access_token";
app.use(middleware({access_token: LIGHTSTEP_ACCESS_TOKEN}));
```

## Options
The `middleware` function takes in an options object as its only argument.
```
const options = {
  tracer: {}, // Override the tracer used in this middleware with your own custom tracing implementation
  access_token: "Lightstep access token", // Creates a lightstep tracer if provided
}
```
If neither `tracer` nor `access_token` is provided (e.g. `app.use(middleware())`), then the default opentracing library is used.
