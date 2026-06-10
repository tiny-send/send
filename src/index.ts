import { readFileSync, appendFileSync } from 'node:fs';
import { Tinysend, TinysendError } from 'tinysend';
import { marked } from 'marked';

function input(name: string): string | undefined {
	const value = process.env[`INPUT_${name.toUpperCase()}`];
	return value === undefined || value === '' ? undefined : value;
}

function requireInput(name: string): string {
	const value = input(name);
	if (value === undefined) fail(`missing required input: ${name}`);
	return value;
}

function setOutput(name: string, value: string | number): void {
	const file = process.env.GITHUB_OUTPUT;
	if (file) appendFileSync(file, `${name}=${value}\n`);
}

function fail(message: string): never {
	console.error(`::error::${message}`);
	process.exit(1);
}

async function main(): Promise<void> {
	const apiKey = requireInput('api-key');
	const listId = requireInput('list');
	const subject = requireInput('subject');
	const channel = input('channel') ?? 'email';
	const format = input('format') ?? 'markdown';
	const draft = (input('draft') ?? 'false') === 'true';

	if (channel !== 'email') {
		fail(`channel "${channel}" is coming soon — only "email" is available today`);
	}
	if (!['markdown', 'html', 'text'].includes(format)) {
		fail(`unknown format "${format}" — use markdown, html, or text`);
	}

	const bodyFile = input('body-file');
	const raw = bodyFile ? readFileSync(bodyFile, 'utf8') : input('body');
	if (raw === undefined) fail('provide body or body-file');

	const params =
		format === 'html' ? { subject, body_html: raw }
		: format === 'text' ? { subject, body_text: raw }
		: { subject, body_html: marked.parse(raw, { async: false }) };

	const ts = new Tinysend(apiKey);

	try {
		const post = await ts.posts.create(listId, params);
		console.log(`created post ${post.id}: "${subject}"`);

		if (draft) {
			setOutput('post-id', post.id);
			setOutput('status', 'draft');
			setOutput('recipients', 0);
			console.log('draft only, not sending');
		} else {
			const result = await ts.posts.send(listId, post.id);
			setOutput('post-id', post.id);
			setOutput('status', result.status);
			setOutput('recipients', result.recipients);
			console.log(`sent to ${result.recipients} recipients`);
		}
	} catch (err) {
		if (err instanceof TinysendError) {
			fail(`tinysend API error ${err.status} (${err.code}): ${err.message}`);
		}
		throw err;
	}
}

main();
