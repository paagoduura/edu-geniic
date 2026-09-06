// IndexedDB offline storage for EduGenie
const DB_NAME = 'edugenie-offline';
const DB_VERSION = 1;

interface OfflineLesson {
  id: string;
  title: string;
  subject: string;
  class_level: string;
  content: any;
  examples?: any;
  exercises?: any;
  objectives?: string[];
  cached_at: number;
}

interface OfflineQuiz {
  id: string;
  subject: string;
  topic: string;
  difficulty: string;
  questions: any[];
  cached_at: number;
}

interface PendingSync {
  id: string;
  type: 'quiz_result' | 'performance' | 'streak';
  data: any;
  created_at: number;
}

let db: IDBDatabase | null = null;

export const initOfflineDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    if (db) {
      resolve(db);
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    
    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const database = (event.target as IDBOpenDBRequest).result;

      // Lessons store
      if (!database.objectStoreNames.contains('lessons')) {
        const lessonsStore = database.createObjectStore('lessons', { keyPath: 'id' });
        lessonsStore.createIndex('subject', 'subject', { unique: false });
        lessonsStore.createIndex('class_level', 'class_level', { unique: false });
        lessonsStore.createIndex('cached_at', 'cached_at', { unique: false });
      }

      // Quizzes store
      if (!database.objectStoreNames.contains('quizzes')) {
        const quizzesStore = database.createObjectStore('quizzes', { keyPath: 'id' });
        quizzesStore.createIndex('subject', 'subject', { unique: false });
        quizzesStore.createIndex('cached_at', 'cached_at', { unique: false });
      }

      // Pending sync store (for offline submissions)
      if (!database.objectStoreNames.contains('pending_sync')) {
        const syncStore = database.createObjectStore('pending_sync', { keyPath: 'id' });
        syncStore.createIndex('type', 'type', { unique: false });
        syncStore.createIndex('created_at', 'created_at', { unique: false });
      }

      // User data cache
      if (!database.objectStoreNames.contains('user_cache')) {
        database.createObjectStore('user_cache', { keyPath: 'key' });
      }
    };
  });
};

// Lessons
export const cacheLessons = async (lessons: OfflineLesson[]): Promise<void> => {
  const database = await initOfflineDB();
  const tx = database.transaction('lessons', 'readwrite');
  const store = tx.objectStore('lessons');

  for (const lesson of lessons) {
    store.put({ ...lesson, cached_at: Date.now() });
  }

  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};

