import { IoTsURI } from './../../../morphic-io-ts-interpreters/src/hkt'
import type { ModelAlgebraIntersection } from '../../src/intersections'
import type { ModelAlgebraTaggedUnions } from '../../src/tagged-unions'
import type { ModelAlgebraPrimitive } from '../../src/primitives'
import type { ModelAlgebraObject } from '../../src/object'
import type { Eq } from 'fp-ts/Eq'
import type { AnyEnv } from '@morphic-ts/common/lib/config'
import type {} from '@morphic-ts/algebras/lib/hkt'
import type { HKT, Kind, URIS } from '@morphic-ts/common/lib/HKT'

declare module '@morphic-ts/common/lib/HKT' {
  interface URItoKind<R, E, A> {
    ['Eq']: (env: R) => TypeEq<A>
  }
}

// Eq def
export class TypeEq<A> {
  _A!: A
  constructor(ord: Eq<A>) {}
}

const dummy = 42 // $ExpectType 42

const foo = <MEnv extends AnyEnv = {}>() => <R extends Kind<'HKT', Env, any, any>, Env extends MEnv>(
  f: (
    x: ModelAlgebraTaggedUnions<'HKT', Env> &
      ModelAlgebraIntersection<'HKT', Env> &
      ModelAlgebraPrimitive<'HKT', Env> &
      ModelAlgebraObject<'HKT', Env>
  ) => R
): R => f as any
const summon = <MEnv>() => <R extends Kind<'HKT', Env, any, any>, Env extends MEnv>(
  f: (
    x: ModelAlgebraTaggedUnions<'HKT', Env> &
      ModelAlgebraIntersection<'HKT', Env> &
      ModelAlgebraPrimitive<'HKT', Env> &
      ModelAlgebraObject<'HKT', Env>
  ) => R
) => f

// $ExpectType HKT<{}, Readonly<{ type: string; }>, Readonly<{ type: "a"; }>>
foo()(F => F.taggedUnion('type', { a: F.interface({ type: F.stringLiteral('a') }, { name: 'A' }) }, { name: 'X' }))

// $ExpectType HKT<{}, Readonly<{ type: string; }> & Readonly<{ kind: string; }>, Readonly<{ type: "a"; }> & Readonly<{ kind: "b"; }>>
foo()(F =>
  F.intersection(
    F.interface({ type: F.stringLiteral('a') }, { name: 'A' }),
    F.interface({ kind: F.stringLiteral('b') }, { name: 'B' })
  )({ name: 'X' })
)

// $ExpectType HKT<{}, Readonly<{ type: string; }>, Readonly<{ type: "a"; }> | Readonly<{ type: "b"; }>>
foo()(F =>
  F.taggedUnion(
    'type',
    {
      a: F.interface({ type: F.stringLiteral('a') }, { name: 'A' }),
      b: F.interface({ type: F.stringLiteral('b') }, { name: 'B' })
    },
    { name: 'X' }
  )
)

interface EqDeps {
  dep: string
}

interface Deps extends AnyEnv {
  Eq: EqDeps
}

interface EqDeps2 extends AnyEnv {
  dep2: string
}

interface Deps2 extends AnyEnv {
  Eq: EqDeps2
}

// $ExpezctType HKT<unknown, { Eq: Deps; }, string, "a">
foo<Deps>()(F => F.stringLiteral<'a'>('a', { conf: { Eq: (x, d: EqDeps) => x } }))

// $ExpectType HKT<Deps, Readonly<{ type: string; }>, Readonly<{ type: "a"; }>>
foo<Deps>()(F =>
  F.interface({ type: F.stringLiteral<'a'>('a', { name: 'A', conf: { Eq: (x, d: EqDeps) => x } }) })
)

// tslint:disable-next-line: max-line-length
// $ExpectType HKT<Deps, Readonly<{ type: string; }>, Readonly<{ type: "a"; }> | Readonly<{ type: "b"; }>>
foo<Deps>()(F =>
  F.taggedUnion(
    'type',
    {
      a: F.interface({ type: F.stringLiteral<'a'>('a', { name: 'A', conf: { Eq: (x, d: EqDeps) => x } }) }),
      b: F.interface({ type: F.stringLiteral<'b'>('b', { name: 'B', conf: { Eq: (x, d: EqDeps) => x } }) })
    },
    { name: 'X' }
  )
)

// tslint:disable-next-line: max-line-length
// $ExpectType HKT<Deps & Deps2, Readonly<{ type: string; }>, Readonly<{ type: "a"; }> | Readonly<{ type: "b"; }>>
foo<Deps & Deps2>()(F =>
  F.taggedUnion(
    'type',
    {
      a: F.interface(
        { type: F.stringLiteral<'a'>('a', { conf: { Eq: (x, _: EqDeps) => x } }) },
        { name: 'A' }
      ),
      b: F.interface(
        { type: F.stringLiteral<'b'>('b', { conf: { Eq: (x, _: EqDeps2) => x } }) },
        { name: 'B' }
      )
    },
    { name: 'X' }
  )
)
