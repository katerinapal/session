"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = session;

var _safeBuffer = require("safe-buffer");

var _safeBuffer2 = _interopRequireDefault(_safeBuffer);

var _cookie = require("cookie");

var _cookie2 = _interopRequireDefault(_cookie);

var _crypto = require("crypto");

var _crypto2 = _interopRequireDefault(_crypto);

var _debug = require("debug");

var _debug2 = _interopRequireDefault(_debug);

var _depd = require("depd");

var _depd2 = _interopRequireDefault(_depd);

var _onHeaders = require("on-headers");

var _onHeaders2 = _interopRequireDefault(_onHeaders);

var _parseurl = require("parseurl");

var _parseurl2 = _interopRequireDefault(_parseurl);

var _cookieSignature = require("cookie-signature");

var _cookieSignature2 = _interopRequireDefault(_cookieSignature);

var _uidSafe = require("uid-safe");

var _uidSafe2 = _interopRequireDefault(_uidSafe);

var _cookie3 = require("./session/cookie");

var _cookie4 = _interopRequireDefault(_cookie3);

var _memory = require("./session/memory");

var _memory2 = _interopRequireDefault(_memory);

var _session = require("./session/session");

var _session2 = _interopRequireDefault(_session);

var _store = require("./session/store");

var _store2 = _interopRequireDefault(_store);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/*!
 * express-session
 * Copyright(c) 2010 Sencha Inc.
 * Copyright(c) 2011 TJ Holowaychuk
 * Copyright(c) 2014-2015 Douglas Christopher Wilson
 * MIT Licensed
 */

'use strict';

/**
 * Module dependencies.
 * @private
 */

var Buffer = _safeBuffer2.default.Buffer;
var debug = (0, _debug2.default)('express-session');
var deprecate = (0, _depd2.default)('express-session');
var uid = _uidSafe2.default.sync;

// environment

var env = process.env.NODE_ENV;

/**
 * Expose constructors.
 */

session.Store = _store2.default;
session.Cookie = _cookie4.default;
session.Session = _session2.default;
session.MemoryStore = _memory2.default;

/**
 * Warning message for `MemoryStore` usage in production.
 * @private
 */

var warning = 'Warning: connect.session() MemoryStore is not\n' + 'designed for a production environment, as it will leak\n' + 'memory, and will not scale past a single process.';

/**
 * Node.js 0.8+ async implementation.
 * @private
 */

/* istanbul ignore next */
var defer = typeof setImmediate === 'function' ? setImmediate : function (fn) {
  process.nextTick(fn.bind.apply(fn, arguments));
};

/**
 * Setup session store with the given `options`.
 *
 * @param {Object} [options]
 * @param {Object} [options.cookie] Options for cookie
 * @param {Function} [options.genid]
 * @param {String} [options.name=connect.sid] Session ID cookie name
 * @param {Boolean} [options.proxy]
 * @param {Boolean} [options.resave] Resave unmodified sessions back to the store
 * @param {Boolean} [options.rolling] Enable/disable rolling session expiration
 * @param {Boolean} [options.saveUninitialized] Save uninitialized sessions to the store
 * @param {String|Array} [options.secret] Secret for signing session ID
 * @param {Object} [options.store=MemoryStore] Session store
 * @param {String} [options.unset]
 * @return {Function} middleware
 * @public
 */

