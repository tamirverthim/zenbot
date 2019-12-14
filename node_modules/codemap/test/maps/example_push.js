module.exports = {
  _maps: [
    {
      'some.thing[4]': 'fifth'
    }
  ],
  'some.thing[15]': ['sixth'],
  'some.thing[-2]': [
    'first', 'second'
  ],
  'some.thing': ['#other.thing', 'zero'],
  'some.thing[]': function container (get) {
    return ['third', 'fourth'];
  },
  'other.thing': 'minus-one'
}