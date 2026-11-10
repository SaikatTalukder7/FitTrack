// Gives the backend access to the current Express request/response (cookies, host).
import { AsyncLocalStorage } from 'node:async_hooks';

export const store = new AsyncLocalStorage();
const current = () => store.getStore();

export function getRequest() {
  const { req } = current();
  return { url: `${req.protocol}://${req.get('host')}${req.originalUrl}`, headers: { get: (n) => req.get(n) ?? null } };
}
export const getCookie = (name) => current().req.cookies?.[name];
export const setCookie = (name, value, opts = {}) => {
  const { maxAge, ...rest } = opts;
  current().res.cookie(name, value, { ...rest, ...(maxAge ? { maxAge: maxAge * 1000 } : {}) });
};
export const deleteCookie = (name, opts = {}) => current().res.clearCookie(name, opts);
