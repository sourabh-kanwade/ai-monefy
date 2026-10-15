import { describe, it, expect } from 'vitest';
import { evaluateExpression, formatCalculationDisplay } from '../utils/calculator';

describe('Calculator Evaluator Seam Tests', () => {
  it('evaluates simple integer and decimal entries', () => {
    expect(evaluateExpression('45')).toBe(45);
    expect(evaluateExpression('12.50')).toBe(12.5);
    expect(evaluateExpression('0')).toBe(0);
    expect(evaluateExpression('')).toBe(0);
  });

  it('evaluates basic arithmetic (+, -, *, /)', () => {
    expect(evaluateExpression('15 + 4.50')).toBe(19.5);
    expect(evaluateExpression('100 - 35.25')).toBe(64.75);
    expect(evaluateExpression('12 * 3.5')).toBe(42);
    expect(evaluateExpression('100 / 4')).toBe(25);
  });

  it('respects standard operator precedence (* and / before + and -)', () => {
    expect(evaluateExpression('10 + 5 * 2')).toBe(20);
    expect(evaluateExpression('50 - 20 / 4')).toBe(45);
    expect(evaluateExpression('10 * 2 + 3 * 4')).toBe(32);
  });

  it('evaluates expression gracefully when ending with a trailing operator', () => {
    expect(evaluateExpression('15 + ')).toBe(15);
    expect(evaluateExpression('100 * ')).toBe(100);
  });

  it('handles division by zero and extreme edge cases safely without throwing', () => {
    expect(evaluateExpression('50 / 0')).toBe(0);
    expect(evaluateExpression('invalid text')).toBe(0);
  });

  it('formats display output with currency symbol', () => {
    expect(formatCalculationDisplay('15 + 4.5', '$')).toBe('$19.50');
  });
});
