const DATABASE_NAME = 'orbita-project-resources';
const DATABASE_VERSION = 1;
export const MAX_FILE_SIZE = 25 * 1024 * 1024;

let databasePromise;

function database() {
  if (!databasePromise) {
    databasePromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        db.createObjectStore('entries', { keyPath: 'id' });
        db.createObjectStore('files');
      };
      request.onsuccess = () => {
        const db = request.result;
        db.onversionchange = () => { db.close(); databasePromise = null; };
        resolve(db);
      };
      request.onerror = () => { databasePromise = null; reject(request.error); };
      request.onblocked = () => { databasePromise = null; reject(new Error('Cierra otras pestañas del dashboard y vuelve a intentarlo.')); };
    });
  }
  return databasePromise;
}

async function read(store, key) {
  const db = await database();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(store, 'readonly');
    const request = key === undefined ? transaction.objectStore(store).getAll() : transaction.objectStore(store).get(key);
    transaction.oncomplete = () => resolve(request.result);
    transaction.onabort = () => reject(transaction.error || request.error);
    transaction.onerror = () => reject(transaction.error || request.error);
  });
}

export const listEntries = () => read('entries');
export const getFile = id => read('files', id);

export async function saveEntry(entry, file) {
  if (file && file.size > MAX_FILE_SIZE) throw new Error('El archivo supera el límite de 25 MB.');
  const db = await database();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['entries', 'files'], 'readwrite');
    transaction.objectStore('entries').put(entry);
    if (file) transaction.objectStore('files').put(file, entry.id);
    transaction.oncomplete = () => resolve(entry);
    transaction.onabort = () => reject(transaction.error || new Error('No se pudo guardar.'));
    transaction.onerror = () => reject(transaction.error || new Error('No se pudo guardar.'));
  });
}

export function validateLink(value) {
  let url;
  try { url = new URL(value); } catch { throw new Error('Escribe un enlace completo, por ejemplo https://drive.google.com/…'); }
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) {
    throw new Error('Usa un enlace HTTP o HTTPS sin credenciales.');
  }
  return url.href;
}
