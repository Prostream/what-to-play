import { ObjectId } from 'mongodb';

export function fail(status, code, message) {
  return Object.assign(new Error(message), { status, code });
}

export function objectId(value) {
  if (typeof value !== 'string' || !/^[a-f\d]{24}$/i.test(value)) {
    throw fail(400, 'VALIDATION_ERROR', 'Invalid record ID.');
  }
  return new ObjectId(value);
}

export function text(value, name, max = 100) {
  if (value === undefined) return '';
  if (typeof value !== 'string' || value.length > max) {
    throw fail(
      400,
      'VALIDATION_ERROR',
      `${name} must be text up to ${max} characters.`,
    );
  }
  return value.trim();
}

export function tags(value) {
  const values =
    value === undefined ? [] : Array.isArray(value) ? value : [value];
  if (values.length > 30)
    throw fail(400, 'VALIDATION_ERROR', 'Choose up to 30 tags.');
  return [
    ...new Set(
      values.map((tag) => text(tag, 'Tag', 60).toLowerCase()).filter(Boolean),
    ),
  ];
}

export function pageQuery(query) {
  const page = query.page === undefined ? 1 : Number(query.page);
  const limit = query.limit === undefined ? 20 : Number(query.limit);
  if (
    !Number.isSafeInteger(page) ||
    page < 1 ||
    !Number.isSafeInteger((page - 1) * limit) ||
    !Number.isInteger(limit) ||
    limit < 1 ||
    limit > 50 ||
    Array.isArray(query.page) ||
    Array.isArray(query.limit)
  ) {
    throw fail(
      400,
      'VALIDATION_ERROR',
      'Page must be positive; limit must be between 1 and 50.',
    );
  }
  return { page, limit, skip: (page - 1) * limit };
}

export function listResult(data, total, { page, limit }) {
  return {
    data,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

export function jsonWrites(req, _res, next) {
  if (['POST', 'PATCH', 'DELETE'].includes(req.method)) {
    if (!req.is('application/json')) {
      throw fail(415, 'VALIDATION_ERROR', 'Send requests as application/json.');
    }
    if (!req.body || Array.isArray(req.body)) {
      throw fail(400, 'VALIDATION_ERROR', 'Provide a JSON object.');
    }
    const origin = req.get('origin');
    if (origin && origin !== `${req.protocol}://${req.get('host')}`) {
      throw fail(403, 'FORBIDDEN', 'Use this website to make changes.');
    }
  }
  next();
}

export function errorHandler(error, _req, res, _next) {
  const status = error.status || 500;
  let code = error.code || 'VALIDATION_ERROR';
  let message = error.message;
  if (status >= 500) {
    code = 'INTERNAL_ERROR';
    message = 'Something went wrong. Please try again.';
  } else if (error.type === 'entity.parse.failed') {
    message = 'Invalid JSON body.';
  }
  res.status(status).json({ error: { code, message } });
}
