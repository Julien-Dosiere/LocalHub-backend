const redis = require('redis');

const client = redis.createClient(process.env.REDIS_URL);

module.exports = {

    /**
     * Seek any data stored in Redis DB with <key> reference
     *
     * @param {String} key
     * @return {Object} data object stored at <key>
     */
    read(key) {
        return new Promise((resolve, reject) => {
            client.get(key, (error, data) => {
                if (error) {
                    console.log(error);
                    reject(error);
                } else {
                    resolve(data);
                }
            });
        });
    },

    /**
     * Store any data type as a JSON object in Redis DB
     * using <key> as reference
     *
     * @param {String} key
     * @param {any} value
     * @returns {String} "OK" if operation successfull
     */
    store(key, value) {
        return new Promise((resolve, reject) => {
            client.setex(key, 180, value, (error, status) => {
                if (error) {
                    console.log(error);
                    reject(error);
                } else {
                    resolve(status);
                }
            });
        });
    },

    /**
     * Check if any data exists in Redis DB stored under <key>
     *
     * @param {String} key
     * @returns{Number} 1 if datas exists, 0 if no datas
     *
     */
    has(key) {
        return new Promise((resolve, reject) => {
            client.exists(key, (error, result) => {
                if (error) {
                    console.log(error);
                    reject(error);
                    return;
                }

                resolve(result == 1);
            });
        });
    },

    /**
     * Truncate Redis DB, deleting all cached datas
     */
    flushAll() {
        return new Promise((resolve, reject) => {
            client.flushall((error, result) => {
                if (error) {
                    console.log(error);
                    reject(error);
                    return;
                }
                console.log("Redis flushed");
                resolve(result == 1);
            });
        });
    },

    /**
     * Check if any data exists in Redis DB stored under <key>
     * - if <key> exists return stored data
     * - if not, executes callback query, stored its results in Redis and returns it
     * @param {*} key
     * @param {*} callback
     * @returns {Array} array of data expected to be returned from the callback passed in param
     */
    async wrapper(key, callback){
        // activate / deactivate wrapper
        if (!process.env.CACHE_ENABLED === false){
            console.log("Redis cache disabled")
            return callback();

        }
        // -------------------------------
        console.log("Redis cache enabled")
        // Check if key already exist in Redis DB
        const valueAlreadyInCache = await this.has(key);
        // If not, execute callback function and store result in Redis
        if (!valueAlreadyInCache){
            const result = await callback();
            if(result !== undefined){
                await this.store(key, JSON.stringify(result));
            }
            return result;
        }
        // If so, retrieve data from Redis
        else {
            const cached = await this.read(key);
            const result = JSON.parse(cached);
            console.log(`cache found for "${key}"`);
            return result
        }
    }



};
