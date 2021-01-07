import type { AnyEnv } from '@morphic-ts/common/lib/config'
import { memo } from '@morphic-ts/common/lib/utils'
import type { ModelAlgebraSet } from '@morphic-ts/model-algebras/lib/set'
import { getEq as SgetEq } from 'fp-ts/Set'

import { eqApplyConfig } from '../config'
import { EqType, EqURI } from '../hkt'

/**
 *  @since 0.0.1
 */
export const eqSetInterpreter = memo(
  <Env extends AnyEnv>(): ModelAlgebraSet<EqURI, Env> => ({
    _F: EqURI,
    set: (getEq, _ord, config) => env => new EqType(eqApplyConfig(config)(SgetEq(getEq(env).eq), env, {}))
  })
)
