import { logger } from '../logger/index.js';

export type DbOperationResultCategory =
  | 'SUCCESS'
  | 'EMPTY_RESULT'
  | 'NOT_FOUND'
  | 'ERROR';

export interface DbInstrumentContext {
  collection: string;
  operation: 'find' | 'findById' | 'create' | 'update' | 'delete' | 'count' | 'aggregate';
  entityId?: string;
  requestId?: string;
}

export async function instrumentDbOperation<T>(
  ctx: DbInstrumentContext,
  fn: () => Promise<T>
): Promise<T> {
  const start = Date.now();
  try {
    const result = await fn();
    const durationMs = Date.now() - start;

    let category: DbOperationResultCategory = 'SUCCESS';
    if (result === null || result === undefined) {
      category = 'NOT_FOUND';
    } else if (Array.isArray(result) && result.length === 0) {
      category = 'EMPTY_RESULT';
    }

    logger.info({
      type: 'DB_OPERATION',
      collection: ctx.collection,
      operation: ctx.operation,
      entityId: ctx.entityId,
      requestId: ctx.requestId,
      resultCategory: category,
      durationMs,
    }, `DB ${ctx.collection}.${ctx.operation} completed [${category}]`);

    return result;
  } catch (err: any) {
    const durationMs = Date.now() - start;
    logger.error({
      type: 'DB_OPERATION',
      collection: ctx.collection,
      operation: ctx.operation,
      entityId: ctx.entityId,
      requestId: ctx.requestId,
      resultCategory: 'ERROR',
      durationMs,
      errorCode: err.code || 'DB_ERROR',
      errorMessage: err.message,
    }, `DB ${ctx.collection}.${ctx.operation} failed [ERROR]`);

    throw err;
  }
}
