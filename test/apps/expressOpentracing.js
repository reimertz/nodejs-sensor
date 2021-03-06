/* eslint-disable */

var instana = require('../../');
instana({
  agentPort: process.env.AGENT_PORT,
  level: 'info',
  tracing: {
    enabled: process.env.TRACING_ENABLED === 'true',
    forceTransmissionStartingAt: 1
  }
});

var opentracing = require('opentracing');
var express = require('express');
var app = express();

opentracing.initGlobalTracer(instana.opentracing.createTracer());
var tracer = opentracing.globalTracer();

app.get('/', function(req, res) {
  res.send('OK');
});

app.get('/withOpentracing', function(req, res) {
  var serviceSpan = tracer.startSpan('service');
  serviceSpan.setTag(opentracing.Tags.SPAN_KIND, opentracing.Tags.SPAN_KIND_RPC_SERVER);
  var authSpan = tracer.startSpan('auth', {childOf: serviceSpan});
  authSpan.finish();
  serviceSpan.finish();
  res.send('OK');
});

app.get('/withOpentracingConnectedToInstanaTrace', function(req, res) {
  var spanContext = instana.opentracing.getCurrentlyActiveInstanaSpanContext();
  var serviceSpan = tracer.startSpan('service', {childOf: spanContext});
  serviceSpan.finish();
  res.send('OK');
});

app.listen(process.env.APP_PORT, function() {
  log('Listening on port: ' + process.env.APP_PORT);
});

function log() {
  var args = Array.prototype.slice.call(arguments);
  args[0] = 'Express OT App (' + process.pid + '):\t' + args[0];
  console.log.apply(console, args);
}
