/**
 * AI Monefy - Safe Arithmetic Calculator Evaluator
 * Evaluates inline arithmetic expressions (+, -, *, /) with standard operator precedence.
 */

export function evaluateExpression(expr: string): number {
  if (!expr || typeof expr !== 'string') return 0;

  // Clean expression: remove any unexpected characters except digits, decimals, and operators
  let cleaned = expr.trim();
  if (!cleaned) return 0;

  // Split into tokens (numbers and operators)
  // Match consecutive digits with optional decimal point OR single operator (+, -, *, /)
  const regex = /(\d+\.?\d*|\+|\-|\*|\/)/g;
  const rawTokens = cleaned.match(regex);
  if (!rawTokens || rawTokens.length === 0) return 0;

  // Filter out any empty tokens
  const tokens = rawTokens.filter(Boolean);

  // If the last token is an operator, ignore it for live evaluation (e.g. "15 + " -> 15)
  if (['+', '-', '*', '/'].includes(tokens[tokens.length - 1])) {
    tokens.pop();
  }

  if (tokens.length === 0) return 0;

  // First pass: Handle Multiplication and Division (high precedence)
  const pass1Tokens: (number | string)[] = [];
  let i = 0;

  while (i < tokens.length) {
    const token = tokens[i];
    if (token === '*' || token === '/') {
      const prev = pass1Tokens.pop();
      const nextToken = tokens[i + 1];

      if (typeof prev !== 'number' || !nextToken || isNaN(Number(nextToken))) {
        // Malformed, abort safely
        return 0;
      }

      const next = parseFloat(nextToken);
      if (token === '/') {
        if (next === 0) {
          // Division by zero
          return 0;
        }
        pass1Tokens.push(prev / next);
      } else {
        pass1Tokens.push(prev * next);
      }
      i += 2; // consumed operator and next token
    } else {
      const num = parseFloat(token);
      if (!isNaN(num) && !['+', '-'].includes(token)) {
        pass1Tokens.push(num);
      } else {
        pass1Tokens.push(token);
      }
      i++;
    }
  }

  if (pass1Tokens.length === 0) return 0;

  // Second pass: Handle Addition and Subtraction (left-to-right)
  let result = typeof pass1Tokens[0] === 'number' ? pass1Tokens[0] : 0;
  let op = '+';

  for (let j = (typeof pass1Tokens[0] === 'number' ? 1 : 0); j < pass1Tokens.length; j++) {
    const token = pass1Tokens[j];
    if (token === '+' || token === '-') {
      op = token;
    } else if (typeof token === 'number') {
      if (op === '+') {
        result += token;
      } else if (op === '-') {
        result -= token;
      }
    }
  }

  if (isNaN(result) || !isFinite(result)) {
    return 0;
  }

  return Math.round(result * 100) / 100;
}

export function formatCalculationDisplay(expr: string, currency = '$'): string {
  const result = evaluateExpression(expr);
  return `${currency}${result.toFixed(2)}`;
}
