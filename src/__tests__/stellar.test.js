import { describe, it, expect, beforeEach } from 'vitest'
import {
  isValidStellarAddress,
  formatBalance,
  shortAddress,
  calcPercentages,
  formatTokenAmount,
  cache,
  POLL_QUESTION,
  POLL_OPTIONS,
  CONTRACT_ID,
  TOKEN_CONTRACT,
} from '../stellar.js'

describe('isValidStellarAddress', () => {
  it('returns true for a valid Stellar public key', () => {
    expect(isValidStellarAddress('GBVZS4GWZPBQRQNKOVXUTZFHZRMYYQNKQNHGD6WSOVBZADJXCPMRMVJL')).toBe(true)
  })
  it('returns false for empty string', () => {
    expect(isValidStellarAddress('')).toBe(false)
  })
  it('returns false for null', () => {
    expect(isValidStellarAddress(null)).toBe(false)
  })
  it('returns false for address not starting with G', () => {
    expect(isValidStellarAddress('XBVZS4GWZPBQRQNKOVXUTZFHZRMYYQNKQNHGD6WSOVBZADJXCPMRMVJL')).toBe(false)
  })
  it('returns false for short address', () => {
    expect(isValidStellarAddress('GABC123')).toBe(false)
  })
  it('returns false for random string', () => {
    expect(isValidStellarAddress('not-an-address')).toBe(false)
  })
})

describe('formatBalance', () => {
  it('formats integer to 4 decimal places', () => {
    expect(formatBalance('100')).toBe('100.0000')
  })
  it('rounds to 4 decimal places', () => {
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
  it('handles large balance', () => {
    expect(formatBalance('99999.9999')).toBe('99999.9999')
  })
})

describe('shortAddress', () => {
  it('shortens address correctly', () => {
    const addr = 'GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN'
    expect(shortAddress(addr)).toBe('GAAZI4…OCCWN')
  })
  it('returns original for short strings', () => {
    expect(shortAddress('GABC')).toBe('GABC')
  })
  it('handles null', () => {
    expect(shortAddress(null)).toBe(null)
  })
  it('starts with first 6 chars', () => {
    const addr = 'GBTEST123456789012345678901234567890123456789012345678'
    expect(shortAddress(addr).startsWith('GBTEST')).toBe(true)
  })
})

describe('calcPercentages', () => {
  it('calculates correct percentages', () => {
    expect(calcPercentages([50, 25, 15, 10], 100)).toEqual([50, 25, 15, 10])
  })
  it('returns zeros when total is 0', () => {
    expect(calcPercentages([0, 0, 0, 0], 0)).toEqual([0, 0, 0, 0])
  })
  it('returns zeros when total is null', () => {
    expect(calcPercentages([10, 20, 30, 40], null)).toEqual([0, 0, 0, 0])
  })
  it('rounds percentages', () => {
    expect(calcPercentages([1, 0, 0, 0], 3)[0]).toBe(33)
  })
  it('handles equal votes', () => {
    expect(calcPercentages([25, 25, 25, 25], 100)).toEqual([25, 25, 25, 25])
  })
})

describe('formatTokenAmount', () => {
  it('converts strobes to tokens correctly', () => {
    expect(formatTokenAmount(10_000_000)).toBe('1.00')
  })
  it('handles zero', () => {
    expect(formatTokenAmount(0)).toBe('0.00')
  })
  it('handles large amounts', () => {
    expect(formatTokenAmount(100_000_000)).toBe('10.00')
  })
  it('handles partial tokens', () => {
    expect(formatTokenAmount(5_000_000)).toBe('0.50')
  })
})

describe('Cache', () => {
  beforeEach(() => {
    cache.invalidate()
    cache.hasVoted = {}
  })
  it('is invalid when empty', () => {
    expect(cache.isValid()).toBe(false)
  })
  it('becomes valid after setting results', () => {
    cache.setResults({ votes: [1,2,3,4], total: 10 })
    expect(cache.isValid()).toBe(true)
  })
  it('returns correct cached results', () => {
    const data = { votes: [5,10,15,20], total: 50 }
    cache.setResults(data)
    expect(cache.results).toEqual(data)
  })
  it('becomes invalid after invalidate', () => {
    cache.setResults({ votes: [1,2,3,4], total: 10 })
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

describe('Poll Configuration', () => {
  it('has a non-empty question', () => {
    expect(POLL_QUESTION.length).toBeGreaterThan(0)
  })
  it('has exactly 4 options', () => {
    expect(POLL_OPTIONS.length).toBe(4)
  })
  it('all options are non-empty strings', () => {
    POLL_OPTIONS.forEach(opt => {
      expect(typeof opt).toBe('string')
      expect(opt.length).toBeGreaterThan(0)
    })
  })
  it('CONTRACT_ID is 56 chars starting with C', () => {
    expect(CONTRACT_ID.startsWith('C')).toBe(true)
    expect(CONTRACT_ID.length).toBe(56)
  })
  it('TOKEN_CONTRACT is valid address', () => {
    expect(TOKEN_CONTRACT.length).toBeGreaterThan(10)
  })
})