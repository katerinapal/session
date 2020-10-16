"use strict";

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var _assert = require("assert");

var _assert2 = _interopRequireDefault(_assert);

var _cookie = require("../session/cookie");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

describe('new Cookie()', function () {
  it('should create a new cookie object', function () {
    _assert2.default.strictEqual(_typeof(new _cookie.Cookie()), 'object');
  });

  it('should default expires to null', function () {
    var cookie = new _cookie.Cookie();
    _assert2.default.strictEqual(cookie.expires, null);
  });

  it('should default maxAge to null', function () {
    var cookie = new _cookie.Cookie();
    _assert2.default.strictEqual(cookie.maxAge, null);
  });

  it('should default httpOnly to true', function () {
    var cookie = new _cookie.Cookie();
    _assert2.default.strictEqual(cookie.httpOnly, true);
  });

  it('should default path to "/"', function () {
    var cookie = new _cookie.Cookie();
    _assert2.default.strictEqual(cookie.path, '/');
  });

  it('should default maxAge to null', function () {
    var cookie = new _cookie.Cookie();
    _assert2.default.strictEqual(cookie.maxAge, null);
  });

  describe('with options', function () {
    it('should create a new cookie object', function () {
      _assert2.default.strictEqual(_typeof(new _cookie.Cookie({})), 'object');
    });

    it('should reject non-objects', function () {
      _assert2.default.throws(function () {
        new _cookie.Cookie(42);
      }, /argument options/);
      _assert2.default.throws(function () {
        new _cookie.Cookie('foo');
      }, /argument options/);
      _assert2.default.throws(function () {
        new _cookie.Cookie(true);
      }, /argument options/);
      _assert2.default.throws(function () {
        new _cookie.Cookie(function () {});
      }, /argument options/);
    });

    describe('expires', function () {
      it('should set expires', function () {
        var expires = new Date(Date.now() + 60000);
        var cookie = new _cookie.Cookie({ expires: expires });

        _assert2.default.strictEqual(cookie.expires, expires);
      });

      it('should set maxAge', function () {
        var expires = new Date(Date.now() + 60000);
        var cookie = new _cookie.Cookie({ expires: expires });

        _assert2.default.ok(expires.getTime() - Date.now() - 1000 <= cookie.maxAge);
        _assert2.default.ok(expires.getTime() - Date.now() + 1000 >= cookie.maxAge);
      });
    });

    describe('httpOnly', function () {
      it('should set httpOnly', function () {
        var cookie = new _cookie.Cookie({ httpOnly: false });

        _assert2.default.strictEqual(cookie.httpOnly, false);
      });
    });

    describe('maxAge', function () {
      it('should set expires', function () {
        var maxAge = 60000;
        var cookie = new _cookie.Cookie({ maxAge: maxAge });

        _assert2.default.ok(cookie.expires.getTime() - Date.now() - 1000 <= maxAge);
        _assert2.default.ok(cookie.expires.getTime() - Date.now() + 1000 >= maxAge);
      });

      it('should set maxAge', function () {
        var maxAge = 60000;
        var cookie = new _cookie.Cookie({ maxAge: maxAge });

        _assert2.default.strictEqual(cookie.maxAge, maxAge);
      });

      it('should accept Date object', function () {
        var maxAge = new Date(Date.now() + 60000);
        var cookie = new _cookie.Cookie({ maxAge: maxAge });

        _assert2.default.strictEqual(cookie.expires.getTime(), maxAge.getTime());
        _assert2.default.ok(maxAge.getTime() - Date.now() - 1000 <= cookie.maxAge);
        _assert2.default.ok(maxAge.getTime() - Date.now() + 1000 >= cookie.maxAge);
      });

      it('should reject invalid types', function () {
        _assert2.default.throws(function () {
          new _cookie.Cookie({ maxAge: '42' });
        }, /maxAge/);
        _assert2.default.throws(function () {
          new _cookie.Cookie({ maxAge: true });
        }, /maxAge/);
        _assert2.default.throws(function () {
          new _cookie.Cookie({ maxAge: function maxAge() {} });
        }, /maxAge/);
      });
    });

    describe('path', function () {
      it('should set path', function () {
        var cookie = new _cookie.Cookie({ path: '/foo' });

        _assert2.default.strictEqual(cookie.path, '/foo');
      });
    });
  });
});