function session(options) {
  var opts = options || {};

  // get the cookie options
  var cookieOptions = opts.cookie || {};

  // get the session id generate function
  var generateId = opts.genid || generateSessionId;

  // get the session cookie name
  var name = opts.name || opts.key || 'connect.sid';

  // get the session store
  var store = opts.store || new _memory2.default();

  // get the trust proxy setting
  var trustProxy = opts.proxy;

  // get the resave session option
  var resaveSession = opts.resave;

  // get the rolling session option
  var rollingSessions = Boolean(opts.rolling);

  // get the save uninitialized session option
  var saveUninitializedSession = opts.saveUninitialized;

  // get the cookie signing secret
  var secret = opts.secret;

  if (typeof generateId !== 'function') {
    throw new TypeError('genid option must be a function');
  }

  if (resaveSession === undefined) {
    deprecate('undefined resave option; provide resave option');
    resaveSession = true;
  }

  if (saveUninitializedSession === undefined) {
    deprecate('undefined saveUninitialized option; provide saveUninitialized option');
    saveUninitializedSession = true;
  }

  if (opts.unset && opts.unset !== 'destroy' && opts.unset !== 'keep') {
    throw new TypeError('unset option must be "destroy" or "keep"');
  }

  // TODO: switch to "destroy" on next major
  var unsetDestroy = opts.unset === 'destroy';

  if (Array.isArray(secret) && secret.length === 0) {
    throw new TypeError('secret option array must contain one or more strings');
  }

  if (secret && !Array.isArray(secret)) {
    secret = [secret];
  }

  if (!secret) {
    deprecate('req.secret; provide secret option');
  }

  // notify user that this store is not
  // meant for a production environment
  /* istanbul ignore next: not tested */
  if ('production' == env && store instanceof _memory2.default) {
    console.warn(warning);
  }

  // generates the new session
  store.generate = function (req) {
    req.sessionID = generateId(req);
    req.session = new _session2.default(req);
    req.session.cookie = new _cookie4.default(cookieOptions);

    if (cookieOptions.secure === 'auto') {
      req.session.cookie.secure = issecure(req, trustProxy);
    }
  };

  var storeImplementsTouch = typeof store.touch === 'function';

  // register event listeners for the store to track readiness
  var storeReady = true;
  store.on('disconnect', function ondisconnect() {
    storeReady = false;
  });
  store.on('connect', function onconnect() {
    storeReady = true;
  });

  return function session(req, res, next) {
    // self-awareness
    if (req.session) {
      next();
      return;
    }

    // Handle connection as if there is no session if
    // the store has temporarily disconnected etc
    if (!storeReady) {
      debug('store is disconnected');
      next();
      return;
    }

    // pathname mismatch
    var originalPath = _parseurl2.default.original(req).pathname || '/';
    if (originalPath.indexOf(cookieOptions.path || '/') !== 0) return next();

    // ensure a secret is available or bail
    if (!secret && !req.secret) {
      next(new Error('secret option required for sessions'));
      return;
    }

    // backwards compatibility for signed cookies
    // req.secret is passed from the cookie parser middleware
    var secrets = secret || [req.secret];

    var originalHash;
    var originalId;
    var savedHash;
    var touched = false;

    // expose store
    req.sessionStore = store;

    // get the session ID from the cookie
    var cookieId = req.sessionID = getcookie(req, name, secrets);

    // set-cookie
    (0, _onHeaders2.default)(res, function () {
      if (!req.session) {
        debug('no session');
        return;
      }

      if (!shouldSetCookie(req)) {
        return;
      }

      // only send secure cookies via https
      if (req.session.cookie.secure && !issecure(req, trustProxy)) {
        debug('not secured');
        return;
      }

      if (!touched) {
        // touch session
        req.session.touch();
        touched = true;
      }

      // set cookie
      setcookie(res, name, req.sessionID, secrets[0], req.session.cookie.data);
    });

    // proxy end() to commit the session
    var _end = res.end;
    var _write = res.write;
    var ended = false;
    res.end = function end(chunk, encoding) {
      if (ended) {
        return false;
      }

      ended = true;

      var ret;
      var sync = true;

      function writeend() {
        if (sync) {
          ret = _end.call(res, chunk, encoding);
          sync = false;
          return;
        }

        _end.call(res);
      }

      function writetop() {
        if (!sync) {
          return ret;
        }

        if (chunk == null) {
          ret = true;
          return ret;
        }

        var contentLength = Number(res.getHeader('Content-Length'));

        if (!isNaN(contentLength) && contentLength > 0) {
          // measure chunk
          chunk = !Buffer.isBuffer(chunk) ? Buffer.from(chunk, encoding) : chunk;
          encoding = undefined;

          if (chunk.length !== 0) {
            debug('split response');
            ret = _write.call(res, chunk.slice(0, chunk.length - 1));
            chunk = chunk.slice(chunk.length - 1, chunk.length);
            return ret;
          }
        }

        ret = _write.call(res, chunk, encoding);
        sync = false;

        return ret;
      }

      if (shouldDestroy(req)) {
        // destroy session
        debug('destroying');
        store.destroy(req.sessionID, function ondestroy(err) {
          if (err) {
            defer(next, err);
          }

          debug('destroyed');
          writeend();
        });

        return writetop();
      }

      // no session to save
      if (!req.session) {
        debug('no session');
        return _end.call(res, chunk, encoding);
      }

      if (!touched) {
        // touch session
        req.session.touch();
        touched = true;
      }

      if (shouldSave(req)) {
        req.session.save(function onsave(err) {
          if (err) {
            defer(next, err);
          }

          writeend();
        });

        return writetop();
      } else if (storeImplementsTouch && shouldTouch(req)) {
        // store implements touch method
        debug('touching');
        store.touch(req.sessionID, req.session, function ontouch(err) {
          if (err) {
            defer(next, err);
          }

          debug('touched');
          writeend();
        });

        return writetop();
      }

      return _end.call(res, chunk, encoding);
    };

    // generate the session
    function generate() {
      store.generate(req);
      originalId = req.sessionID;
      originalHash = hash(req.session);
      wrapmethods(req.session);
    }

    // wrap session methods
    function wrapmethods(sess) {
      var _reload = sess.reload;
      var _save = sess.save;

      function reload(callback) {
        debug('reloading %s', this.id);
        _reload.call(this, function () {
          wrapmethods(req.session);
          callback.apply(this, arguments);
        });
      }

      function save() {
        debug('saving %s', this.id);
        savedHash = hash(this);
        _save.apply(this, arguments);
      }

      Object.defineProperty(sess, 'reload', {
        configurable: true,
        enumerable: false,
        value: reload,
        writable: true
      });

      Object.defineProperty(sess, 'save', {
        configurable: true,
        enumerable: false,
        value: save,
        writable: true
      });
    }

    // check if session has been modified
    function isModified(sess) {
      return originalId !== sess.id || originalHash !== hash(sess);
    }

    // check if session has been saved
    function isSaved(sess) {
      return originalId === sess.id && savedHash === hash(sess);
    }

    // determine if session should be destroyed
    function shouldDestroy(req) {
      return req.sessionID && unsetDestroy && req.session == null;
    }

    // determine if session should be saved to store
    function shouldSave(req) {
      // cannot set cookie without a session ID
      if (typeof req.sessionID !== 'string') {
        debug('session ignored because of bogus req.sessionID %o', req.sessionID);
        return false;
      }

      return !saveUninitializedSession && cookieId !== req.sessionID ? isModified(req.session) : !isSaved(req.session);
    }

    // determine if session should be touched
    function shouldTouch(req) {
      // cannot set cookie without a session ID
      if (typeof req.sessionID !== 'string') {
        debug('session ignored because of bogus req.sessionID %o', req.sessionID);
        return false;
      }

      return cookieId === req.sessionID && !shouldSave(req);
    }

    // determine if cookie should be set on response
    function shouldSetCookie(req) {
      // cannot set cookie without a session ID
      if (typeof req.sessionID !== 'string') {
        return false;
      }

      return cookieId != req.sessionID ? saveUninitializedSession || isModified(req.session) : rollingSessions || req.session.cookie.expires != null && isModified(req.session);
    }

    // generate a session if the browser doesn't send a sessionID
    if (!req.sessionID) {
      debug('no SID sent, generating session');
      generate();
      next();
      return;
    }

    // generate the session object
    debug('fetching %s', req.sessionID);
    store.get(req.sessionID, function (err, sess) {
      // error handling
      if (err) {
        debug('error %j', err);

        if (err.code !== 'ENOENT') {
          next(err);
          return;
        }

        generate();
        // no session
      } else if (!sess) {
        debug('no session found');
        generate();
        // populate req.session
      } else {
        debug('session found');
        store.createSession(req, sess);
        originalId = req.sessionID;
        originalHash = hash(sess);

        if (!resaveSession) {
          savedHash = originalHash;
        }

        wrapmethods(req.session);
      }

      next();
    });
  };
}

