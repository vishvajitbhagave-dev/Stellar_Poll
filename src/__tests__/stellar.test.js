// ─── stellar.test.js ─────────────────────────────────────────────────────────
// Tests for all utility functions in stellar.js
// These tests run WITHOUT needing a real blockchain connection.
// ─────────────────────────────────────────────────────────────────────────────

import { describe, it, expect, beforeEach } from 'vitest'
import {
  isValidStellarAddress,
  formatBalance,
  shortAddress,
  calcPercentages,
  POLL_QUESTION,
  POLL_OPTIONS,
  CONTRACT_ID,
  cache,
} from '../stellar.js'

// ─── Test 1: isValidStellarAddress ────────────────────────────────────────────
describe('isValidStellarAddress', () => {
  it('returns true for a valid Stellar public key', () => {
    // Valid 56-char G address — using a known valid key
    const validAddress = 'GBVZS4GWZPBQRQNKOVXUTZFHZRMYYQNKQNHGD6WSOVBZADJXCPMRMVJL'
    expect(isValidStellarAddress(validAddress)).toBe(true)
  })

  it('returns false for an empty string', () => {
    expect(isValidStellarAddress('')).toBe(false)
  })

  it('returns false for null', () => {
    expect(isValidStellarAddress(null)).toBe(false)
  })

  it('returns false for an address that does not start with G', () => {
    expect(isValidStellarAddress('XAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN')).toBe(false)
  })

  it('returns false for an address that is too short', () => {
    expect(isValidStellarAddress('GAAZI4TCR3TY5')).toBe(false)
  })

  it('returns false for a random string', () => {
    expect(isValidStellarAddress('hello world')).toBe(false)
  })
})

// ─── Test 2: formatBalance ────────────────────────────────────────────────────
describe('formatBalance', () => {
  it('formats a number string to 4 decimal places', () => {
    expect(formatBalance('100')).toBe('100.0000')
  })

  it('formats a decimal correctly', () => {
    expect(formatBalance('9999.12345678')).toBe('9999.1235')
  })

  it('returns 0.0000 for invalid input', () => {
    expect(formatBalance('abc')).toBe('0.0000')
  })

  it('returns 0.0000 for undefined', () => {
    expect(formatBalance(undefined)).toBe('0.0000')
  })

  it('handles zero correctly', () => {
    expect(formatBalance('0')).toBe('0.0000')
  })

  it('handles a large balance', () => {
    expect(formatBalance('99999999.9999')).toBe('99999999.9999')
  })
})

// ─── Test 3: shortAddress ─────────────────────────────────────────────────────
describe('shortAddress', () => {
  it('shortens a full Stellar address correctly', () => {
    const address = 'GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN'
    const result  = shortAddress(address)
    // Function takes first 6 and last 5 chars with … in between
    expect(result).toBe('GAAZI4…OCCWN')
  })

  it('returns the original value for short strings', () => {
    expect(shortAddress('GABC')).toBe('GABC')
  })

  it('returns the address unchanged if it is null', () => {
    expect(shortAddress(null)).toBe(null)
  })

  it('starts with the first 6 characters of the address', () => {
    const address = 'GBTEST123456789012345678901234567890123456789012345678'
    const result  = shortAddress(address)
    expect(result.startsWith('GBTEST')).toBe(true)
  })
})

// ─── Test 4: calcPercentages ──────────────────────────────────────────────────
describe('calcPercentages', () => {
  it('calculates correct percentages', () => {
    const votes  = [50, 25, 15, 10]
    const total  = 100
    const result = calcPercentages(votes, total)
    expect(result).toEqual([50, 25, 15, 10])
  })

  it('returns all zeros when total is 0', () => {
    const result = calcPercentages([0, 0, 0, 0], 0)
    expect(result).toEqual([0, 0, 0, 0])
  })

  it('returns all zeros when total is null', () => {
    const result = calcPercentages([10, 20, 30, 40], null)
    expect(result).toEqual([0, 0, 0, 0])
  })

  it('rounds percentages correctly', () => {
    const votes  = [1, 0, 0, 0]
    const total  = 3
    const result = calcPercentages(votes, total)
    expect(result[0]).toBe(33)
  })

  it('handles equal votes correctly', () => {
    const votes  = [25, 25, 25, 25]
    const total  = 100
    const result = calcPercentages(votes, total)
    expect(result).toEqual([25, 25, 25, 25])
  })
})

// ─── Test 5: Cache ────────────────────────────────────────────────────────────
describe('Cache', () => {
  beforeEach(() => {
    cache.invalidate()
    cache.hasVoted = {}
  })

  it('is invalid when empty', () => {
    expect(cache.isValid()).toBe(false)
  })

  it('becomes valid after setting results', () => {
    cache.setResults({ votes: [1, 2, 3, 4], total: 10 })
    expect(cache.isValid()).toBe(true)
  })

  it('returns correct cached results', () => {
    const data = { votes: [5, 10, 15, 20], total: 50 }
    cache.setResults(data)
    expect(cache.results).toEqual(data)
  })

  it('becomes invalid after invalidate() is called', () => {
    cache.setResults({ votes: [1, 2, 3, 4], total: 10 })
    cache.invalidate()
    expect(cache.isValid()).toBe(false)
  })

  it('tracks hasVoted per address', () => {
    const addr = 'GBVZS4GWZPBQRQNKOVXUTZFHZRMYYQNKQNHGD6WSOVBZADJXCPMRMVJL'
    expect(cache.getHasVoted(addr)).toBe(null)
    cache.setHasVoted(addr, true)
    expect(cache.getHasVoted(addr)).toBe(true)
  })
})

// ─── Test 6: Poll Configuration ───────────────────────────────────────────────
describe('Poll Configuration', () => {
  it('has a non-empty poll question', () => {
    expect(POLL_QUESTION.length).toBeGreaterThan(0)
  })

  it('has exactly 4 poll options', () => {
    expect(POLL_OPTIONS.length).toBe(4)
  })

  it('all poll options are non-empty strings', () => {
    POLL_OPTIONS.forEach(opt => {
      expect(typeof opt).toBe('string')
      expect(opt.length).toBeGreaterThan(0)
    })
  })

  it('CONTRACT_ID starts with C and is 56 characters', () => {
    expect(CONTRACT_ID.startsWith('C')).toBe(true)
    expect(CONTRACT_ID.length).toBe(56)
  })
})