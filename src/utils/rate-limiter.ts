// src/utils/rate-limiter.ts
export class RateLimiter {
    private cooldown: number;
    private kv: KVNamespace;

    constructor(cooldown: number, kv: KVNamespace) {
        this.cooldown = cooldown;
        this.kv = kv;
    }

    async isRateLimited(key: number): Promise<boolean> {
        const lastRequestTime = parseInt(await this.kv.get(`last_request:${key}`) || '0', 10); //  使用 parseInt(..., 10) 确保正确的解析
        return Date.now() - lastRequestTime < this.cooldown;
    }


    async setLastRequestTime(key: number): Promise<void> {
        await this.kv.put(`last_request:${key}`, Date.now().toString());
    }

    async getRemainingTime(key: number): Promise<number> {
        const lastRequestTime = parseInt(await this.kv.get(`last_request:${key}`) || '0');
        return Math.max(0, this.cooldown - (Date.now() - lastRequestTime));
    }

}
