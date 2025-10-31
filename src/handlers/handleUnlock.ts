import { hexlify, Wallet } from "ethers";
import { toArrayBuffer } from "../utils/cast";
import { decryptData } from "../utils/crypto";

export async function handleUnlock(setAddress: (addr: string) => void, setPrivateKey: (pk: string) => void) {
	if (!window.PublicKeyCredential) {
		alert("WebAuthn with biometric support is required.");
		return;
	}

	const blobStr = localStorage.getItem("wallet-blob");
	if (!blobStr) {
		alert("No wallet blob found");
		return;
	}

	const blob = JSON.parse(blobStr);
	const biometricBlob = blob.biometric;
	if (!biometricBlob) {
		alert("Stored wallet is missing biometric data");
		return;
	}

	try {
		const storedCredId = localStorage.getItem("biometric-cred-id");
		if (!storedCredId) {
			alert("Biometric credential not registered on this device");
			return;
		}

		const credIdBytes = new Uint8Array(JSON.parse(storedCredId) as number[]);
		const challenge = window.crypto.getRandomValues(new Uint8Array(32));
		const prfSalt = new Uint8Array(biometricBlob.prfSalt);
		const assertion = await navigator.credentials.get({
			publicKey: {
				challenge: toArrayBuffer(challenge),
				allowCredentials: [
					{
						id: toArrayBuffer(credIdBytes),
						type: "public-key",
					},
				],
				userVerification: "required",
				extensions: {
					prf: { eval: { first: toArrayBuffer(prfSalt) } },
				},
			},
		});

		if (!assertion || !(assertion instanceof PublicKeyCredential)) {
			console.warn("Unexpected credential type returned from get()", assertion);
			alert("Authenticator did not respond.");
			return;
		}

		const extensionResults =
			typeof assertion.getClientExtensionResults === "function"
				? assertion.getClientExtensionResults()
				: undefined;
		const secretSource =
			(extensionResults as any)?.prf?.results?.first ??
			(extensionResults as any)?.prf?.results?.second ??
			(extensionResults as any)?.hmacGetSecret ??
			null;

		if (!secretSource) {
			console.warn("Authenticator did not return PRF/hmac-secret output");
			alert("Authenticator did not release the symmetric key.");
			return;
		}

		const secretBytes = new Uint8Array(secretSource);
		const keyMaterialBytes =
			secretBytes.length === 32
				? secretBytes
				: secretBytes.length > 32
					? secretBytes.slice(0, 32)
					: new Uint8Array(await window.crypto.subtle.digest("SHA-256", toArrayBuffer(secretBytes)));

		const biometricKey = await window.crypto.subtle.importKey(
			"raw",
			toArrayBuffer(keyMaterialBytes),
			{ name: "AES-GCM", length: 256 },
			false,
			["decrypt"]
		);

		const iv = new Uint8Array(biometricBlob.iv);
		const ciphertext = new Uint8Array(biometricBlob.ciphertext);
		const privBytes = await decryptData(biometricKey, iv, ciphertext);
		const privHex = hexlify(privBytes);
		const wallet = new Wallet(privHex);
		setAddress(wallet.address);
		setPrivateKey(privHex);
		alert("Wallet unlocked: " + wallet.address);
	} catch (err) {
		console.warn("Biometric unlock failed", err);
		alert("Biometric unlock failed.");
	}
}
