import type { AnyEnv } from '@morphic-ts/common/lib/config'
import { mapRecord, memo, projectFieldWithEnv } from '@morphic-ts/common/lib/utils'
import type { InterfaceLA } from '@morphic-ts/model-algebras/lib/intersections'
import type { ModelAlgebraObject } from '@morphic-ts/model-algebras/lib/object'
import type { Eq } from 'fp-ts/Eq'
import { getStructEq } from 'fp-ts/Eq'

import { eqApplyConfig } from '../config'
import { EqType, EqURI } from '../hkt'

declare module '@morphic-ts/model-algebras/lib/object' {
  /**
   *  @since 0.0.1
   */
  export interface InterfaceConfig<Props> {
    EqURI: {
      equals: InterfaceLA<Props, EqURI>
    }
  }

  /**
   *  @since 0.0.1
   */
  export interface PartialConfig<Props> {
    EqURI: {
      equals: InterfaceLA<Props, EqURI>
    }
  }

  /**
   *  @since 0.0.1
   */
  export interface BothConfig<Props, PropsPartial> {
    EqURI: {
      equals: InterfaceLA<Props, EqURI>
      equalsPartial: InterfaceLA<PropsPartial, EqURI>
    }
  }
}

const asPartialEq = <T>(x: Eq<T>): Eq<Partial<T>> => x as any

/**
 *  @since 0.0.1
 */
export const eqOrUndefined = <A>(eq: Eq<A>): Eq<A | undefined> => ({
  equals: (x, y) => (x === undefined ? y === undefined : y !== undefined && eq.equals(x, y))
})
/**
 *  @since 0.0.1
 */
export const eqObjectInterpreter = memo(
  <Env extends AnyEnv>(): ModelAlgebraObject<EqURI, Env> => ({
    _F: EqURI,
    interface: (props, config) => env => {
      const equals = projectFieldWithEnv(props as any, env)('eq')
      return new EqType(eqApplyConfig(config?.conf)(getStructEq(equals), env, { equals } as any))
    },
    // relies on Eq<A> whereas we need Eq<Partial<A>> (but works - covered by tests)
    partial: (props, config) => env => {
      const equals = mapRecord(projectFieldWithEnv(props as any, env)('eq'), eqOrUndefined)
      return new EqType(eqApplyConfig(config?.conf)(asPartialEq(getStructEq(equals)), env, { equals } as any))
    },
    both: (props, pprops, config) => env => {
      const equalsPartial = mapRecord(projectFieldWithEnv(pprops, env)('eq'), eqOrUndefined)
      const equals = projectFieldWithEnv(props, env)('eq')
      return new EqType(
        eqApplyConfig(config?.conf)(
          getStructEq({
            ...equalsPartial,
            ...equals
          } as any),
          env,
          { equalsPartial, equals } as any
        )
      )
    }
  })
)
