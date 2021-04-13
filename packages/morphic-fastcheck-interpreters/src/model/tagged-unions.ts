import type { AnyEnv } from '@morphic-ts/common/lib/config'
import { collect, memo } from '@morphic-ts/common/lib/utils'
import type { ModelAlgebraTaggedUnions } from '@morphic-ts/model-algebras/lib/tagged-unions'
import { oneof } from 'fast-check'

import { fastCheckApplyConfig } from '../config'
import { FastCheckType, FastCheckURI } from '../hkt'

/**
 * Beware: randomly generated recursive structure with high branching may not end early enough
 */
/**
 *  @since 0.0.1
 */
export const fastCheckTaggedUnionInterpreter = memo(
  <Env extends AnyEnv>(): ModelAlgebraTaggedUnions<FastCheckURI, Env> => ({
    _F: FastCheckURI,
    taggedUnion: (_tag, dic, config) => env =>
      new FastCheckType(
        fastCheckApplyConfig(config?.conf)(oneof(...collect(dic, (_, getArb) => getArb(env).arb)), env, {})
      )
  })
)