/**
 * Generate a session ID for a new session.
 *
 * @return {String}
 * @private
 */

function generateSessionId(sess) {
  return uid(24);
}

/**
 * Get the session ID cookie from request.
 *
 * @return {string}
 * @private
 */

function getcookie(req, name, secrets) {
  var header = req.headers.cookie;
  var raw;
  var val;

  // read from cookie header
  if (header) {
    var cookies = _cookie2.default.parse(header);

    raw = cookies[name];

    if (raw) {
      if (raw.substr(0, 2) === 's:') {
        val = unsigncookie(raw.slice(2), secrets);

        if (val === false) {
          debug('cookie signature invalid');
          val = undefined;
        }
      } else {
        debug('cookie unsigned');
      }
    }
  }

  // back-compat read from cookieParser() signedCookies data
  if (!val && req.signedCookies) {
    val = req.signedCookies[name];

    if (val) {
      deprecate('cookie should be available in req.headers.cookie');
    }
  }

  // back-compat read from cookieParser() cookies data
  if (!val && req.cookies) {
    raw = req.cookies[name];

    if (raw) {
      if (raw.substr(0, 2) === 's:') {
        val = unsigncookie(raw.slice(2), secrets);

        if (val) {
          deprecate('cookie should be available in req.headers.cookie');
        }

        if (val === false) {
          debug('cookie signature invalid');
          val = undefined;
        }
      } else {
        debug('cookie unsigned');
      }
    }
  }

  return val;
}

