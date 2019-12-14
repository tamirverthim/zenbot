var assert = require('assert');
var alter = require('../../').alter;

module.exports = {
  _folder: 'some',
  _maps: [
    {
      _folder: 'some',
      'key': 'default value',
      'other.key': 'first',
      '@other.key[20]': function alter (val) {
        assert.equal(val, 'fourth');
        return 'fifth';
      }
    }
  ],
  '@key': 'altered', // "@" prefix alters the value
  '@other.key[10]': function alter (val) { // function named "alter" gets evaluated
    assert.equal(val, 'third');
    return 'fourth';
  },
  '@other.key[-1]': function alter (val) {
    assert.equal(val, 'first');
    assert.equal(typeof this.get, 'function');
    return 'second';
  },
  '@other.key': alter(function (val) {
    assert.equal(val, 'second');
    return 'third';
  })
}