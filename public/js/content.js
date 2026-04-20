// =========================================================
// content.js — progressive enhancement layer
// Fetches projects / experience / testimonials from Firestore
// and replaces the seed HTML when data is available.
// If Firestore is unreachable or empty, the HTML seed stays.
// =========================================================

import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.12.0/firebase-app.js';
import {
	getFirestore,
	collection,
	query,
	orderBy,
	getDocs
} from 'https://www.gstatic.com/firebasejs/12.12.0/firebase-firestore.js';

const firebaseConfig = {
	apiKey: 'AIzaSyDW0yjoPrwfrrLFSZTCmUhPpKkv0u29YBs',
	authDomain: 'portifolio-78b21.firebaseapp.com',
	projectId: 'portifolio-78b21',
	storageBucket: 'portifolio-78b21.firebasestorage.app',
	messagingSenderId: '478686901711',
	appId: '1:478686901711:web:81f8ea9fd7ef1f275fceba'
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ---------------------------------------------------------
// Helpers
// ---------------------------------------------------------

const esc = (s) => String(s ?? '')
	.replace(/&/g, '&amp;')
	.replace(/</g, '&lt;')
	.replace(/>/g, '&gt;')
	.replace(/"/g, '&quot;')
	.replace(/'/g, '&#39;');

const ymFormat = (ym) => {
	if (!ym) return '';
	const [y, m] = String(ym).split('-');
	if (!m) return y;
	const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
	const idx = parseInt(m, 10) - 1;
	return `${months[idx] ?? ''} ${y}`.trim();
};

async function fetchCollection(name) {
	const q = query(collection(db, name), orderBy('order', 'asc'));
	const snap = await getDocs(q);
	return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

// ---------------------------------------------------------
// Renderers
// ---------------------------------------------------------

function renderProject(p, i) {
	const num = String(i + 1).padStart(2, '0');

	const meta = (p.meta || p.metadata || {});
	const metaParts = [];
	if (meta.employer) metaParts.push(`<span>${esc(meta.employer)}</span>`);
	const years = meta.endYear && meta.endYear !== meta.startYear
		? `<span><time datetime="${esc(meta.startYear)}">${esc(meta.startYear)}</time>–<time datetime="${esc(meta.endYear)}">${esc(meta.endYear)}</time></span>`
		: meta.startYear
			? `<span><time datetime="${esc(meta.startYear)}">${esc(meta.startYear)}</time></span>`
			: meta.year
				? `<span><time datetime="${esc(meta.year)}">${esc(meta.year)}</time></span>`
				: '';
	if (years) metaParts.push(years);

	const bullets = Array.isArray(p.bullets) && p.bullets.length
		? `<ul class="project_bullets">${p.bullets.map((b) => `<li>${esc(b)}</li>`).join('')}</ul>`
		: '';

	const tags = Array.isArray(p.tags) && p.tags.length
		? `<ul class="tag_list">${p.tags.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>`
		: '';

	const links = Array.isArray(p.links) && p.links.length
		? `<p class="project_links">${p.links.map((l) => `<a href="${esc(l.url)}" target="_blank" rel="noopener">${esc(l.label)} →</a>`).join(' ')}</p>`
		: '';

	return `
		<li class="project">
			<div class="project_num" aria-hidden="true">${num}</div>
			<article class="project_body">
				<header>
					<h3>${esc(p.title)}</h3>
					${metaParts.length ? `<p class="project_meta">${metaParts.join('')}</p>` : ''}
				</header>
				<p>${esc(p.description)}</p>
				${bullets}
				${tags}
				${links}
			</article>
		</li>
	`;
}

function renderExperience(x) {
	const start = ymFormat(x.startDate);
	const end = x.endDate ? ymFormat(x.endDate) : 'Present';
	const dates = `<time datetime="${esc(x.startDate)}">${esc(start)}</time> — <time datetime="${esc(x.endDate ?? '')}">${esc(end)}</time>`;

	if (x.isSabbatical) {
		return `
			<li class="timeline_entry timeline_sabbatical">
				<div class="timeline_dates">${dates}</div>
				<div class="timeline_body">
					<h3>${esc(x.title || 'Sabbatical')}</h3>
					<p>${esc(x.description || 'Intentional break between engagements.')}</p>
				</div>
			</li>
		`;
	}

	const bullets = Array.isArray(x.bullets) && x.bullets.length
		? `<ul>${x.bullets.map((b) => `<li>${esc(b)}</li>`).join('')}</ul>`
		: '';
	const loc = x.location
		? `<p class="timeline_loc">${esc(x.location)}${x.remote ? ' · Remote' : ''}</p>`
		: '';

	return `
		<li class="timeline_entry">
			<div class="timeline_dates">${dates}</div>
			<div class="timeline_body">
				<h3>${esc(x.role)} · ${esc(x.company)}</h3>
				${loc}
				${bullets}
			</div>
		</li>
	`;
}

function renderTestimonial(t) {
	const meta = [t.role, t.company].filter(Boolean).map(esc).join(' · ');
	return `
		<li class="testimonial">
			<p class="testimonial_quote">${esc(t.quote)}</p>
			<p class="testimonial_author">
				<strong>${esc(t.author)}</strong>
				${meta ? `<span>${meta}</span>` : ''}
			</p>
		</li>
	`;
}

// ---------------------------------------------------------
// Hydration
// ---------------------------------------------------------

function getContainer(hydrateKey) {
	return document.querySelector(`[data-hydrate="${hydrateKey}"]`);
}

async function hydrate(key, renderer, { onEmpty, onSuccess } = {}) {
	const container = getContainer(key);
	if (!container) return { key, status: 'no-container' };

	try {
		const docs = await fetchCollection(key);
		if (!docs.length) {
			onEmpty?.();
			return { key, status: 'empty', count: 0 };
		}
		container.innerHTML = docs.map(renderer).join('');
		onSuccess?.(docs);
		return { key, status: 'ok', count: docs.length };
	} catch (err) {
		console.warn(`[content] ${key} hydration failed — seed HTML kept.`, err);
		return { key, status: 'error', error: err };
	}
}

function revealTestimonials() {
	const section = document.getElementById('testimonials');
	const navItem = document.querySelector('[data-nav="testimonials"]');
	if (section) section.removeAttribute('hidden');
	if (navItem) navItem.removeAttribute('hidden');
}

async function run() {
	const t0 = performance.now();
	const results = await Promise.allSettled([
		hydrate('projects', renderProject),
		hydrate('experience', renderExperience),
		hydrate('testimonials', renderTestimonial, {
			onSuccess: revealTestimonials
		})
	]);
	const elapsed = (performance.now() - t0).toFixed(0);
	const summary = results.map((r) => r.status === 'fulfilled' ? r.value : { status: 'rejected' });
	console.info(`[content] hydrated in ${elapsed}ms`, summary);
}

run();