export const getCachedLessons = async (subject?: string): Promise<OfflineLesson[]> => {
  const database = await initOfflineDB();
  const tx = database.transaction('lessons', 'readonly');
  const store = tx.objectStore('lessons');

  return new Promise((resolve, reject) => {
    let request: IDBRequest;
    
    if (subject) {
      const index = store.index('subject');
      request = index.getAll(subject);
    } else {
      request = store.getAll();
    }

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

export const getCachedLesson = async (id: string): Promise<OfflineLesson | null> => {
  const database = await initOfflineDB();
  const tx = database.transaction('lessons', 'readonly');
  const store = tx.objectStore('lessons');

  return new Promise((resolve, reject) => {
    const request = store.get(id);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
};

// Quizzes
export const cacheQuiz = async (quiz: OfflineQuiz): Promise<void> => {
  const database = await initOfflineDB();
  const tx = database.transaction('quizzes', 'readwrite');
  const store = tx.objectStore('quizzes');

  store.put({ ...quiz, cached_at: Date.now() });

  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};

export const getCachedQuizzes = async (): Promise<OfflineQuiz[]> => {
  const database = await initOfflineDB();
  const tx = database.transaction('quizzes', 'readonly');
  const store = tx.objectStore('quizzes');

  return new Promise((resolve, reject) => {
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

export const getCachedQuiz = async (id: string): Promise<OfflineQuiz | null> => {
  const database = await initOfflineDB();
  const tx = database.transaction('quizzes', 'readonly');
  const store = tx.objectStore('quizzes');

  return new Promise((resolve, reject) => {
    const request = store.get(id);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
};

// Pending sync
export const addPendingSync = async (type: PendingSync['type'], data: any): Promise<void> => {
  const database = await initOfflineDB();
  const tx = database.transaction('pending_sync', 'readwrite');
  const store = tx.objectStore('pending_sync');

  const entry: PendingSync = {
    id: `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    type,
    data,
    created_at: Date.now(),
  };

  store.put(entry);

  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};

export const getPendingSync = async (): Promise<PendingSync[]> => {
  const database = await initOfflineDB();
  const tx = database.transaction('pending_sync', 'readonly');
  const store = tx.objectStore('pending_sync');

  return new Promise((resolve, reject) => {
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

export const removePendingSync = async (id: string): Promise<void> => {
  const database = await initOfflineDB();
  const tx = database.transaction('pending_sync', 'readwrite');
  const store = tx.objectStore('pending_sync');

  store.delete(id);

  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};

// User cache
export const cacheUserData = async (key: string, data: any): Promise<void> => {
  const database = await initOfflineDB();
  const tx = database.transaction('user_cache', 'readwrite');
  const store = tx.objectStore('user_cache');

  store.put({ key, data, cached_at: Date.now() });

  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};

export const getCachedUserData = async <T>(key: string): Promise<T | null> => {
  const database = await initOfflineDB();
  const tx = database.transaction('user_cache', 'readonly');
  const store = tx.objectStore('user_cache');

  return new Promise((resolve, reject) => {
    const request = store.get(key);
    request.onsuccess = () => resolve(request.result?.data || null);
    request.onerror = () => reject(request.error);
  });
};

// Clear old cache (older than 7 days)
export const clearOldCache = async (): Promise<void> => {
  const database = await initOfflineDB();
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

  const stores = ['lessons', 'quizzes'];

  await Promise.all(stores.map((storeName) => new Promise<void>((resolve, reject) => {
    const tx = database.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const index = store.index('cached_at');
    const range = IDBKeyRange.upperBound(sevenDaysAgo);

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error ?? new Error(`Failed to clear ${storeName} cache`));
    index.openCursor(range).onsuccess = (event) => {
      const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
      if (cursor) {
        cursor.delete();
        cursor.continue();
      }
    };
  })));
};

// Get cache statistics
export const getCacheStats = async (): Promise<{
  lessonCount: number;
  quizCount: number;
  pendingSyncCount: number;
  totalSize: string;
}> => {
  const database = await initOfflineDB();

  const getLessonCount = (): Promise<number> => {
    return new Promise((resolve) => {
      const tx = database.transaction('lessons', 'readonly');
      const request = tx.objectStore('lessons').count();
      request.onsuccess = () => resolve(request.result);
    });
  };

  const getQuizCount = (): Promise<number> => {
    return new Promise((resolve) => {
      const tx = database.transaction('quizzes', 'readonly');
      const request = tx.objectStore('quizzes').count();
      request.onsuccess = () => resolve(request.result);
    });
  };

  const getSyncCount = (): Promise<number> => {
    return new Promise((resolve) => {
      const tx = database.transaction('pending_sync', 'readonly');
      const request = tx.objectStore('pending_sync').count();
      request.onsuccess = () => resolve(request.result);
    });
  };

  const [lessonCount, quizCount, pendingSyncCount] = await Promise.all([
    getLessonCount(),
    getQuizCount(),
    getSyncCount(),
  ]);

  // Estimate storage usage
  const estimate = await navigator.storage?.estimate?.();
  const usedBytes = estimate?.usage || 0;
  const totalSize = usedBytes > 1024 * 1024 
    ? `${(usedBytes / (1024 * 1024)).toFixed(2)} MB`
    : `${(usedBytes / 1024).toFixed(2)} KB`;

  return { lessonCount, quizCount, pendingSyncCount, totalSize };
};
