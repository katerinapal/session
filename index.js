"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.session = undefined;

var _cookie = require("cookie");

var _cookie2 = _interopRequireDefault(_cookie);

var _crc = require("crc");

var _crc2 = _interopRequireDefault(_crc);

var _debug = require("debug");

var _debug2 = _interopRequireDefault(_debug);

var _depd = require("depd");

var _depd2 = _interopRequireDefault(_depd);

var _parseurl = require("parseurl");

var _parseurl2 = _interopRequireDefault(_parseurl);

var _uidSafe = require("uid-safe");

var _uidSafe2 = _interopRequireDefault(_uidSafe);

var _onHeaders = require("on-headers");

var _onHeaders2 = _interopRequireDefault(_onHeaders);

var _cookieSignature = require("cookie-signature");

var _cookieSignature2 = _interopRequireDefault(_cookieSignature);

var _session = require("./session/session");

var _memory = require("./session/memory");

var _cookie3 = require("./session/cookie");

var _store = require("./session/store");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/*!
 * express-session
 * Copyright(c) 2010 Sencha Inc.
 * Copyright(c) 2011 TJ Holowaychuk
 * Copyright(c) 2014-2015 Douglas Christopher Wilson
 * MIT Licensed
 */

'use strict';

var crc = _crc2.default.crc32;
var deprecate = (0, _depd2.default)('express-session');
var uid = _uidSafe2.default.sync;

// environment

var env = process.env.NODE_ENV;

/**
 * Expose constructors.
 */

exported_session.Store = _store.Store;
exported_session.Cookie = _cookie3.Cookie;
exported_session.Session = _session.Session;
exported_session.MemoryStore = _memory.MemoryStore;

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

function session(options) {
  var opts = options || {};

  // get the cookie options
  var cookieOptions = opts.cookie || {};

  // get the session id generate function
  var generateId = opts.genid || generateSessionId;

  // get the session cookie name
  var name = opts.name || opts.key || 'connect.sid';

  // get the session store
  var store = opts.store || new _memory.MemoryStore();

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
  if ('production' == env && store instanceof _memory.MemoryStore) {
    console.warn(warning);
  }

  // generates the new session
  store.generate = function (req) {
    req.sessionID = generateId(req);
    req.session = new _session.Session(req);
    req.session.cookie = new _cookie3.Cookie(cookieOptions);

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
      (0, _debug2.default)('store is disconnected');
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
        (0, _debug2.default)('no session');
        return;
      }

      if (!shouldSetCookie(req)) {
        return;
      }

      // only send secure cookies via https
      if (req.session.cookie.secure && !issecure(req, trustProxy)) {
        (0, _debug2.default)('not secured');
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
          chunk = !Buffer.isBuffer(chunk) ? new Buffer(chunk, encoding) : chunk;
          encoding = undefined;

          if (chunk.length !== 0) {
            (0, _debug2.default)('split response');
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
        (0, _debug2.default)('destroying');
        store.destroy(req.sessionID, function ondestroy(err) {
          if (err) {
            defer(next, err);
          }

          (0, _debug2.default)('destroyed');
          writeend();
        });

        return writetop();
      }

      // no session to save
      if (!req.session) {
        (0, _debug2.default)('no session');
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
        (0, _debug2.default)('touching');
        store.touch(req.sessionID, req.session, function ontouch(err) {
          if (err) {
            defer(next, err);
          }

          (0, _debug2.default)('touched');
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
        (0, _debug2.default)('reloading %s', this.id);
        _reload.call(this, function () {
          wrapmethods(req.session);
          callback.apply(this, arguments);
        });
      }

      function save() {
        (0, _debug2.default)('saving %s', this.id);
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
        (0, _debug2.default)('session ignored because of bogus req.sessionID %o', req.sessionID);
        return false;
      }

      return !saveUninitializedSession && cookieId !== req.sessionID ? isModified(req.session) : !isSaved(req.session);
    }

    // determine if session should be touched
    function shouldTouch(req) {
      // cannot set cookie without a session ID
      if (typeof req.sessionID !== 'string') {
        (0, _debug2.default)('session ignored because of bogus req.sessionID %o', req.sessionID);
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
      (0, _debug2.default)('no SID sent, generating session');
      generate();
      next();
      return;
    }

    // generate the session object
    (0, _debug2.default)('fetching %s', req.sessionID);
    store.get(req.sessionID, function (err, sess) {
      // error handling
      if (err) {
        (0, _debug2.default)('error %j', err);

        if (err.code !== 'ENOENT') {
          next(err);
          return;
        }

        generate();
        // no session
      } else if (!sess) {
        (0, _debug2.default)('no session found');
        generate();
        // populate req.session
      } else {
        (0, _debug2.default)('session found');
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
          (0, _debug2.default)('cookie signature invalid');
          val = undefined;
        }
      } else {
        (0, _debug2.default)('cookie unsigned');
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
          (0, _debug2.default)('cookie signature invalid');
          val = undefined;
        }
      } else {
        (0, _debug2.default)('cookie unsigned');
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
  return crc(JSON.stringify(sess, function (key, val) {
    // ignore sess.cookie property
    if (this === sess && key === 'cookie') {
      return;
    }

    return val;
  }));
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
    var secure = req.secure;
    return typeof secure === 'boolean' ? secure : false;
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

  (0, _debug2.default)('set-cookie %s', data);

  var prev = res.getHeader('set-cookie') || [];
  var header = Array.isArray(prev) ? prev.concat(data) : [prev, data];

  res.setHeader('set-cookie', header);
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
var exported_session = session;

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

exports.session = exported_session;
