"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Cookie = undefined;

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var _cookie = require("cookie");

var _cookie2 = _interopRequireDefault(_cookie);

var _depd = require("depd");

var _depd2 = _interopRequireDefault(_depd);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/*!
 * Connect - session - Cookie
 * Copyright(c) 2010 Sencha Inc.
 * Copyright(c) 2011 TJ Holowaychuk
 * MIT Licensed
 */

'use strict';

var deprecate = (0, _depd2.default)('express-session');

var cookie_Cookie;

/**
 * Initialize a new `Cookie` with the given `options`.
 *
 * @param {IncomingMessage} req
 * @param {Object} options
 * @api private
 */

var Cookie = function Cookie(options) {
  this.path = '/';
  this.maxAge = null;
  this.httpOnly = true;

  if (options) {
    if ((typeof options === "undefined" ? "undefined" : _typeof(options)) !== 'object') {
      throw new TypeError('argument options must be a object');
    }

    for (var key in options) {
      this[key] = options[key];
    }
  }

  this.originalMaxAge = undefined == this.originalMaxAge ? this.maxAge : this.originalMaxAge;
};

/*!
 * Prototype.
 */

Cookie.prototype = {

  /**
   * Set expires `date`.
   *
   * @param {Date} date
   * @api public
   */

  set expires(date) {
    this._expires = date;
    this.originalMaxAge = this.maxAge;
  },

  /**
   * Get expires `date`.
   *
   * @return {Date}
   * @api public
   */

  get expires() {
    return this._expires;
  },

  /**
   * Set expires via max-age in `ms`.
   *
   * @param {Number} ms
   * @api public
   */

  set maxAge(ms) {
    if (ms && typeof ms !== 'number' && !(ms instanceof Date)) {
      throw new TypeError('maxAge must be a number or Date');
    }

    if (ms instanceof Date) {
      deprecate('maxAge as Date; pass number of milliseconds instead');
    }

    this.expires = 'number' == typeof ms ? new Date(Date.now() + ms) : ms;
  },

  /**
   * Get expires max-age in `ms`.
   *
   * @return {Number}
   * @api public
   */

  get maxAge() {
    return this.expires instanceof Date ? this.expires.valueOf() - Date.now() : this.expires;
  },

  /**
   * Return cookie data object.
   *
   * @return {Object}
   * @api private
   */

  get data() {
    return {
      originalMaxAge: this.originalMaxAge,
      expires: this._expires,
      secure: this.secure,
      httpOnly: this.httpOnly,
      domain: this.domain,
      path: this.path,
      sameSite: this.sameSite
    };
  },

  /**
   * Return a serialized cookie string.
   *
   * @return {String}
   * @api public
   */

  serialize: function serialize(name, val) {
    return _cookie2.default.serialize(name, val, this.data);
  },

  /**
   * Return JSON representation of this cookie.
   *
   * @return {Object}
   * @api private
   */

  toJSON: function toJSON() {
    return this.data;
  }
};
exports.Cookie = cookie_Cookie = Cookie;
exports.Cookie = cookie_Cookie;