/**
 * Hash the given `sess` object omitting changes to `.cookie`.
 *
 * @param {Object} sess
 * @return {String}
 * @private
 */

function hash(sess) {
  // serialize
  var str = JSON.stringify(sess, function (key, val) {
    // ignore sess.cookie property
    if (this === sess && key === 'cookie') {
      return;
    }

    return val;
  });

  // hash
  return _crypto2.default.createHash('sha1').update(str, 'utf8').digest('hex');
}

/**
 * Determine if request is secure.
 *
 * @param {Object} req
 * @param {Boolean} [trustProxy]
 * @return {Boolean}
 * @private
 */

function issecure(req, trustProxy) {
  // socket is https server
  if (req.connection && req.connection.encrypted) {
    return true;
  }

  // do not trust proxy
  if (trustProxy === false) {
    return false;
  }

  // no explicit trust; try req.secure from express
  if (trustProxy !== true) {
    return req.secure === true;
  }

  // read the proto from x-forwarded-proto header
  var header = req.headers['x-forwarded-proto'] || '';
  var index = header.indexOf(',');
  var proto = index !== -1 ? header.substr(0, index).toLowerCase().trim() : header.toLowerCase().trim();

  return proto === 'https';
}

/**
 * Set cookie on response.
 *
 * @private
 */

function setcookie(res, name, val, secret, options) {
  var signed = 's:' + _cookieSignature2.default.sign(val, secret);
  var data = _cookie2.default.serialize(name, signed, options);

  debug('set-cookie %s', data);

  var prev = res.getHeader('Set-Cookie') || [];
  var header = Array.isArray(prev) ? prev.concat(data) : [prev, data];

  res.setHeader('Set-Cookie', header);
}

/**
 * Verify and decode the given `val` with `secrets`.
 *
 * @param {String} val
 * @param {Array} secrets
 * @returns {String|Boolean}
 * @private
 */
function unsigncookie(val, secrets) {
  for (var i = 0; i < secrets.length; i++) {
    var result = _cookieSignature2.default.unsign(val, secrets[i]);

    if (result !== false) {
      return result;
    }
  }

  return false;
}
module.exports = exports.default;
