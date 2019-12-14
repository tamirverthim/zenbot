module.exports = {
  'some.thing.cached': function container (get, set) {
    return Math.random()
  },
  'clear.the.thing': function container (get, set, clear) {
    clear('some.thing.cached')
    return true
  }
}