import { useState } from "react";
import { handleCreate } from "../handlers/handleCreate";
import { handleUnlock } from "../handlers/handleUnlock";

export default function WalletWidget() {
	const [address, setAddress] = useState<string | null>(null);
	const [privateKey, setPrivateKey] = useState<string | null>(null);

	return (
		<div className="min-h-screen w-full bg-slate-950 text-slate-100 flex items-center justify-center px-4 py-10">
			<div className="w-full max-w-2xl space-y-8 rounded-3xl border border-slate-800 bg-slate-900/70 p-6 sm:p-8 lg:p-10 shadow-2xl backdrop-blur-xl">
				<header className="space-y-2">
					<h3 className="text-2xl font-semibold text-white">Wallet with Biometric Unlock</h3>
					<p className="text-sm text-slate-300">
						Manage your Ethereum wallet using your platform authenticator. Keep biometrics or your hardware key close
						when creating or unlocking the wallet.
					</p>
				</header>

				<div className="grid gap-4 md:grid-cols-2">
					<button
						className="rounded-xl border border-slate-700 bg-slate-800/60 px-4 py-3 text-sm font-medium text-slate-100 transition hover:-translate-y-0.5 hover:border-indigo-400 hover:bg-slate-800 hover:text-white focus-visible:outline focus-visible:outline-offset-2 focus-visible:outline-indigo-400"
						onClick={async () => {
							setPrivateKey(null);
							await handleCreate(setAddress);
						}}
					>
						Create + Bind Authenticator
					</button>
					<button
						className="rounded-xl border border-indigo-500/70 bg-indigo-500/20 px-4 py-3 text-sm font-medium text-indigo-100 transition hover:-translate-y-0.5 hover:bg-indigo-500/30 hover:text-white focus-visible:outline focus-visible:outline-offset-2 focus-visible:outline-indigo-400"
						onClick={async () => {
							setPrivateKey(null);
							await handleUnlock(setAddress, setPrivateKey);
						}}
					>
						Unlock with Authenticator
					</button>
				</div>

				<section className="grid gap-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-6 text-sm">
					<div className="space-y-1">
						<h4 className="text-xs uppercase tracking-wide text-slate-400">Wallet Address</h4>
						<p className="font-mono text-emerald-300 break-all wrap-break-words">{address ?? "—"}</p>
					</div>
					<div className="space-y-2">
						<h4 className="text-xs uppercase tracking-wide text-slate-400">Private Key (export)</h4>
						{privateKey ? (
							<div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4 text-xs text-slate-200 overflow-x-auto">
								<pre className="max-w-full whitespace-pre-wrap break-all font-mono">{privateKey}</pre>
							</div>
						) : (
							<p className="text-slate-500">Unlock the wallet to reveal the private key for backup.</p>
						)}
					</div>
				</section>
			</div>
		</div>
	);
}
