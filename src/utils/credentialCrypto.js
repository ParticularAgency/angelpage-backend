import crypto from "crypto";

const ALGO = "aes-256-gcm";

function getKey() {
	const secret =
		process.env.INTEGRATION_ENCRYPTION_KEY || process.env.JWT_SECRET || "";
	if (!secret || secret.length < 16) {
		throw new Error(
			"INTEGRATION_ENCRYPTION_KEY or JWT_SECRET (min 16 chars) required for credential storage.",
		);
	}
	return crypto.createHash("sha256").update(secret).digest();
}

export function encryptSecret(plain) {
	if (!plain) return "";
	const key = getKey();
	const iv = crypto.randomBytes(12);
	const cipher = crypto.createCipheriv(ALGO, key, iv);
	const encrypted = Buffer.concat([
		cipher.update(String(plain), "utf8"),
		cipher.final(),
	]);
	const tag = cipher.getAuthTag();
	return `${iv.toString("hex")}:${tag.toString("hex")}:${encrypted.toString("hex")}`;
}

export function decryptSecret(payload) {
	if (!payload) return "";
	const key = getKey();
	const [ivHex, tagHex, dataHex] = String(payload).split(":");
	if (!ivHex || !tagHex || !dataHex) return "";
	const decipher = crypto.createDecipheriv(
		ALGO,
		key,
		Buffer.from(ivHex, "hex"),
	);
	decipher.setAuthTag(Buffer.from(tagHex, "hex"));
	const decrypted = Buffer.concat([
		decipher.update(Buffer.from(dataHex, "hex")),
		decipher.final(),
	]);
	return decrypted.toString("utf8");
}

export function maskSecret(value) {
	if (!value) return "";
	const s = String(value);
	if (s.length <= 8) return "••••••••";
	return `${s.slice(0, 4)}••••${s.slice(-4)}`;
}
