import assert from 'node:assert/strict';
import { validateLink, MAX_FILE_SIZE } from '../src/resources/store.js';

assert.equal(validateLink('https://example.com/folder?q=plan'), 'https://example.com/folder?q=plan');
assert.equal(validateLink('http://localhost:5000'), 'http://localhost:5000/');
for (const value of ['javascript:alert(1)', 'data:text/html,test', 'file:///etc/passwd', 'ftp://example.com', 'https://user:secret@example.com', 'invalid']) {
  assert.throws(() => validateLink(value), Error, value);
}
assert.equal(MAX_FILE_SIZE, 25 * 1024 * 1024);
console.log('Recursos: enlaces HTTP/HTTPS válidos; esquemas activos y credenciales rechazados; límite de archivos verificado.');
