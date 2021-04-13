import type { ProgramType } from '@morphic-ts/summoners'
import * as fc from 'fast-check'
import { left, right } from 'fp-ts/lib/Either'
import { ord, ordString } from 'fp-ts/Ord'
import * as t from 'io-ts'
import { either } from 'io-ts-types/lib/either'
import { option } from 'io-ts-types/lib/option'
import { UUID } from 'io-ts-types/lib/UUID'

import type { M, ProgramUnionURI } from './summoner.spec'
import { summonFor } from './summoner.spec'

const { summon } = summonFor<{}>({})

const testProgram = <A>(prog: ProgramType<{}, unknown, A>[ProgramUnionURI]) => {
  const { arb, type } = summon(prog)
  fc.assert(fc.property(arb, type.is))
}

describe('FastCheck interpreter', () => {
  it('string', () => {
    testProgram(summon(F => F.string()))
  })

  it('string can be customized for FastCheck', () => {
    const res = summon(F => F.string({ conf: { FastCheckURI: A => A } }))
    testProgram(res)
  })

  it('string can be customized via a specific generator', () => {
    testProgram(
      summon(F =>
        F.string({
          conf: {
            FastCheckURI: _ => fc.constantFrom('scala', 'haskell', 'purescript', 'typescript', 'haxe')
          }
        })
      )
    )
  })

  it('stringLiteral', () => {
    testProgram(summon(F => F.stringLiteral('x')))
  })

  it('keysOf', () => {
    testProgram(summon(F => F.keysOf({ a: null, b: null })))
  })

  it('array', () => {
    testProgram(summon(F => F.array(F.string())))
  })

  it('array is bounded by config', () => {
    fc.check(
      fc.property(
        summon(F =>
          F.array(
            F.string({
              conf: { FastCheckURI: A => A }
            })
          )
        ).arb,
        arr => arr.length >= 2 && arr.length <= 4
      )
    )
  })

  it('interface', () => {
    testProgram(
      summon(F =>
        F.interface(
          {
            a: F.string(),
            b: F.number()
          },
          { name: 'AB' }
        )
      )
    )
  })

  it('partial', () => {
    testProgram(
      summon(F =>
        F.partial(
          {
            a: F.string(),
            b: F.number()
          },
          { name: 'AB' }
        )
      )
    )
  })

  it('both', () => {
    testProgram(
      summon(F =>
        F.both(
          {
            a: F.string()
          },
          {
            b: F.number()
          },
          { name: 'AB' }
        )
      )
    )
  })

  it('compose', () => {
    // type Foo
    const Foo = summon(F =>
      F.interface(
        {
          a: F.string(),
          b: F.number()
        },
        { name: 'Foo' }
      )
    )

    // type Bar
    const Bar = summon<unknown, BarType>(F =>
      F.interface(
        {
          a: Foo(F),
          b: F.number()
        },
        { name: 'Bar' }
      )
    )
    interface BarType {
      a: {
        a: string
        b: number
      }
      b: number
    }

    testProgram(Bar)
  })

  it('date', () => {
    // type Foo
    const Foo = summon<unknown, Foo>(F =>
      F.interface(
        {
          date: F.date(),
          a: F.string()
        },
        { name: 'Foo' }
      )
    )

    interface Foo {
      date: Date
      a: string
    }

    testProgram(Foo)
  })

  it('intersection', () => {
    // type Foo
    const Foo = summon(F =>
      F.interface(
        {
          a: F.string(),
          b: F.number()
        },
        { name: 'Foo' }
      )
    )

    const Bar = summon(F =>
      F.interface(
        {
          c: F.string(),
          d: F.number()
        },
        { name: 'Bar' }
      )
    )

    const FooBar = summon(F => F.intersection(Foo(F), Bar(F))({ name: 'FooBar' }))

    testProgram(FooBar)
  })

  it('union', () => {
    // type Foo
    interface Foo {
      a: string
      b: number
    }
    const Foo = summon(F =>
      F.interface(
        {
          a: F.string(),
          b: F.number()
        },
        { name: 'Foo' }
      )
    )

    interface Bar {
      c: string
      d: number
    }
    const Bar = summon(F =>
      F.interface(
        {
          c: F.string(),
          d: F.number()
        },
        { name: 'Bar' }
      )
    )
    const Bara = summon(F =>
      F.interface(
        {
          ca: F.string(),
          d: F.number()
        },
        { name: 'Bara' }
      )
    )
    const Barb = summon(F =>
      F.interface(
        {
          cb: F.string(),
          d: F.number()
        },
        { name: 'Barb' }
      )
    )

    const FooBar = summon(F =>
      F.union(
        Foo(F),
        Bar(F),
        Bara(F),
        Barb(F)
      )([
        _ => ('a' in _ ? right(_) : left(_)),
        _ => ('c' in _ ? right(_) : left(_)),
        _ => ('ca' in _ ? right(_) : left(_)),
        _ => ('cb' in _ ? right(_) : left(_))
      ])
    )

    testProgram(FooBar)
  })

  it('taggedUnion', () => {
    // type Foo
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

    testProgram(FooBar)
  })

  it('set from array', () => {
    const InterfA = summon(F =>
      F.interface(
        {
          a: F.string()
        },
        { name: 'InterfA' }
      )
    )

    type AType = ReturnType<typeof InterfA.build>

    const ordA = ord.contramap(ordString, (x: AType) => x.a)

    const SetInterfA = summon(F => F.set(InterfA(F), ordA))

    testProgram(SetInterfA)
  })

  it('recursive', () => {
    type List = Cons | Leaf
    interface Cons {
      type: 'cons'
      a: List
    }
    interface Leaf {
      type: 'leaf'
      v: string
    }

    const List: M<{}, unknown, List> = summon<unknown, List>(F =>
      F.recursive<unknown, List>(
        Self =>
          F.taggedUnion(
            'type',
            {
              cons: F.interface({ type: F.stringLiteral('cons'), a: Self }, { name: 'Cons' }),
              leaf: F.interface({ type: F.stringLiteral('leaf'), v: F.string() }, { name: 'Leaf' })
            },
            { name: 'List' }
          ),
        { name: 'ListRec' }
      )
    )

    testProgram(List)
  })

  it('uuid', () => {
    const { arb } = summon(F => F.uuid())
    fc.assert(fc.property(arb, UUID.is))
  })

  it('either', () => {
    const { arb } = summon(F => F.either(F.string(), F.number()))
    const codec = either(t.string, t.number)
    fc.assert(fc.property(arb, codec.is))
  })

  it('option', () => {
    const { arb } = summon(F => F.option(F.string()))
    const codec = option(t.string)
    fc.assert(fc.property(arb, codec.is))
  })

  it('refined', () => {
    const hasEvenLength = (s: string): s is string => s.length % 2 === 0
    const { arb } = summon(F => F.refined(F.string(), hasEvenLength, { name: 'odd string' }))
    const codec = t.string
    fc.assert(fc.property(arb, s => codec.is(s) && hasEvenLength(s)))
  })

  it('strMap', () => {
    const { arb } = summon(F => F.strMap(F.string()))
    const codec = t.record(t.string, t.string)
    fc.assert(fc.property(arb, s => codec.is(s)))
  })

  it('record', () => {
    const { arb } = summon(F => F.record(F.string(), F.number()))
    const codec = t.record(t.string, t.number)
    fc.assert(fc.property(arb, s => codec.is(s)))
  })
})
