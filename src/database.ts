let __databaseObj: IDBDatabase | null = null;
const __databaseName = 'dessage-database';
export const __currentDatabaseVersion = 18;
export const __tableNameWallet = '__table_wallet__';
export const __tableSystemSetting = '__table_system_setting__';
export const __tableNameMasterKey = '__table_master_key__';

export function initDatabase(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(__databaseName, __currentDatabaseVersion);

        request.onerror = function (event: Event) {
            console.error("[Database] open failed:", (event.target as IDBOpenDBRequest).error);
            reject((event.target as IDBOpenDBRequest).error);
        };

        request.onsuccess = function (event: Event) {
            __databaseObj = (event.target as IDBOpenDBRequest).result;
            console.log("[Database] open success, version=", __databaseObj.version);
            resolve(__databaseObj);
        };

        request.onupgradeneeded = function (event: IDBVersionChangeEvent) {
            const db = (event.target as IDBOpenDBRequest).result;
            if (!db.objectStoreNames.contains(__tableNameWallet)) {
                const objectStore = db.createObjectStore(__tableNameWallet, { keyPath: 'id', autoIncrement: true });
                objectStore.createIndex("uuid", "uuid", {unique: true});
                console.log("[Database] Created wallet table successfully.");
            }

            if (!db.objectStoreNames.contains(__tableSystemSetting)) {
                const objectStore = db.createObjectStore(__tableSystemSetting, {keyPath: 'id'});
                console.log("[Database] Created wallet setting table successfully.");
            }

            if (!db.objectStoreNames.contains(__tableNameMasterKey)) {
                const objectStore = db.createObjectStore(__tableNameMasterKey, {keyPath: 'id', autoIncrement: true });
                console.log("[Database] Created master key  table successfully.");
            }
        };
    });
}

export function closeDatabase() {
    if (__databaseObj) {
        __databaseObj.close();
        console.log("[Database]  connection closed.");
        __databaseObj = null;
    }
}

export function databaseAddItem(storeName: string, data: any): Promise<IDBValidKey> {
    return new Promise((resolve, reject) => {
        if (!__databaseObj) {
            reject('[Database]  is not initialized');
            return;
        }

        try {
            const transaction = __databaseObj.transaction([storeName], 'readwrite');
            const objectStore = transaction.objectStore(storeName);
            const request = objectStore.add(data);

            request.onsuccess = () => {
                resolve(request.result);
            };

            request.onerror = event => {
                reject(`Error adding data to ${storeName}: ${(event.target as IDBRequest).error}`);
            };
        } catch (error) {
            reject(`Unexpected error: ${error}`);
        }
    });
}

function databaseGetByIndex(storeName: string, idx: string, idxVal: any): Promise<any> {
    return new Promise((resolve, reject) => {
        try {
            if (!__databaseObj) {
                reject('[Database]  is not initialized');
                return;
            }
            const transaction = __databaseObj.transaction([storeName], 'readonly');
            const objectStore = transaction.objectStore(storeName);
            const index = objectStore.index(idx);

            const queryRequest = index.get(idxVal);

            queryRequest.onsuccess = function () {
                if (queryRequest.result) {
                    resolve(queryRequest.result);
                } else {
                    resolve(null);
                }
            };

            queryRequest.onerror = function (event) {
                reject('Error in query by key: ' + (event.target as IDBRequest).error);
            };
        } catch (error) {
            reject('Transaction failed: ' + (error as Error).message);
        }
    });
}

export function databaseGetByID(storeName: string, id: any): Promise<any> {
    return new Promise((resolve, reject) => {
        if (!__databaseObj) {
            reject('[Database]  is not initialized');
            return;
        }
        const transaction = __databaseObj.transaction([storeName], 'readonly');
        const objectStore = transaction.objectStore(storeName);

        const request = objectStore.get(id);

        request.onsuccess = event => {
            const result = (event.target as IDBRequest).result;
            if (result) {
                resolve(result);
            } else {
                resolve(null);
            }
        };

        request.onerror = event => {
            reject(`Error getting data from ${storeName}: ${(event.target as IDBRequest).error}`);
        };
    });
}

export function databaseUpdate(storeName: string, id: any, newData: any): Promise<string> {
    return new Promise((resolve, reject) => {
        if (!__databaseObj) {
            reject('[Database] is not initialized');
            return;
        }
        const transaction = __databaseObj.transaction([storeName], 'readwrite');
        const objectStore = transaction.objectStore(storeName);

        const request = objectStore.put({...newData, id});

        request.onsuccess = () => {
            resolve(`Data updated in ${storeName} successfully`);
        };

        request.onerror = event => {
            reject(`Error updating data in ${storeName}: ${(event.target as IDBRequest).error}`);
        };
    });
}

