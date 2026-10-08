import {
	isRouteErrorResponse,
	Links,
	Meta,
	Outlet,
	Scripts,
	ScrollRestoration,
} from "react-router";

import type { Route } from "./+types/root";
import "./app.css";

export const links: Route.LinksFunction = () => [
	{ rel: "preconnect", href: "https://fonts.googleapis.com" },
	{
		rel: "preconnect",
		href: "https://fonts.gstatic.com",
		crossOrigin: "anonymous",
	},
	{
		rel: "stylesheet",
		href: "https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap",
	},
];

export function SkipLink() {
	return (
		<a
			href="#main-content"
			className="sr-only focus-visible:not-sr-only focus-visible:fixed focus-visible:top-4 focus-visible:left-4 focus-visible:z-50 focus-visible:px-4 focus-visible:py-2 focus-visible:rounded-full focus-visible:bg-[#1a120b] focus-visible:text-amber-100/90 focus-visible:text-sm focus-visible:font-light focus-visible:tracking-wide focus-visible:border focus-visible:border-amber-200/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-200/50 focus-visible:shadow-lg focus-visible:backdrop-blur-sm transition-all"
		>
			Skip to main content
		</a>
	);
}

export function Layout({ children }: { children: React.ReactNode }) {
	return (
		<html lang="en">
			<head>
				<meta charSet="utf-8" />
				<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
				<link rel="manifest" href="/regulate-app/manifest.json" />
				<link rel="icon" type="image/png" sizes="192x192" href="/regulate-app/icons/icon-192.png" />
				<link rel="apple-touch-icon" href="/regulate-app/icons/icon-192.png" />
				<Meta />
				<Links />
			</head>
			<body>
				<SkipLink />
				{children}
				<ScrollRestoration />
				<Scripts />
				<script
					dangerouslySetInnerHTML={{
						__html: `
							if ('serviceWorker' in navigator && location.hostname !== 'localhost') {
								window.addEventListener('load', function() {
									navigator.serviceWorker.register('/regulate-app/sw.js', {
										scope: '/regulate-app/'
									});
								});
							}
						`,
					}}
				/>
			</body>
		</html>
	);
}

export function HydrateFallback() {
	return (
		<div
			className="fixed inset-0 flex flex-col items-center justify-center"
			style={{ background: "#0f0a05" }}
		>
			<p className="text-amber-100/70 text-lg font-extralight tracking-[0.3em] uppercase animate-pulse">
				Loading...
			</p>
		</div>
	);
}

export default function App() {
	return <Outlet />;
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
	const is404 = isRouteErrorResponse(error) && error.status === 404;

	return (
		<main
			className="fixed inset-0 flex flex-col items-center justify-center"
			style={{ background: "#0f0a05" }}
		>
			<div className="text-center max-w-md px-6">
				<div className="text-amber-200/60 text-6xl mb-6 font-extralight">
					~
				</div>
				<h1 className="text-amber-100/75 text-xl font-extralight tracking-wider mb-4">
					{is404
						? "This space doesn't exist yet"
						: "Something needs a moment"}
				</h1>
				<p className="text-amber-200/60 text-sm font-light leading-relaxed mb-8">
					{is404
						? "Let's bring you back to a calmer place."
						: "Take a breath. These things happen. Let's start fresh."}
				</p>
				<a
					href="/regulate-app/"
					className="inline-block px-6 py-3 rounded-full bg-amber-200/8 text-amber-100/70 text-sm font-light tracking-wider border border-amber-200/25 hover:bg-amber-200/12 transition-all duration-500 focus-visible:ring-2 focus-visible:ring-amber-200/40 focus-visible:outline-none"
				>
					Return home
				</a>
			</div>
		</main>
	);
}
