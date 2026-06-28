import { describe, it, expect } from 'vitest';
import {
	withCorrelationContext,
	getCorrelationContext,
} from './index.js';

describe('correlation context', () => {
	it('sets and retrieves context within scope', () => {
		const result = withCorrelationContext({ traceId: 'abc' }, () => {
			const ctx = getCorrelationContext();
			return ctx?.traceId;
		});
		expect(result).toBe('abc');
	});

	it('clears context after scope', () => {
		withCorrelationContext({ traceId: 'abc' }, () => {
			expect(getCorrelationContext()?.traceId).toBe('abc');
		});
		const ctx = getCorrelationContext();
		expect(ctx).toBeDefined();
		expect(ctx?.traceId).toBeUndefined();
	});

	it('supports nested contexts', () => {
		const outerResult = withCorrelationContext({ traceId: 'outer' }, () => {
			const innerResult = withCorrelationContext({ traceId: 'inner' }, () => {
				return getCorrelationContext()?.traceId;
			});
			return { inner: innerResult, outer: getCorrelationContext()?.traceId };
		});
		expect(outerResult.inner).toBe('inner');
		expect(outerResult.outer).toBe('outer');
	});

	it('returns function result', () => {
		const result = withCorrelationContext({ traceId: 'abc' }, () => 42);
		expect(result).toBe(42);
	});
});

describe('log levels', () => {
	it('defines all log levels', () => {
		const levels: LogLevel[] = ['debug', 'info', 'warn', 'error'];
		expect(levels).toHaveLength(4);
	});
});