export function databaseDelete(storeName: string, id: any): Promise<string> {
    return new Promise((resolve, reject) => {
        if (!__databaseObj) {
            reject('[Database]  is not initialized');
            return;
        }
        const transaction = __databaseObj.transaction([storeName], 'readwrite');
        const objectStore = transaction.objectStore(storeName);
        const request = objectStore.delete(id);

        request.onsuccess = () => {
            resolve(`Data deleted from ${storeName} successfully`);
        };

        request.onerror = event => {
            reject(`Error deleting data from ${storeName}: ${(event.target as IDBRequest).error}`);
        };
    });
}

function databaseDeleteByFilter(storeName: string, conditionFn: (value: any) => boolean): Promise<string> {
    return new Promise((resolve, reject) => {
        if (!__databaseObj) {
            reject('[Database]  is not initialized');
            return;
        }
        const transaction = __databaseObj.transaction([storeName], 'readwrite');
        const objectStore = transaction.objectStore(storeName);
        const request = objectStore.openCursor();

        request.onsuccess = event => {
            const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
            if (cursor) {
                if (conditionFn(cursor.value)) {
                    cursor.delete();
                }
                cursor.continue();
            } else {
                resolve(`Data deleted from ${storeName} successfully`);
            }
        };

        request.onerror = event => {
            reject(`Error deleting data with condition from ${storeName}: ${(event.target as IDBRequest).error}`);
        };
    });
}

export function databaseQueryAll(storeName: string): Promise<any[]> {
    return new Promise((resolve, reject) => {
        if (!__databaseObj) {
            reject('[Database]  is not initialized');
            return;
        }
        const transaction = __databaseObj.transaction([storeName], 'readonly');
        const objectStore = transaction.objectStore(storeName);
        const request = objectStore.getAll();

        request.onsuccess = event => {
            const data = (event.target as IDBRequest).result;
            resolve(data);
        };

        request.onerror = event => {
            reject(`Error getting all data from ${storeName}: ${(event.target as IDBRequest).error}`);
        };
    });
}

function databaseQueryByFilter(storeName: string, conditionFn: (value: any) => boolean): Promise<any[]> {
    return new Promise((resolve, reject) => {
        if (!__databaseObj) {
            reject('[Database]  is not initialized');
            return;
        }
        const transaction = __databaseObj.transaction([storeName], 'readonly');
        const objectStore = transaction.objectStore(storeName);
        const request = objectStore.openCursor();
        const results: any[] = [];

        request.onsuccess = event => {
            const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
            if (cursor) {
                const data = cursor.value;
                if (conditionFn(data)) {
                    results.push(data);
                }
                cursor.continue();
            } else {
                resolve(results);
            }
        };

        request.onerror = event => {
            reject(`Error querying data from ${storeName}: ${(event.target as IDBRequest).error}`);
        };
    });
}

export function getMaxIdRecord(storeName: string): Promise<any> {
    return new Promise((resolve, reject) => {
        if (!__databaseObj) {
            reject('[Database]  is not initialized');
            return;
        }
        const transaction = __databaseObj.transaction([storeName], 'readonly');
        const objectStore = transaction.objectStore(storeName);
        const cursorRequest = objectStore.openCursor(); // 只传入一个参数
        cursorRequest.onsuccess = function (event) {
            const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
            if (cursor) {
                resolve(cursor.value);
            } else {
                resolve(null);
            }
        };

        cursorRequest.onerror = function (event) {
            const error = (event.target as IDBRequest).error; // 显式地转换为 IDBRequest
            reject(`Error opening cursor: ${error}`);
        };
    });
}

export async function checkAndInitDatabase(): Promise<void> {
    if (!__databaseObj) {
        await initDatabase();
    }
}

export function upsertItem(storeName: string, data: any): Promise<string> {
    return new Promise(async (resolve, reject) => {
        try {
            // 检查数据库是否初始化
            if (!__databaseObj) {
                reject('[Database] is not initialized');
                return;
            }

            // 检查数据中是否有 id 字段
            if (!data.id) {
                reject('Data must contain an id field for upsert operation.');
                return;
            }

            // 通过 id 查找记录
            const existingRecord = await databaseGetByID(storeName, data.id);

            if (existingRecord) {
                // 如果记录存在，则更新
                const updateResult = await databaseUpdate(storeName, data.id, data);
                resolve(updateResult);
            } else {
                // 如果记录不存在，则新增
                const addResult = await databaseAddItem(storeName, data);
                resolve(`Data inserted with key: ${addResult}`);
            }
        } catch (error) {
            reject(`Error during upsert operation: ${error}`);
        }
    });
}
