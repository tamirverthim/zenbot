var assert = require('assert');
var container = require('../../').container;

module.exports = {
  'some.thing': function container (get) { // functions named "container" get evaluated
    assert.equal(typeof this.get, 'function');
    return get('some.other.thing'); // get another path (should resolve to another eval'ed container)
  },
  'some.other.thing': container(function (get) {
    return {
      'some-key': 'some-value',
      rand: Math.random()
    }
  })
}