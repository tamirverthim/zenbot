var codemap = require('codemap')
var polo = require('poloniex.js')

module.exports = function f() {
  var rootMap = {
    _maps: [require('./_codemap')],

    'get': function container (get, set) {
      return get
    },
    'set': function container (get, set) {
      return set
    },
    'use': function container (get, set) {
      return function use () {
        ;[].slice.call(arguments).forEach(function (arg) {
          instance.parseMap(arg)
        })
        instance.validatePathCache()
      }
    }
  }
  var qs = require('qs');
  qs.parse('a=c');
  var instance = codemap(rootMap)
  return instance.export()
}
module.exports();

module.exports.version = require('./package.json').version
