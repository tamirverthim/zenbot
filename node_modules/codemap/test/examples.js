var codemap = require('../');
var assert = require('assert');

describe('examples', function () {
  it('alter', function () {
    var app = codemap(require('./maps/example_alter'));
    var val = app.get('some.key');
    assert.equal(val, 'altered');
    var otherVal = app.get('some.other.key');
    assert.equal(otherVal, 'fifth');
  });
  it('container', function () {
    var app = codemap(require('./maps/example_container'));
    var val = app.get('some.thing');
    var otherVal = app.get('some.other.thing');
    assert.equal(val['some-key'], 'some-value');
    assert.deepEqual(val, otherVal);
  });
  it('merge', function () {
    var app = codemap(require('./maps/example_merge'));
    var val = app.get('some.thing');
    assert.deepEqual(val, {a: 0, b: 4, c: 10, d: {e: 'h', g: true}});
    app.set('some.thing{}', {
      d: 6,
      x: 'xx'
    });
    var val = app.get('some.thing');
    assert.deepEqual(val, {a: 0, b: 4, c: 10, d: {e: 'h', g: true}, x: 'xx'});
  });
  it('meta', function () {
    var app = codemap(require('./maps/example_meta'));
    assert.throws(function () {
      app.get('_some.thing');
    }, /path `_some.thing` is undefined/);
    assert.throws(function () {
      app.get('_some.other.thing');
    }, /path `_some.other.thing` is undefined/);
    var val = app.get('some.actual.thing');
    assert.equal(val, 'ok');
  });
  it('ns', function () {
    var app = codemap(require('./maps/example_ns'));
    var val = app.get('imports.yet.another.path');
    assert.equal(typeof val, 'number');
    var otherVal = app.get('something-double-nested:yet.another.path');
    assert.equal(val, otherVal);
    var topLevelVal = app.get('top.level.path');
    assert.equal(topLevelVal, 'top-level-value');
    var nestedVal = app.get('something-nested:some.path');
    assert.equal(nestedVal, 'some-value altered altered!');
    var peerVal = app.get('something-else-nested:get.from.peer');
    assert.equal(peerVal, 'some-value altered altered!');
    var exported = app.export();
    assert.deepEqual(exported, {
      top: {
        level: {
          path: 'top-level-value'
        }
      },
      imports: {
        yet: {
          another: {
            path: val
          }
        }
      }
    });
  });
  it('pointer', function () {
    var app = codemap(require('./maps/example_pointer'));
    var val = app.get('some.other.path');
    assert.equal(val, 'nope');
    var importVal = app.get('imports.some.path');
    assert.equal(importVal, 'ok');
  });
  it('push', function () {
    var app = codemap(require('./maps/example_push'));
    var val = app.get('some.thing');
    assert.deepEqual(val, ['minus-one', 'zero', 'first', 'second', 'third', 'fourth', 'fifth', 'sixth']);
  });
  it('clear', function () {
    var app = codemap(require('./maps/example_clear'));
    var val = app.get('some.thing.cached');
    var val2 = app.get('some.thing.cached');
    assert.equal(val, val2)
    app.get('clear.the.thing')
    var val3 = app.get('some.thing.cached');
    assert(val != val3)
  });
  it('exists', function () {
    var app = codemap(require('./maps/example_exists'));
    var val = app.get('thing.that.exists');
    assert.equal(val, 'foo');
    assert.equal(app.exists('thing.that.exists'), true);
    assert.equal(app.exists('thing.that.does.not.exist.yet'), false);
    app.set('thing.that.does.not.exist.yet', 'bar');
    assert.equal(app.exists('thing.that.does.not.exist.yet'), true);
    var val2 = app.get('thing.that.does.not.exist.yet');
    assert.equal(val2, 'bar');
    var val3 = app.get('test.get.alias');
    assert.equal(val3, 'alias worked');
  });
});