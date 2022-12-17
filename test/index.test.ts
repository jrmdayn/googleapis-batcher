import { test, assert } from 'vitest'
import { foo } from '../src/index.js'

test('simple', () => {
  assert.equal(foo, 'foo')
})
