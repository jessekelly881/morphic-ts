import * as chai from 'chai'
import type { Either } from 'fp-ts/Either'
import { left, right } from 'fp-ts/Either'
import { fromEquals, getStructEq } from 'fp-ts/Eq'
import type { Option } from 'fp-ts/Option'
import { none, some } from 'fp-ts/Option'
import type { Newtype } from 'newtype-ts'
import { iso } from 'newtype-ts'

import { summonFor } from './summoner.spec'

const { summon } = summonFor<{}>({})

describe('Eq', () => {
  it('bigInt', () => {
    const { eq } = summon(F => F.bigint())
    chai.assert.strictEqual(eq.equals(BigInt(10), BigInt(10)), true)
    chai.assert.strictEqual(eq.equals(BigInt(10), BigInt(11)), false)
  })

  it('newtype', () => {
    interface Test extends Newtype<{ readonly Test: unique symbol }, string> {}
    const isoTest = iso<Test>()

    const { eq } = summon(F => F.newtype<Test>()(F.string(), { name: 'Test' }))

    const testA = isoTest.wrap('a')
    const testB = isoTest.wrap('b')
    chai.assert.strictEqual(eq.equals(testA, testA), true)
    chai.assert.strictEqual(eq.equals(testA, testB), false)
  })

  it('unknown', () => {
    const { eq } = summon(F => F.unknown())
    chai.assert.strictEqual(eq.equals('a', 'a'), true)
    chai.assert.strictEqual(eq.equals('a', 'b'), false)
    const arr1 = ['a', 'b']
    const arr2 = ['a', 'b']
    chai.assert.strictEqual(eq.equals(arr1, arr1), true)
    chai.assert.strictEqual(eq.equals(arr1, arr2), true)
  })

  it('recursive compare of circular unknown', () => {
    const { eq } = summon(F => F.unknown({ conf: { EqURI: eq => eq } }))

    const recDataA = {
      a: 'a',
      b: null as any
    }
    recDataA.b = recDataA

    const recDataB = {
      a: 'b',
      b: null as any
    }
    recDataB.b = recDataB

    chai.assert.strictEqual(eq.equals(recDataA, recDataA), true)
    chai.assert.strictEqual(eq.equals(recDataA, recDataB), false)
  })

  it('recursive compare of non-circular unknown', () => {
    let calls = 0
    const compare = fromEquals((_a, _b) => {
      calls += 1
      return true
    })
    const morph = summon(F => F.unknown({ conf: { EqURI: _eq => compare } }))

    const recDataA = {
      a: 'a',
      b: null as any
    }
    recDataA.b = recDataA

    const recDataB = {
      a: 'b',
      b: null as any
    }
    recDataB.b = recDataB

    chai.assert.strictEqual(morph.eq.equals(recDataA, recDataA), true)
    chai.assert.strictEqual(morph.eq.equals(recDataA, recDataB), true)
    chai.assert.strictEqual(morph.eq.equals(recDataB, recDataA), true)
    chai.assert.strictEqual(calls, 2) // 2 because eq.fromEquals does a reference comparison automatically
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

    const { eq } = Foo

    const date = new Date(12345)
    chai.assert.strictEqual(eq.equals({ date, a: '' }, { date } as any), false)
  })

  it('eq', () => {
    const Foo = summon(F =>
      F.interface(
        {
          date: F.date(),
          a: F.string()
        },
        {
          name: 'Foo'
        }
      )
    )

    const { eq } = Foo

    const date = new Date(12345)
    const date2 = new Date(12346)
    chai.assert.strictEqual(eq.equals({ date, a: '' }, { date, a: '' }), true)
    chai.assert.strictEqual(eq.equals({ date, a: '' }, { date: date2, a: '' }), false)
  })

  it('eq', () => {
    const Foo = summon(F =>
      F.interface(
        {
          dates: F.array(
            F.interface(
              {
                date: F.date()
              },
              { name: 'HasDate' }
            )
          ),
          a: F.string()
        },
        { name: 'Foo' }
      )
    )

    const { eq } = Foo

    const date = new Date(12345)
    const date2 = new Date(12346)
    chai.assert.strictEqual(
      eq.equals({ dates: [{ date }, { date }], a: '' }, { dates: [{ date }, { date }], a: '' }),
      true
    )

    chai.assert.strictEqual(
      eq.equals({ dates: [{ date: date2 }, { date }], a: '' }, { dates: [{ date }, { date: date2 }], a: '' }),
      false
    )
  })

  it('partial', () => {
    interface Foo {
      type: 'foo'
      a: Option<string>
      b: number
    }
    const Foo = summon(F =>
      F.partial(
        {
          type: F.stringLiteral('foo'),
          a: F.nullable(F.string()),
          b: F.number()
        },
        { name: 'Foo' }
      )
    )

    const { eq } = Foo
    chai.assert.deepStrictEqual(eq.equals({}, {}), true)
    chai.assert.deepStrictEqual(eq.equals({ type: 'foo' }, { type: 'foo' }), true)
    chai.assert.deepStrictEqual(eq.equals({ type: 'foo', a: some('foo') }, { type: 'foo', a: some('foo') }), true)
    chai.assert.deepStrictEqual(eq.equals({ type: 'foo', a: none }, { type: 'foo', a: none }), true)
    chai.assert.deepStrictEqual(eq.equals({ type: 'foo', a: none }, { type: 'foo', a: some('foo') }), false)
    chai.assert.deepStrictEqual(eq.equals({ type: 'foo' }, { type: 'foo', a: some('foo') }), false)
    chai.assert.deepStrictEqual(eq.equals({ type: 'foo', a: some('foo') }, { type: 'foo' }), false)
    chai.assert.deepStrictEqual(eq.equals({ type: 'foo' }, { a: some('foo') }), false)
    chai.assert.deepStrictEqual(eq.equals({}, { type: 'foo' }), false)
    chai.assert.deepStrictEqual(eq.equals({ type: 'foo' }, {}), false)
  })

  it('both', () => {
    interface Foo {
      type: 'foo'
      a?: Option<string>
      b?: number
    }
    const Foo = summon<unknown, Foo>(F =>
      F.both(
        {
          type: F.stringLiteral('foo')
        },
        {
          a: F.nullable(F.string()),
          b: F.number()
        },
        { name: 'Foo' }
      )
    )

    const { eq } = Foo
    chai.assert.deepStrictEqual(eq.equals({ type: 'foo' }, { type: 'foo' }), true)
    chai.assert.deepStrictEqual(eq.equals({ type: 'foo' }, ({ type: 'bar' } as any) as Foo), false)
    chai.assert.deepStrictEqual(eq.equals({ type: 'foo', a: some('foo') }, { type: 'foo', a: some('foo') }), true)
    chai.assert.deepStrictEqual(eq.equals({ type: 'foo', a: none }, { type: 'foo', a: none }), true)
    chai.assert.deepStrictEqual(eq.equals({ type: 'foo', a: none }, { type: 'foo', a: some('foo') }), false)
    chai.assert.deepStrictEqual(eq.equals({ type: 'foo' }, { type: 'foo', a: some('foo') }), false)
    chai.assert.deepStrictEqual(eq.equals({ type: 'foo', a: some('foo') }, { type: 'foo' }), false)
  })

  it('taggedUnion', () => {
    interface Foo {
      type: 'foo'
      a: string
      b: number
    }
    const Foo = summon<unknown, Foo>(F =>
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
    const Bar = summon(F =>
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

    const eq = FooBar.eq

    const fooA: Foo | Bar = { type: 'foo', a: 'a', b: 12 }
    const fooB: Foo | Bar = { type: 'foo', a: 'b', b: 12 }
    const fooC: Foo | Bar = { type: 'foo', a: 'a', b: 12 }

    const barA: Foo | Bar = { type: 'bar', c: 'a', d: 12 }
    const barB: Foo | Bar = { type: 'bar', c: 'b', d: 12 }

    chai.assert.deepStrictEqual(eq.equals(fooA, fooA), true)
    chai.assert.deepStrictEqual(eq.equals(fooA, fooC), true)
    chai.assert.deepStrictEqual(eq.equals(fooA, fooB), false)
    chai.assert.deepStrictEqual(eq.equals(fooA, barA), false)
    chai.assert.deepStrictEqual(eq.equals(barA, barB), false)
    chai.assert.deepStrictEqual(eq.equals(barB, barB), true)
  })

  it('either', () => {
    const { eq } = summon(F => F.either(F.string(), F.number()))
    const la: Either<string, number> = left('a')
    const labis: Either<string, number> = left('a')
    const r1: Either<string, number> = right(1)
    const lb: Either<string, number> = left('b')
    const r2: Either<string, number> = right(2)
    const r2bis: Either<string, number> = right(2)

    chai.assert.deepStrictEqual(eq.equals(la, la), true)
    chai.assert.deepStrictEqual(eq.equals(la, labis), true)
    chai.assert.deepStrictEqual(eq.equals(r1, r1), true)
    chai.assert.deepStrictEqual(eq.equals(r2, r2bis), true)

    chai.assert.deepStrictEqual(eq.equals(la, lb), false)
    chai.assert.deepStrictEqual(eq.equals(la, r1), false)
    chai.assert.deepStrictEqual(eq.equals(r2, r1), false)
  })

  it('option', () => {
    const { eq } = summon(F => F.option(F.string()))
    const a1 = some('a')
    const a2 = some('a')
    const b = some('b')
    const n = none

    chai.assert.deepStrictEqual(eq.equals(a1, a1), true)
    chai.assert.deepStrictEqual(eq.equals(a1, a2), true)
    chai.assert.deepStrictEqual(eq.equals(n, n), true)

    chai.assert.deepStrictEqual(eq.equals(a1, b), false)
    chai.assert.deepStrictEqual(eq.equals(a1, n), false)
  })

  it('strMap', () => {
    const { eq } = summon(F => F.strMap(F.string()))
    const a1 = { a: 'a' }
    const a2 = { a: 'a' }
    const b = { b: 'b' }
    const n = {}

    chai.assert.deepStrictEqual(eq.equals(a1, a1), true)
    chai.assert.deepStrictEqual(eq.equals(a1, a2), true)
    chai.assert.deepStrictEqual(eq.equals(n, n), true)

    chai.assert.deepStrictEqual(eq.equals(a1, b), false)
  })

  it('record', () => {
    const { eq } = summon(F => F.record(F.string(), F.number()))
    const a1 = { a: 1 }
    const a2 = { a: 1 }
    const b = { b: 2 }
    const n = {}

    chai.assert.deepStrictEqual(eq.equals(a1, a1), true)
    chai.assert.deepStrictEqual(eq.equals(a1, a2), true)
    chai.assert.deepStrictEqual(eq.equals(n, n), true)

    chai.assert.deepStrictEqual(eq.equals(a1, b), false)
  })

  it('union', () => {
    const A = summon(F => F.interface({ a: F.string(), b: F.number() }, { name: 'A' }))
    const B = summon(F => F.interface({ c: F.string(), d: F.number() }, { name: 'B' }))

    const AorB = summon(F =>
      F.union(A(F), B(F))([_ => ('a' in _ ? right(_) : left(_)), _ => ('c' in _ ? right(_) : left(_))])
    )
    const A1 = { a: 'a', b: 1 }
    const A2 = { a: 'a', b: 2 }
    const B1 = { c: 'a', d: 1 }

    chai.assert.deepStrictEqual(AorB.eq.equals(A1, B1), false)
    chai.assert.deepStrictEqual(AorB.eq.equals(A1, B1), false)

    chai.assert.deepStrictEqual(AorB.eq.equals(A1, A2), false)
    chai.assert.deepStrictEqual(AorB.eq.equals(A1, A1), true)
  })

  it('intersection is correctly configurable', () => {
    const Foo = summon(F =>
      F.intersection(
        F.interface(
          {
            a: F.string()
          },
          { name: 'Foo' }
        ),
        F.interface(
          {
            b: F.date()
          },
          { name: 'Bar' }
        )
      )({
        name: 'Name',
        conf: {
          EqURI: (_c, _e, { equals: [eqA, eqB] }) => ({
            equals: (a, b) => eqA.equals({ a: a.a }, { a: b.a }) && eqB.equals({ b: a.b }, { b: b.b })
          })
        }
      })
    )

    const dateA = new Date(12345)
    const dateB = new Date(54321)
    chai.assert.isFalse(Foo.eq.equals({ a: '', b: dateA }, { a: 'x', b: dateA }))
    chai.assert.isFalse(Foo.eq.equals({ a: '', b: dateA }, { a: '', b: dateB }))
    chai.assert.isFalse(Foo.eq.equals({ a: 'x', b: dateA }, { a: '', b: dateB }))
    chai.assert.isTrue(Foo.eq.equals({ a: 'x', b: dateA }, { a: 'x', b: dateA }))
  })
  it('configure is correctly mapped in interface', () => {
    const Foo = summon(F =>
      F.interface(
        {
          a: F.string({
            conf: {
              EqURI: _ => ({
                equals: (a, b) => true
              })
            }
          })
        },
        { name: 'Foo' }
      )
    )
    chai.assert.isTrue(Foo.eq.equals({ a: 'a' }, { a: 'b' }))
  })
  it('configure is correctly mapped through configured interface', () => {
    const Foo = summon(F =>
      F.interface(
        {
          a: F.string({
            conf: {
              EqURI: _ => ({
                equals: (a, b) => true
              })
            }
          })
        },
        {
          name: 'Foo',
          conf: {
            EqURI: (c, e, { equals }) => getStructEq({ a: equals.a })
          }
        }
      )
    )
    chai.assert.isTrue(Foo.eq.equals({ a: 'a' }, { a: 'b' }))
  })
})
