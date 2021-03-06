'use strict';

var expect = require('chai').expect;

var supportsAsyncWrap = require('../../../src/tracing/index').supportsAsyncWrap;
var expressOpentracingControls = require('../../apps/expressOpentracingControls');
var agentStubControls = require('../../apps/agentStubControls');
var config = require('../../config');
var utils = require('../../utils');

describe('tracing/opentracing/integration', function() {
  if (!supportsAsyncWrap(process.versions.node)) {
    return;
  }

  this.timeout(config.getTestTimeout());

  agentStubControls.registerTestHooks();
  expressOpentracingControls.registerTestHooks();

  beforeEach(function() {
    return agentStubControls.waitUntilAppIsCompletelyInitialized(expressOpentracingControls.getPid());
  });

  it('must not generate opentracing traces when OT is not used', function() {
    return expressOpentracingControls.sendRequest({path: '/'})
    .then(function() {
      return utils.retry(function() {
        return agentStubControls.getSpans()
        .then(function(spans) {
          expect(spans).to.have.lengthOf(1);
          expect(spans[0].n).to.equal('node.http.server');
        });
      });
    });
  });


  it('must generate opentracing traces', function() {
    return expressOpentracingControls.sendRequest({path: '/withOpentracing'})
    .then(function() {
      return utils.retry(function() {
        return agentStubControls.getSpans()
        .then(function(spans) {
          expect(spans).to.have.lengthOf(3);

          utils.expectOneMatching(spans, function(span) {
            expect(span.n).to.equal('node.http.server');
            expect(span.f.e).to.equal(String(expressOpentracingControls.getPid()));
          });

          var serviceSpan = utils.expectOneMatching(spans, function(span) {
            expect(span.t).to.be.a('string');
            expect(span.s).to.be.a('string');
            expect(span.s).to.equal(span.t);
            expect(span.p).to.equal(undefined);
            expect(span.n).to.equal('sdk');
            expect(span.f.e).to.equal(String(expressOpentracingControls.getPid()));
            expect(span.data.sdk.name).to.equal('service');
            expect(span.data.sdk.type).to.equal('entry');
          });

          utils.expectOneMatching(spans, function(span) {
            expect(span.t).to.equal(serviceSpan.t);
            expect(span.p).to.equal(serviceSpan.s);
            expect(span.s).to.be.a('string');
            expect(span.s).not.to.equal(span.t);
            expect(span.s).not.to.equal(span.p);
            expect(span.n).to.equal('sdk');
            expect(span.f.e).to.equal(String(expressOpentracingControls.getPid()));
            expect(span.data.sdk.name).to.equal('auth');
            expect(span.data.sdk.type).to.equal('local');
          });
        });
      });
    });
  });


  it('must connect instana trace to opentracing spans', function() {
    return expressOpentracingControls.sendRequest({path: '/withOpentracingConnectedToInstanaTrace'})
    .then(function() {
      return utils.retry(function() {
        return agentStubControls.getSpans()
        .then(function(spans) {
          expect(spans).to.have.lengthOf(2);

          var httpSpan = utils.expectOneMatching(spans, function(span) {
            expect(span.n).to.equal('node.http.server');
            expect(span.f.e).to.equal(String(expressOpentracingControls.getPid()));
          });

          utils.expectOneMatching(spans, function(span) {
            expect(span.t).to.equal(httpSpan.t);
            expect(span.p).to.equal(httpSpan.s);
            expect(span.s).to.be.a('string');
            expect(span.s).not.to.equal(span.t);
            expect(span.s).not.to.equal(span.p);
            expect(span.n).to.equal('sdk');
            expect(span.f.e).to.equal(String(expressOpentracingControls.getPid()));
            expect(span.data.sdk.name).to.equal('service');
          });
        });
      });
    });
  });
});
