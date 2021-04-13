import * as chai from 'chai'
import type { Either } from 'fp-ts/Either'
import { left, right } from 'fp-ts/Either'
import { none, some } from 'fp-ts/Option'
import type { Newtype } from 'newtype-ts'
import { iso } from 'newtype-ts'

import { summonFor } from './summoner.spec'

const { summon } = summonFor<{}>({})

describe('Show', () => {
  it('newtype', () => {
    interface Test extends Newtype<{ readonly Test: unique symbol }, string> {}
    const isoTest = iso<Test>()

    const { show } = summon(F => F.newtype<Test>()(F.string(), { name: 'Test' }))

    const testA = isoTest.wrap('abc')
    chai.assert.strictEqual(show.show(testA), '<Test>("abc")')
  })

  it('returns false when comparing incomplete values', () => {
    const Foo = summon(F =>
      F.interface(
        {
          date: F.date(),
          a: F.string()
        },
        { name: 'Foo' }
      )
    )

    const { show } = Foo

    const date = new Date(12345)
    chai.assert.strictEqual(show.show({ date, a: '' }), '{ date: 1970-01-01T00:00:12.345Z, a: "" }')
  })

  it('show', () => {
    const Foo = summon(F =>
      F.interface(
        {
          date: F.date(),
          a: F.string()
        },
        { name: 'Foo' }
      )
    )

    const { show } = Foo

    const date = new Date(12345)
    chai.assert.strictEqual(show.show({ date, a: '' }), '{ date: 1970-01-01T00:00:12.345Z, a: "" }')
  })

  it('can be customized to hide passwords', () => {
    const Password = summon(F => F.string({ conf: { ShowURI: _ => ({ show: _ => '***' }) } }))
    const UserPassword = summon(F => F.interface({ user: F.string(), password: Password(F) }, { name: 'UserPassword' }))

    const userPassword = UserPassword.build({ user: 'john', password: '42' })
    chai.assert.strictEqual(UserPassword.show.show(userPassword), '{ user: "john", password: *** }')
  })

  it('show', () => {
    const Foo = summon(F =>
      F.interface(
        {
          dates: F.array(
            F.interface(
              {
                date: F.date()
              },
              { name: 'Dates' }
            )
          ),
          a: F.string()
        },
        { name: 'Foo@' }
      )
    )

    const { show } = Foo

    const date = new Date(12345)
    const date2 = new Date(12346)
    chai.assert.strictEqual(
      show.show({ dates: [{ date }, { date }], a: '' }),
      '{ dates: [{ date: 1970-01-01T00:00:12.345Z }, { date: 1970-01-01T00:00:12.345Z }], a: "" }'
    )

    chai.assert.strictEqual(
      show.show({ dates: [{ date: date2 }, { date }], a: '' }),
      '{ dates: [{ date: 1970-01-01T00:00:12.346Z }, { date: 1970-01-01T00:00:12.345Z }], a: "" }'
    )
  })

  it('partial', () => {
    interface Foo {
      type: 'foo'
      a: string
      b: number
    }
    const Foo = summon(F =>
      F.partial(
        {
          type: F.stringLiteral('foo'),
          a: F.string(),
          b: F.number()
        },
        { name: 'Foo' }
      )
    )

    const { show } = Foo
    chai.assert.deepStrictEqual(show.show({}), '{ type: undefined, a: undefined, b: undefined }')
    chai.assert.deepStrictEqual(show.show({ type: 'foo' }), `{ type: "foo", a: undefined, b: undefined }`)
    chai.assert.deepStrictEqual(show.show({ type: 'foo', a: 'foo' }), `{ type: "foo", a: "foo", b: undefined }`)
    chai.assert.deepStrictEqual(show.show({ a: 'foo' }), `{ type: undefined, a: "foo", b: undefined }`)
  })

  it('both', () => {
    interface Foo {
      type: 'foo'
      a: string
      b: number
    }
    const Foo = summon(F =>
      F.both(
        {
          type: F.stringLiteral('foo')
        },
        {
          a: F.string(),
          b: F.number()
        },
        { name: 'Foo' }
      )
    )

    const { show } = Foo
    chai.assert.deepStrictEqual(show.show({ type: 'foo' }), `{ type: "foo", a: undefined, b: undefined }`)
    chai.assert.deepStrictEqual(show.show({ type: 'foo', a: 'foo' }), `{ type: "foo", a: "foo", b: undefined }`)
    chai.assert.deepStrictEqual(show.show({ type: 'foo', b: 12 }), `{ type: "foo", a: undefined, b: 12 }`)
  })

  it('taggedUnion', () => {
    interface Foo {
      type: 'foo'
      a: string
      b: number
    }
    interface FooRaw {
      type: string
      a: string
      b: number
    }
    const Foo = summon<FooRaw, Foo>(F =>
      F.interface(
        {
          type: F.stringLiteral('foo'),
          a: F.string(),
          b: F.number()
        },
        { name: 'Foo' }
      )
    )

    interface Bar {
      type: 'bar'
      c: string
      d: number
    }
    const Bar = summon<unknown, Bar>(F =>
      F.interface(
        {
          type: F.stringLiteral('bar'),
          c: F.string(),
          d: F.number()
        },
        { name: 'Bar' }
      )
    )

    const FooBar = summon(F =>
      F.taggedUnion(
        'type',
        {
          foo: Foo(F),
          bar: Bar(F)
        },
        { name: 'FooBar' }
      )
    )

    const { show } = FooBar

    const fooA: Foo | Bar = { type: 'foo', a: 'a', b: 12 }
    const fooB: Foo | Bar = { type: 'foo', a: 'b', b: 12 }
    const fooC: Foo | Bar = { type: 'foo', a: 'c', b: 12 }

    const barA: Foo | Bar = { type: 'bar', c: 'a', d: 12 }
    const barB: Foo | Bar = { type: 'bar', c: 'b', d: 12 }

    chai.assert.deepStrictEqual(show.show(fooA), '{ type: "foo", a: "a", b: 12 }')
    chai.assert.deepStrictEqual(show.show(fooB), '{ type: "foo", a: "b", b: 12 }')
    chai.assert.deepStrictEqual(show.show(fooC), '{ type: "foo", a: "c", b: 12 }')
    chai.assert.deepStrictEqual(show.show(barA), '{ type: "bar", c: "a", d: 12 }')
    chai.assert.deepStrictEqual(show.show(barB), '{ type: "bar", c: "b", d: 12 }')
  })

  it('either', () => {
    const { show } = summon(F => F.either(F.string(), F.number()))
    const la: Either<string, number> = left('a')
    const r1: Either<string, number> = right(1)

    chai.assert.deepStrictEqual(show.show(la), 'left("a")')
    chai.assert.deepStrictEqual(show.show(r1), 'right(1)')
  })
  it('option', () => {
    const { show } = summon(F => F.option(F.string()))
    const a1 = some('a')
    const n = none

    chai.assert.deepStrictEqual(show.show(a1), 'some("a")')
    chai.assert.deepStrictEqual(show.show(n), 'none')
  })
  it('strMap', () => {
    const { show } = summon(F => F.strMap(F.string()))
    const a1 = { a: 'a' }
    const n = {}

    chai.assert.deepStrictEqual(show.show(a1), '{ "a": "a" }')
    chai.assert.deepStrictEqual(show.show(n), '{}')
  })
  it('record', () => {
    const { show } = summon(F => F.record(F.string(), F.number()))
    const a1 = { a: 1 }
    const n = {}

    chai.assert.deepStrictEqual(show.show(a1), '{ "a": 1 }')
    chai.assert.deepStrictEqual(show.show(n), '{}')
  })
})
