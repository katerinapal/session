"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Store = undefined;

var _cookie = require("./cookie");

var _events = require("events");

var _events2 = _interopRequireDefault(_events);

var _session = require("./session");

var _util = require("util");

var _util2 = _interopRequireDefault(_util);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/*!
 * Connect - session - Store
 * Copyright(c) 2010 Sencha Inc.
 * Copyright(c) 2011 TJ Holowaychuk
 * MIT Licensed
 */

'use strict';

var EventEmitter = _events2.default.EventEmitter;

function Store() {
  EventEmitter.call(this);
}

/**
 * Inherit from EventEmitter.
 */

_util2.default.inherits(Store, EventEmitter);

/**
 * Re-generate the given requests's session.
 *
 * @param {IncomingRequest} req
 * @return {Function} fn
 * @api public
 */

Store.prototype.regenerate = function (req, fn) {
  var self = this;
  this.destroy(req.sessionID, function (err) {
    self.generate(req);
    fn(err);
  });
};

/**
 * Load a `Session` instance via the given `sid`
 * and invoke the callback `fn(err, sess)`.
 *
 * @param {String} sid
 * @param {Function} fn
 * @api public
 */

Store.prototype.load = function (sid, fn) {
  var self = this;
  this.get(sid, function (err, sess) {
    if (err) return fn(err);
    if (!sess) return fn();
    var req = { sessionID: sid, sessionStore: self };
    fn(null, self.createSession(req, sess));
  });
};

/**
 * Create session from JSON `sess` data.
 *
 * @param {IncomingRequest} req
 * @param {Object} sess
 * @return {Session}
 * @api private
 */

Store.prototype.createSession = function (req, sess) {
  var expires = sess.cookie.expires,
      orig = sess.cookie.originalMaxAge;
  sess.cookie = new _cookie.Cookie(sess.cookie);
  if ('string' == typeof expires) sess.cookie.expires = new Date(expires);
  sess.cookie.originalMaxAge = orig;
  req.session = new _session.Session(req, sess);
  return req.session;
};
var store_Store = Store;

/**
 * Abstract base class for session stores.
 * @public
 */

exports.Store = store_Store;