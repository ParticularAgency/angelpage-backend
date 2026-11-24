"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initJobQueue = initJobQueue;
exports.registerJobHandler = registerJobHandler;
exports.enqueueJob = enqueueJob;
exports.closeJobQueue = closeJobQueue;
let queue = null;
let worker = null;
const localHandlers = new Map();
function initJobQueue() {
    return __awaiter(this, void 0, void 0, function* () {
        if (!process.env.REDIS_URL) {
            console.log("[jobs] REDIS_URL not set — using in-process job runner");
            return { mode: "local" };
        }
        try {
            const { Queue, Worker } = yield Promise.resolve().then(() => __importStar(require("bullmq")));
            const IORedis = (yield Promise.resolve().then(() => __importStar(require("ioredis")))).default;
            const connection = new IORedis(process.env.REDIS_URL, {
                maxRetriesPerRequest: null,
            });
            queue = new Queue("angelpage-jobs", { connection });
            worker = new Worker("angelpage-jobs", (job) => __awaiter(this, void 0, void 0, function* () {
                const handler = localHandlers.get(job.name);
                if (!handler)
                    throw new Error(`No handler for job ${job.name}`);
                return handler(job.data);
            }), { connection });
            worker.on("failed", (job, err) => {
                console.error(`[jobs] ${job === null || job === void 0 ? void 0 : job.name} failed:`, err.message);
            });
            console.log("[jobs] BullMQ worker started");
            return { mode: "bullmq" };
        }
        catch (err) {
            console.warn("[jobs] BullMQ unavailable, falling back to local:", err.message);
            return { mode: "local" };
        }
    });
}
function registerJobHandler(name, handler) {
    localHandlers.set(name, handler);
}
function enqueueJob(name_1, data_1) {
    return __awaiter(this, arguments, void 0, function* (name, data, { delay = 0 } = {}) {
        if (queue) {
            return queue.add(name, data, {
                delay,
                attempts: 3,
                backoff: { type: "exponential", delay: 5000 },
                removeOnComplete: 100,
                removeOnFail: 50,
            });
        }
        const handler = localHandlers.get(name);
        if (!handler) {
            console.warn(`[jobs] No handler for ${name}`);
            return null;
        }
        const run = () => handler(data).catch((err) => console.error(`[jobs] ${name}:`, err));
        if (delay > 0)
            setTimeout(run, delay);
        else
            setImmediate(run);
        return { id: `local-${Date.now()}`, name };
    });
}
function closeJobQueue() {
    return __awaiter(this, void 0, void 0, function* () {
        if (worker)
            yield worker.close();
        if (queue)
            yield queue.close();
    });
}
