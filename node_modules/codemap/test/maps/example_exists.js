var assert = require('assert');

module.exports = {
  'thing.that.exists': 'foo',
  'test.get.alias': function container(get) {
    assert.equal(get.exists('thing.that.exists'), true);
    assert.equal(get.exists('thing.that.definitely.does.not.exist'), false);
    return 'alias worked';
  }
};