var store_Store = Store;
import { Cookie as cookie_Cookiejs } from "./cookie";
import ext_events_EventEmitter from "events";
import { Session as session_Sessionjs } from "./session";
import ext_util_util from "util";
/*!
 * Connect - session - Store
 * Copyright(c) 2010 Sencha Inc.
 * Copyright(c) 2011 TJ Holowaychuk
 * MIT Licensed
 */

'use strict';

var EventEmitter = ext_events_EventEmitter.EventEmitter

function Store() {
  EventEmitter.call(this)
}

/**
 * Inherit from EventEmitter.
 */

ext_util_util.inherits(Store, EventEmitter)

/**
 * Re-generate the given requests's session.
 *
 * @param {IncomingRequest} req
 * @return {Function} fn
 * @api public
 */

Store.prototype.regenerate = function(req, fn){
  var self = this;
  this.destroy(req.sessionID, function(err){
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

Store.prototype.load = function(sid, fn){
  var self = this;
  this.get(sid, function(err, sess){
    if (err) return fn(err);
    if (!sess) return fn();
    var req = { sessionID: sid, sessionStore: self };
    fn(null, self.createSession(req, sess))
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

Store.prototype.createSession = function(req, sess){
  var expires = sess.cookie.expires
  var orig = sess.cookie.originalMaxAge

  sess.cookie = new cookie_Cookiejs(sess.cookie);
  if ('string' == typeof expires) sess.cookie.expires = new Date(expires);
  sess.cookie.originalMaxAge = orig;
  req.session = new session_Sessionjs(req, sess);
  return req.session;
};

/**
 * Abstract base class for session stores.
 * @public
 */

export { store_Store as Store };
