
import ext_assert_assert from "assert";
import { Cookie as sessioncookie_Cookiejs } from "../session/cookie";

describe('new Cookie()', function () {
  it('should create a new cookie object', function () {
    ext_assert_assert.strictEqual(typeof new sessioncookie_Cookiejs(), 'object')
  })

  it('should default expires to null', function () {
    var cookie = new sessioncookie_Cookiejs()
    ext_assert_assert.strictEqual(cookie.expires, null)
  })

  it('should default maxAge to null', function () {
    var cookie = new sessioncookie_Cookiejs()
    ext_assert_assert.strictEqual(cookie.maxAge, null)
  })

  it('should default httpOnly to true', function () {
    var cookie = new sessioncookie_Cookiejs()
    ext_assert_assert.strictEqual(cookie.httpOnly, true)
  })

  it('should default path to "/"', function () {
    var cookie = new sessioncookie_Cookiejs()
    ext_assert_assert.strictEqual(cookie.path, '/')
  })

  it('should default maxAge to null', function () {
    var cookie = new sessioncookie_Cookiejs()
    ext_assert_assert.strictEqual(cookie.maxAge, null)
  })

  describe('with options', function () {
    it('should create a new cookie object', function () {
      ext_assert_assert.strictEqual(typeof new sessioncookie_Cookiejs({}), 'object')
    })

    it('should reject non-objects', function () {
      ext_assert_assert.throws(function () { new sessioncookie_Cookiejs(42) }, /argument options/)
      ext_assert_assert.throws(function () { new sessioncookie_Cookiejs('foo') }, /argument options/)
      ext_assert_assert.throws(function () { new sessioncookie_Cookiejs(true) }, /argument options/)
      ext_assert_assert.throws(function () { new sessioncookie_Cookiejs(function () {}) }, /argument options/)
    })

    describe('expires', function () {
      it('should set expires', function () {
        var expires = new Date(Date.now() + 60000)
        var cookie = new sessioncookie_Cookiejs({ expires: expires })

        ext_assert_assert.strictEqual(cookie.expires, expires)
      })

      it('should set maxAge', function () {
        var expires = new Date(Date.now() + 60000)
        var cookie = new sessioncookie_Cookiejs({ expires: expires })

        ext_assert_assert.ok(expires.getTime() - Date.now() - 1000 <= cookie.maxAge)
        ext_assert_assert.ok(expires.getTime() - Date.now() + 1000 >= cookie.maxAge)
      })
    })

    describe('httpOnly', function () {
      it('should set httpOnly', function () {
        var cookie = new sessioncookie_Cookiejs({ httpOnly: false })

        ext_assert_assert.strictEqual(cookie.httpOnly, false)
      })
    })

    describe('maxAge', function () {
      it('should set expires', function () {
        var maxAge = 60000
        var cookie = new sessioncookie_Cookiejs({ maxAge: maxAge })

        ext_assert_assert.ok(cookie.expires.getTime() - Date.now() - 1000 <= maxAge)
        ext_assert_assert.ok(cookie.expires.getTime() - Date.now() + 1000 >= maxAge)
      })

      it('should set maxAge', function () {
        var maxAge = 60000
        var cookie = new sessioncookie_Cookiejs({ maxAge: maxAge })

        ext_assert_assert.strictEqual(cookie.maxAge, maxAge)
      })

      it('should accept Date object', function () {
        var maxAge = new Date(Date.now() + 60000)
        var cookie = new sessioncookie_Cookiejs({ maxAge: maxAge })

        ext_assert_assert.strictEqual(cookie.expires.getTime(), maxAge.getTime())
        ext_assert_assert.ok(maxAge.getTime() - Date.now() - 1000 <= cookie.maxAge)
        ext_assert_assert.ok(maxAge.getTime() - Date.now() + 1000 >= cookie.maxAge)
      })

      it('should reject invalid types', function() {
        ext_assert_assert.throws(function() { new sessioncookie_Cookiejs({ maxAge: '42' }) }, /maxAge/)
        ext_assert_assert.throws(function() { new sessioncookie_Cookiejs({ maxAge: true }) }, /maxAge/)
        ext_assert_assert.throws(function() { new sessioncookie_Cookiejs({ maxAge: function () {} }) }, /maxAge/)
      })
    })

    describe('path', function () {
      it('should set path', function () {
        var cookie = new sessioncookie_Cookiejs({ path: '/foo' })

        ext_assert_assert.strictEqual(cookie.path, '/foo')
      })
    })
  })
})
