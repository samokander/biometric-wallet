import { Wallet, getBytes } from "ethers";
import { encryptData } from "../utils/crypto";
import { toArrayBuffer } from "../utils/cast";

export async function handleCreate(setAddress: (addr: string) => void) {
	if (!window.PublicKeyCredential) {
		alert("WebAuthn with biometric support is required.");
		return;
	}

	try {
		const challenge = window.crypto.getRandomValues(new Uint8Array(32));
		const userId = window.crypto.getRandomValues(new Uint8Array(16));
		const prfSalt = window.crypto.getRandomValues(new Uint8Array(32));
		const registrationExtensions: any = {
			prf: { eval: { first: toArrayBuffer(prfSalt) } },
		};

		const cred = await navigator.credentials.create({
			publicKey: {
				challenge: toArrayBuffer(challenge),
				rp: { name: "Keystore Wallet" },
				user: { id: toArrayBuffer(userId), name: "user@example.com", displayName: "User" },
				pubKeyCredParams: [{ type: "public-key", alg: -7 }],
				authenticatorSelection: { userVerification: "required" },
				extensions: registrationExtensions,
			},
		});

		if (!cred || !(cred instanceof PublicKeyCredential)) {
			console.warn("Unexpected credential type returned from create()", cred);
			alert("Unable to enroll authenticator.");
			return;
		}

		const extensionResults =
			typeof cred.getClientExtensionResults === "function" ? cred.getClientExtensionResults() : undefined;
		const secretSource =
			(extensionResults as any)?.prf?.results?.first ??
			(extensionResults as any)?.prf?.results?.second ??
			(extensionResults as any)?.hmacGetSecret ??
			null;

		if (!secretSource) {
			console.warn("Authenticator did not provide PRF/hmac-secret during registration");
			alert("Authenticator did not release a secret; cannot store wallet.");
			return;
		}

		const credId = new Uint8Array(cred.rawId);
		const secretBytes = new Uint8Array(secretSource);
		const keyMaterialBytes =
			secretBytes.length === 32
				? secretBytes
				: secretBytes.length > 32
				? secretBytes.slice(0, 32)
				: new Uint8Array(await window.crypto.subtle.digest("SHA-256", toArrayBuffer(secretBytes)));

		const wallet = Wallet.createRandom();
		setAddress(wallet.address);
		const privBytes = getBytes(wallet.privateKey);

		const biometricKey = await window.crypto.subtle.importKey(
			"raw",
			toArrayBuffer(keyMaterialBytes),
			{ name: "AES-GCM", length: 256 },
			false,
			["encrypt", "decrypt"]
		);

		const biometricEncrypted = await encryptData(biometricKey, privBytes);

		const blob = {
			address: wallet.address,
			biometric: {
				prfSalt: Array.from(prfSalt),
				iv: biometricEncrypted.iv,
				ciphertext: biometricEncrypted.ciphertext,
			},
		};

		localStorage.setItem("wallet-blob", JSON.stringify(blob));
		localStorage.setItem("biometric-cred-id", JSON.stringify(Array.from(credId)));
		localStorage.setItem("biometric-enabled", "1");
		alert("Wallet created and bound to your authenticator.");
	} catch (err) {
		console.warn("Biometric enrollment failed", err);
		localStorage.removeItem("wallet-blob");
		localStorage.removeItem("biometric-cred-id");
		localStorage.removeItem("biometric-enabled");
		alert("Biometric enrollment failed; wallet not stored.");
	}
}
