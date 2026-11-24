let queue = null;
let worker = null;
const localHandlers = new Map();

export async function initJobQueue() {
	if (!process.env.REDIS_URL) {
		console.log("[jobs] REDIS_URL not set — using in-process job runner");
		return { mode: "local" };
	}
	try {
		const { Queue, Worker } = await import("bullmq");
		const IORedis = (await import("ioredis")).default;
		const connection = new IORedis(process.env.REDIS_URL, {
			maxRetriesPerRequest: null,
		});
		queue = new Queue("angelpage-jobs", { connection });
		worker = new Worker(
			"angelpage-jobs",
			async (job) => {
				const handler = localHandlers.get(job.name);
				if (!handler) throw new Error(`No handler for job ${job.name}`);
				return handler(job.data);
			},
			{ connection },
		);
		worker.on("failed", (job, err) => {
			console.error(`[jobs] ${job?.name} failed:`, err.message);
		});
		console.log("[jobs] BullMQ worker started");
		return { mode: "bullmq" };
	} catch (err) {
		console.warn("[jobs] BullMQ unavailable, falling back to local:", err.message);
		return { mode: "local" };
	}
}

export function registerJobHandler(name, handler) {
	localHandlers.set(name, handler);
}

export async function enqueueJob(name, data, { delay = 0 } = {}) {
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
	if (delay > 0) setTimeout(run, delay);
	else setImmediate(run);
	return { id: `local-${Date.now()}`, name };
}

export async function closeJobQueue() {
	if (worker) await worker.close();
	if (queue) await queue.close();
}
