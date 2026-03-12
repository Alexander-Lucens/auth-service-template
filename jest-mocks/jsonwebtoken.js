// Mock for jsonwebtoken module used by @nestjs/jwt

let counter = 0;
const tokenStore = new Map();

function buildPayload() {
  return { userId: 'mock-user-id', login: 'mock-user', roles: ['user'] };
}

function resolvePayload(token) {
  return tokenStore.get(token) || buildPayload();
}

const sign = jest.fn((payload, secretOrOptions, optionsOrCallback, maybeCallback) => {
  const token = `mock-jwt-token-${++counter}`;
  tokenStore.set(token, payload);

  const callback =
    typeof optionsOrCallback === 'function'
      ? optionsOrCallback
      : typeof maybeCallback === 'function'
      ? maybeCallback
      : null;

  if (callback) {
    callback(null, token);
    return;
  }

  return token;
});

const verify = jest.fn((token, secretOrOptions, optionsOrCallback, maybeCallback) => {
  const payload = resolvePayload(token);

  const callback =
    typeof optionsOrCallback === 'function'
      ? optionsOrCallback
      : typeof maybeCallback === 'function'
      ? maybeCallback
      : null;

  if (callback) {
    callback(null, payload);
    return;
  }

  return payload;
});

const decode = jest.fn((token) => resolvePayload(token));

module.exports = {
  sign,
  verify,
  decode,
};
