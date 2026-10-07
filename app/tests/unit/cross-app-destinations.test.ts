import { describe, expect, it } from 'vitest'

import { destinations } from '@/lib/cross-app/destinations'

describe('where knowledge takes people', () => {
  it('goes nowhere: the user side has no pages since ledger 56', () => {
    expect(Object.keys(destinations)).toEqual([])
  })
})
