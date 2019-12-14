var debug = require('debug')('codemap')

function PlainObject() {}
PlainObject.prototype = Object.create(null);

isObject = function (val) {
  return Object.prototype.toString.call(val) === '[object Object]';
}

isArray = function (val) {
  return Object.prototype.toString.call(val) === '[object Array]';
}

function shallowCopy (obj) {
  var ret = new PlainObject();
  Object.keys(obj).forEach(function (k) {
    ret[k] = obj[k];
  });
  return ret;
}

function named (name, fn) {
  return Object.defineProperty(function () {
    return fn.apply(this, arguments)
  }, '_name', {value: name})
}
codemap.named = named;
codemap.container = named.bind(null, 'container');
codemap.alter = named.bind(null, 'alter');

module.exports = codemap;
var globalId = module.exports.globalId = 0;

function codemap(rootMap) {
  var app = {
    merge: function merge(a, b) {
      if (isObject(a) && isObject(b)) {
        Object.keys(b).forEach(function (i) {
          if (isObject(a[i]) && isObject(b[i])) {
            a[i] = app.merge(a[i], b[i]);
          } else if (isArray(a[i]) && isArray(b[i])) {
            a[i] = a[i].concat(b[i]);
          } else {
            a[i] = b[i];
          }
        });
      } else if (isArray(a) && isArray(b)) {
        a = a.concat(b);
      } else {
        a = b;
      }
      return a;
    },
    plainObject: function plainObject() {
      return new PlainObject();
    },
    pathObject: function(path) {
      app.merge(path, {
        get: function get(p) {
          return app.get(p, path.map._ns);
        },
        exists: function exists(p) {
          return app.exists(p, path.map._ns);
        },
        set: function set(p, val) {
          return app.set(p, val, path.map._ns);
        },
        clear: function clear(p) {
          return app.clear(p, path.map._ns);
        }
      });
      path.get.exists = path.exists;
      return path;
    },
    parsePath: function parsePath(p, map) {
      var alterMatch = p.match(/^@(?:(.+):)?([^\[]+)(\[(\-?\d*)\])?$/);
      if (alterMatch) {
        var prefix = !alterMatch[1] && map._folder ? map._folder + '.' : '';
        return app.pathObject({
          p: p,
          ns: alterMatch[1] || map._ns,
          pointer: prefix + alterMatch[2],
          op: 'alter',
          weight: alterMatch[3] ? parseInt(alterMatch[3].replace(/\[|\]/g, ''), 10) : 0,
          value: map[p],
          map: map
        });
      }
      var pushMatch = p.match(/^(?:(.+):)?([^\[]+)\[(\-?\d*)\]$/);
      if (pushMatch) {
        var prefix = !pushMatch[1] && map._folder ? map._folder + '.' : '';
        return app.pathObject({
          p: p,
          ns: pushMatch[1] || map._ns,
          pointer: prefix + pushMatch[2],
          op: 'push',
          weight: pushMatch[3] ? parseInt(pushMatch[3].replace(/\[|\]/g, ''), 10) : 0,
          value: map[p],
          map: map
        });
      }
      var mergeMatch = p.match(/^(?:(.+):)?([^\{]+)\{(\-?\d*)\}$/);
      if (mergeMatch) {
        var prefix = !mergeMatch[1] && map._folder ? map._folder + '.' : '';
        return app.pathObject({
          p: p,
          ns: mergeMatch[1] || map._ns,
          pointer: prefix + mergeMatch[2],
          op: 'merge',
          weight: mergeMatch[3] ? parseInt(mergeMatch[3].replace(/\{|\}/g, ''), 10) : 0,
          value: map[p],
          map: map
        });
      }
      if (p.charAt(0) === '_') return null;
      var setMatch = p.match(/^(?:(.+):)?(.*)$/);
      if (!setMatch) {
        var err = new Error('invalid path `' + p + '`');
        throw err;
      }
      var prefix = !setMatch[1] && map._folder ? map._folder + '.' : '';
      return app.pathObject({
        p: p,
        ns: setMatch[1] || map._ns,
        pointer: prefix + setMatch[2],
        op: 'set',
        value: map[p],
        map: map
      });
    },
    parseMap: function parseMap(map) {
      if (map['_maps']) {
        map['_maps'].forEach(function (map) {
          app.parseMap(map);
        });
      }
      Object.keys(map).forEach(function (p) {
        var parsed = app.parsePath(p, map);
        if (parsed) {
          //debug('adding path cache', parsed)
          app.addPathCache(parsed);
        }
      });
    },
    addPathCache: function addPathCache(parsed) {
      var p = parsed.ns ? parsed.ns + ':' + parsed.pointer : parsed.pointer;
      if (typeof app._pathCache[p] === 'undefined') {
        app._pathCache[p] = [];
      }
      parsed.id = globalId++;
      app._pathCache[p].push(parsed);
      return p;
    },
    getPathCache: function getPathCache(p) {
      return app._pathCache[p] || [];
    },
    clearCache: function clearCache(p) {
      if (typeof p === 'undefined') {
        app._valCache = app.plainObject();
      }
      else if (typeof p === 'string') {
        delete app._valCache[p];
      }
    },
    addValCache: function addValCache(p, val) {
      app._valCache[p] = val;
    },
    getValCache: function getValCache(p) {
      return app._valCache[p];
    },
    clear: function clear(p, defaultNs) {
      debug('CLEAR', p, defaultNs)
      if (!defaultNs) defaultNs = rootMap._ns;
      var map = {_ns: defaultNs};
      var parsed = app.parsePath(p, map);
      if (parsed) {
        var key = parsed.ns ? parsed.ns + ':' + parsed.pointer : parsed.pointer;
        app.clearCache(key);
      }
      else {
        var err = new Error('invalid path `' + p + '`');
        throw err;
      }
    },
    set: function set(p, val, defaultNs) {
      debug('SET', p, val, defaultNs)
      if (!defaultNs) defaultNs = rootMap._ns;
      var map = {_ns: defaultNs};
      map[p] = val;
      var parsed = app.parsePath(p, map);
      if (parsed) {
        var key = app.addPathCache(parsed);
        app.clearCache(key);
        app.validatePathCache();
      }
      else {
        var err = new Error('invalid path `' + p + '`');
        throw err;
      }
    },
    exists: function exists(p, defaultNs) {
      if (!defaultNs) defaultNs = rootMap._ns;
      if (defaultNs && p.indexOf(':') === -1) {
        p = defaultNs + ':' + p;
      }
      debug('EXISTS', p);

      var paths = app.getPathCache(p);
      if (paths.length) {
        debug('EXISTS', p, 'was found in path cache');
        return true;
      }

      debug('EXISTS', p, 'was not found');
      return false;
    },
    get: function get(p, defaultNs) {
      if (!defaultNs) defaultNs = rootMap._ns;
      if (defaultNs && p.indexOf(':') === -1) {
        p = defaultNs + ':' + p;
      }
      debug('GET', p)

      var cached = app.getValCache(p);
      if (typeof cached !== 'undefined') {
        debug('GET', p, 'was cached')
        return cached;
      }
      var paths = app.getPathCache(p);
      if (!paths.length) {
        var err = new Error('path `' + p + '` is undefined');
        err.path = p;
        throw err;
      }
      var val = null;
      // debug(JSON.stringify(paths, null, 2))
      paths.forEach(function (path) {
        var tmp = app.getValue(path);
        //debug('get value', path.p, ' === ', tmp);
        if (typeof tmp === 'undefined') {
          var _err = new Error('undefined value for `' + p + '`');
          _err.path = path;
          throw _err;
        }
        switch (path.op) {
          case 'set':
            val = tmp;
            break;
          case 'push':
            if (!val) val = [];
            if (!isArray(val)) {
              var _err2 = new Error('cannot push to non-array `' + p + '`');
              _err2.val = val;
              _err2.tmp = tmp;
              _err2.path = path;
              throw _err2;
            }
            debug('concat', val, tmp)
            val = val.concat(tmp);
            break;
          case 'merge':
            if (!val) val = app.plainObject();
            if (!isObject(val) || !isObject(tmp)) {
              var _err3 = new Error('cannot merge non-object-literal `' + p + '`');
              _err3.val = val;
              _err3.tmp = tmp;
              _err3.path = path;
              throw _err3;
            }
            val = app.merge(val, tmp);
            break;
          case 'alter':
            if (typeof tmp === 'function' && (tmp.name === 'alter' || tmp._name === 'alter')) {
              val = tmp.call(app, val);
            } else val = tmp;
            break;
        }
      });
      //debug('val', val);
      app.addValCache(p, val);
      return val;
    },
    getValue: function getValue(path) {
      if (isArray(path.value)) {
        //debug('resolving array', path.value)
        return path.value.map(function (val) {
          var pathCopy = shallowCopy(path);
          pathCopy.value = val;
          //debug('path Copy', pathCopy)
          return app.getValue(pathCopy);
        });
      }
      var pointerValue = app.isPointer(path);
      if (pointerValue) {
        return path.get(pointerValue);
      }
      return typeof path.value === 'function' && (path.value.name === 'container' || path.value._name === 'container')
        ? path.value.call(app, path.get, path.set, path.clear)
        : path.value;
    },
    validatePathCache: function validatePathCache() {
      Object.keys(app._pathCache).forEach(function (p) {
        var hasSet = false;
        var hasMerge = false;
        var hasPush = false;
        var hasAlter = false;
        var paths = app._pathCache[p];
        // order paths by op
        paths.sort(function (a, b) {
          if (a.op === 'set' && b.op !== 'set') return -1;
          if (b.op === 'set' && a.op !== 'set') return 1;
          if (a.op === 'alter' && b.op !== 'alter') return 1;
          if (b.op === 'alter' && a.op !== 'alter') return -1;
          if (a.weight < b.weight) return -1;
          if (b.weight < a.weight) return 1;
          if (a.id < b.id) return -1;
          if (b.id < a.id) return 1;
          return 0;
        });

        paths.forEach(function (path) {
          if (typeof path.value === 'undefined') {
            var err = new Error('undefined value for `' + p + '`');
            err.path = path;
            throw err;
          }
          switch (path.op) {
            case 'set':
              if (hasSet) {
                var _err4 = new Error('cannot set path twice `' + p + '`');
                _err4.path = p;
                _err4.paths = app._pathCache[p];
                throw _err4;
              }
              hasSet = true;
              break;
            case 'push':
              if (hasMerge) {
                var _err5 = new Error('cannot push and merge to same path `' + p + '`');
                _err5.path = p;
                _err5.paths = app._pathCache[p];
                throw _err5;
              }
              hasPush = true;
              break;
            case 'merge':
              if (hasPush) {
                var _err6 = new Error('cannot push and merge to same path `' + p + '`');
                _err6.path = p;
                _err6.paths = app._pathCache[p];
                throw _err6;
              }
              hasMerge = true;
              break;
            case 'alter':
              hasAlter = true;
              break;
          }
          var pointerValue = app.isPointer(path);
          if (pointerValue && typeof app._pathCache[pointerValue] === 'undefined') {
            var _err7 = new Error('cannot point to undefined path `' + pointerValue + '`');
            _err7.path = p;
            _err7.paths = app._pathCache[p];
            _err7.pointer = pointerValue;
            throw _err7;
          }
        });
        if (hasAlter && !(hasSet || hasMerge || hasPush)) {
          var err = new Error('cannot alter undefined path `' + p + '`');
          err.path = p;
          err.paths = app._pathCache[p];
          throw err;
        }
      });
    },
    isPointer: function isPointer(path) {
      if (typeof path.value !== 'string') return false;
      var pointerMatch = path.value.match(/^#(?:(.+):)?(.*)$/);
      if (pointerMatch) {
        var ns = pointerMatch[1] || path.ns;
        var prefix = ns ? ns + ':' : '';
        return prefix + pointerMatch[2];
      }
      return false;
    },
    export: function _export() {
      var ret = app.plainObject();
      var pathStrings = [];
      Object.keys(rootMap).forEach(function (k) {
        var path = app.parsePath(k, rootMap);
        if (path && (!path.ns || path.ns === rootMap._ns)) {
          var p = path.ns ? path.ns + ':' + path.pointer : path.pointer;
          if (pathStrings.indexOf(p) === -1) {
            pathStrings.push(p);
          }
        }
      });
      pathStrings.sort(function (a, b) {
        if (a.length < b.length) return -1;
        if (a.length > b.length) return 1;
        return 0;
      });
      pathStrings.forEach(function (p) {
        var parts = p.split('.');
        var current = ret;
        parts.forEach(function (part, idx) {
          if (typeof current[part] === 'undefined') current[part] = app.plainObject();
          if (idx == parts.length - 1) {
            current[part] = app.get(p);
          } else {
            current = current[part];
          }
        });
      });
      return ret;
    }
  };

  app._pathCache = app.plainObject();
  app.get.exists = app.exists;
  app.clearCache();
  app.parseMap(rootMap);
  app.validatePathCache();

  return app;
}