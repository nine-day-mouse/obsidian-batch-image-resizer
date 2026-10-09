import {
	App,
	Editor,
	MarkdownView,
	Menu,
	Modal,
	Notice,
	Plugin,
	PluginSettingTab,
	Setting,
	TFile,
} from 'obsidian';

import { LanguageSetting, Messages, STRINGS, resolveLang } from './i18n';

/** Extensions that are treated as images. */
const IMAGE_EXTENSIONS = new Set([
	'png',
	'jpg',
	'jpeg',
	'jfif',
	'gif',
	'bmp',
	'svg',
	'webp',
	'avif',
	'apng',
	'ico',
	'tif',
	'tiff',
]);

/** Matches wiki embeds such as `![[image.png]]` or `![[image.png|500]]`. */
const WIKI_EMBED_RE = /!\[\[([^\[\]\n]+?)\]\]/g;
/** Matches Markdown images such as `![alt](image.png)` or `![alt|500](image.png)`. */
const MARKDOWN_IMAGE_RE = /!\[([^\]\n]*)\]\(\s*([^)\s]+)(?:\s+["'][^"']*["'])?\s*\)/g;

const FENCE_RE = /^\s*(`{3,}|~{3,})/;
/** Looks like an Obsidian size: `500`, `500x300` or `500x`. */
const SIZE_LIKE_RE = /^\d+(x\d*)?$/;

const SIZE_PRESETS = ['300', '500', '800', '1000'];

/** How the protection checkbox starts out each time the dialog opens. */
type CheckboxDefault = 'checked' | 'unchecked' | 'last';

interface ImageResizerSettings {
	/** Size pre-filled in the input dialog, e.g. `500` or `500x300`. */
	defaultSize: string;
	/** Also rewrite `![alt](image.png)` style images. */
	includeMarkdownImages: boolean;
	/** Leave `http(s)://` and `data:` images untouched. */
	skipExternalImages: boolean;
	/** `auto` follows Obsidian's own language. */
	language: LanguageSetting;
	/** Offer to leave manually adjusted sizes alone. */
	protectManualSizes: boolean;
	/** Initial state of the protection checkbox in the dialog. */
	checkboxDefault: CheckboxDefault;
	/** Remembers the checkbox when `checkboxDefault` is `last`. */
	lastCheckboxState: boolean;
}

const DEFAULT_SETTINGS: ImageResizerSettings = {
	defaultSize: '500',
	includeMarkdownImages: false,
	skipExternalImages: true,
	language: 'auto',
	protectManualSizes: true,
	checkboxDefault: 'checked',
	lastCheckboxState: true,
};

const SET_SIZE_COMMAND_ID = 'set-image-size-in-note';
const CLEAR_SIZE_COMMAND_ID = 'clear-image-size-in-note';

interface TransformResult {
	lines: string[];
	/** Images actually rewritten. */
	count: number;
	/** Images left alone because their size looks manually adjusted. */
	skipped: number;
}

interface TransformOptions {
	/** Leave images whose current size looks manually adjusted alone. */
	protectManualSizes?: boolean;
}

type SizeDialogResult =
	| { action: 'apply'; size: string; protectManual: boolean }
	| { action: 'clear' };

export default class BatchImageResizerPlugin extends Plugin {
	settings: ImageResizerSettings;

	/** The ribbon button, kept so its tooltip can follow a language change. */
	private ribbonEl: HTMLElement | null = null;

	/** Strings of the language currently in use. */
	get msg(): Messages {
		return STRINGS[resolveLang(this.settings.language)];
	}

	async onload() {
		await this.loadSettings();

		// One click on the left ribbon opens the size dialog.
		this.ribbonEl = this.addRibbonIcon('image', this.msg.ribbonTooltip, () =>
			this.promptForSize()
		);

		this.registerCommands();

		this.registerEvent(
			this.app.workspace.on('editor-menu', (menu: Menu, editor: Editor) => {
				const { msg } = this;
				menu.addItem((item) =>
					item
						.setTitle(msg.menuSetSize)
						.setIcon('image')
						.onClick(() => this.promptForSize(editor))
				);
				menu.addItem((item) =>
					item
						.setTitle(msg.menuClearSize)
						.setIcon('image-off')
						.onClick(() => this.applyToEditor(editor, null))
				);
			})
		);

		this.addSettingTab(new ImageResizerSettingTab(this.app, this));
	}

	/**
	 * Registers the commands. Registered with `callback` (not `editorCallback`)
	 * so they are also listed in reading mode, where no editor is available.
	 */
	private registerCommands() {
		const manager = this.app as unknown as {
			commands?: { removeCommand?: (id: string) => void };
		};
		// A command keeps the name it was added with, so drop the old ones first.
		manager.commands?.removeCommand?.(SET_SIZE_COMMAND_ID);
		manager.commands?.removeCommand?.(CLEAR_SIZE_COMMAND_ID);

		this.addCommand({
			id: SET_SIZE_COMMAND_ID,
			name: this.msg.commandSetSize,
			callback: () => this.promptForSize(),
		});

		this.addCommand({
			id: CLEAR_SIZE_COMMAND_ID,
			name: this.msg.commandClearSize,
			callback: () => void this.runOnActiveNote(null),
		});
	}

	/** Re-applies language dependent labels without reloading the plugin. */
	refreshLabels() {
		if (this.ribbonEl) {
			this.ribbonEl.setAttribute('aria-label', this.msg.ribbonTooltip);
			this.ribbonEl.setAttribute('data-tooltip-position', 'right');
		}
		this.registerCommands();
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	/** Opens the size dialog for the note that is currently active. */
	private promptForSize(editor?: Editor) {
		new SizeInputModal(
			this.app,
			this.msg,
			this.settings.defaultSize,
			{
				showProtection: this.settings.protectManualSizes,
				protectionChecked: this.initialCheckboxState(),
			},
			(result) => {
				if (result === null) return;

				const run = (size: string | null, protectManual: boolean) => {
					if (editor) {
						this.applyToEditor(editor, size, protectManual);
					} else {
						void this.runOnActiveNote(size, protectManual);
					}
				};

				if (result.action === 'clear') {
					run(null, false);
					return;
				}

				void this.rememberCheckboxState(result.protectManual);
				run(result.size, result.protectManual);
			}
		).open();
	}

	/** State the protection checkbox should open with. */
	private initialCheckboxState(): boolean {
		switch (this.settings.checkboxDefault) {
			case 'checked':
				return true;
			case 'unchecked':
				return false;
			default:
				return this.settings.lastCheckboxState;
		}
	}

	private async rememberCheckboxState(state: boolean) {
		if (this.settings.lastCheckboxState === state) return;
		this.settings.lastCheckboxState = state;
		await this.saveSettings();
	}

	/**
	 * Rewrites every image reference of the active note.
	 * Pass `null` as size to strip existing sizes.
	 */
	private async runOnActiveNote(size: string | null, protectManual = false) {
		const view = this.app.workspace.getActiveViewOfType(MarkdownView);
		const file = view?.file ?? this.app.workspace.getActiveFile();

		if (!file || file.extension !== 'md') {
			new Notice(this.msg.noticeOpenNote);
			return;
		}

		// In editing mode the editor is used so history and cursor survive.
		if (view && view.getMode() === 'source') {
			this.applyToEditor(view.editor, size, protectManual);
			return;
		}

		await this.applyToFile(file, size, protectManual);
	}

	/** Rewrites the buffer of an open editor, keeping undo history intact. */
	private applyToEditor(editor: Editor, size: string | null, protectManual = false) {
		const original: string[] = [];
		for (let i = 0; i < editor.lineCount(); i++) {
			original.push(editor.getLine(i));
		}

		const result = transformLines(original, size, this.settings, {
			protectManualSizes: protectManual,
		});

		if (result.count > 0) {
			// Replace from the bottom up so earlier line indices stay valid.
			for (let i = result.lines.length - 1; i >= 0; i--) {
				if (result.lines[i] === original[i]) continue;
				editor.replaceRange(
					result.lines[i],
					{ line: i, ch: 0 },
					{ line: i, ch: original[i].length }
				);
			}
		}

		this.reportResult(result, size);
	}

	/**
	 * Fallback used in reading mode, where there is no editor to write to.
	 * The file is rewritten through the vault API instead.
	 */
	private async applyToFile(file: TFile, size: string | null, protectManual = false) {
		let count = 0;
		let skipped = 0;

		await this.app.vault.process(file, (data) => {
			const newline = data.includes('\r\n') ? '\r\n' : '\n';
			const result = transformLines(data.split(/\r?\n/), size, this.settings, {
				protectManualSizes: protectManual,
			});
			count = result.count;
			skipped = result.skipped;
			return result.lines.join(newline);
		});

		this.reportResult({ count, skipped }, size);
	}

	/** Turns a finished run into user feedback. */
	private reportResult(result: { count: number; skipped: number }, size: string | null) {
		const { msg } = this;

		if (result.count === 0) {
			new Notice(
				result.skipped > 0
					? msg.noticeAllProtected
					: size === null
						? msg.noticeNothingToClear
						: msg.noticeNothingToResize
			);
			return;
		}

		new Notice(
			size === null ? msg.noticeCleared(result.count) : msg.noticeResized(result.count, size)
		);

		if (result.skipped > 0) {
			new Notice(msg.noticeSkipped(result.skipped));
		}
	}
}

/**
 * Rewrites a whole note, skipping fenced code blocks and `%%` comments.
 */
export function transformLines(
	lines: string[],
	size: string | null,
	settings: ImageResizerSettings,
	options: TransformOptions = {}
): TransformResult {
	// Clearing sizes is a deliberate reset, so protection never applies to it.
	const protect = options.protectManualSizes === true && size !== null;

	let fenceChar: string | null = null;
	let fenceLength = 0;
	let count = 0;
	let skipped = 0;
	const output: string[] = [];

	for (const line of lines) {
		if (fenceChar !== null) {
			const closing = line.match(/^\s*(`{3,}|~{3,})/);
			if (closing && closing[1][0] === fenceChar && closing[1].length >= fenceLength) {
				fenceChar = null;
			}
			output.push(line);
			continue;
		}

		const opening = line.match(FENCE_RE);
		if (opening) {
			fenceChar = opening[1][0];
			fenceLength = opening[1].length;
			output.push(line);
			continue;
		}

		// Keep everything between two `%%` markers untouched.
		const parts = line.split('%%');
		for (let i = 0; i < parts.length; i += 2) {
			const rewritten = transformSegment(parts[i], size, settings, protect);
			parts[i] = rewritten.text;
			count += rewritten.count;
			skipped += rewritten.skipped;
		}
		output.push(parts.join('%%'));
	}

	return { lines: output, count, skipped };
}

/** Rewrites a chunk of text, leaving inline code spans untouched. */
function transformSegment(
	segment: string,
	size: string | null,
	settings: ImageResizerSettings,
	protect: boolean
): { text: string; count: number; skipped: number } {
	let count = 0;
	let skipped = 0;

	const pieces = splitInlineCode(segment).map((piece) => {
		if (piece.isCode) return piece.text;
		const rewritten = rewriteText(piece.text, size, settings, protect);
		count += rewritten.count;
		skipped += rewritten.skipped;
		return rewritten.text;
	});

	return { text: pieces.join(''), count, skipped };
}

/**
 * Splits a line into plain text and `inline code` pieces so that images
 * mentioned inside code spans are never modified.
 */
function splitInlineCode(line: string): { text: string; isCode: boolean }[] {
	const pieces: { text: string; isCode: boolean }[] = [];
	let buffer = '';
	let inCode = false;
	let ticks = '';

	for (let i = 0; i < line.length; ) {
		if (line[i] !== '`') {
			buffer += line[i];
			i++;
			continue;
		}

		let j = i;
		while (j < line.length && line[j] === '`') j++;
		const run = line.slice(i, j);

		if (!inCode) {
			pieces.push({ text: buffer, isCode: false });
			buffer = run;
			inCode = true;
			ticks = run;
		} else if (run.length === ticks.length) {
			buffer += run;
			pieces.push({ text: buffer, isCode: true });
			buffer = '';
			inCode = false;
		} else {
			buffer += run;
		}

		i = j;
	}

	pieces.push({ text: buffer, isCode: inCode });
	return pieces;
}

function rewriteText(
	text: string,
	size: string | null,
	settings: ImageResizerSettings,
	protect: boolean
): { text: string; count: number; skipped: number } {
	let count = 0;
	let skipped = 0;

	text = text.replace(WIKI_EMBED_RE, (match, inner: string) => {
		const pipe = inner.indexOf('|');
		const target = (pipe === -1 ? inner : inner.slice(0, pipe)).trim();
		if (!isImageTarget(target, settings)) return match;

		const existing = pipe === -1 ? '' : inner.slice(pipe + 1).trim();
		if (protect && isProtectedSize(existing)) {
			skipped++;
			return match;
		}

		const replacement = size === null ? `![[${target}]]` : `![[${target}|${size}]]`;
		if (replacement === match) return match;

		count++;
		return replacement;
	});

	if (settings.includeMarkdownImages) {
		text = text.replace(MARKDOWN_IMAGE_RE, (match, alt: string, url: string) => {
			if (!isImageTarget(url, settings)) return match;

			const separator = alt.indexOf('|');
			const label = separator === -1 ? alt : alt.slice(0, separator);
			const existing = separator === -1 ? '' : alt.slice(separator + 1).trim();

			if (protect && isProtectedSize(existing)) {
				skipped++;
				return match;
			}

			const replacement =
				size === null ? `![${label}](${url})` : `![${label}|${size}](${url})`;
			if (replacement === match) return match;

			count++;
			return replacement;
		});
	}

	return { text, count, skipped };
}

function isImageTarget(target: string, settings: ImageResizerSettings): boolean {
	const value = target.trim().replace(/^<|>$/g, '');
	if (value === '') return false;
	if (settings.skipExternalImages && isExternalUrl(value)) return false;

	const cleaned = value.split('#')[0].split('^')[0].split('?')[0];
	const dot = cleaned.lastIndexOf('.');
	if (dot === -1) return false;

	return IMAGE_EXTENSIONS.has(cleaned.slice(dot + 1).toLowerCase());
}

function isExternalUrl(value: string): boolean {
	return /^[a-z][a-z0-9+.-]*:\/\//i.test(value) || value.startsWith('data:');
}

/** Accepts `500` or `500x300`, returns `null` when invalid. */
export function normalizeSize(raw: string): string | null {
	const value = raw.trim().toLowerCase().replace(/\s+/g, '');
	if (/^\d+$/.test(value)) return value;
	if (/^\d+x\d+$/.test(value)) return value;
	return null;
}

/**
 * Sizes written by this plugin are multiples of 10, while the values you get
 * from dragging an image edge usually are not. A non-zero last digit is
 * therefore treated as a hand adjusted size.
 *
 * `500x37` counts as manual as well: any component with a non-zero last digit
 * is enough.
 */
export function isLikelyManualSize(size: string): boolean {
	return size.split('x').some((part) => {
		const value = Number.parseInt(part, 10);
		return Number.isFinite(value) && value % 10 !== 0;
	});
}

/** True when the existing `|` value is a size that looks hand adjusted. */
function isProtectedSize(existing: string): boolean {
	// Also covers `437x`, the "width only, keep the ratio" form.
	return SIZE_LIKE_RE.test(existing) && isLikelyManualSize(existing);
}

interface SizeDialogOptions {
	showProtection: boolean;
	protectionChecked: boolean;
}

class SizeInputModal extends Modal {
	private readonly msg: Messages;
	private readonly initial: string;
	private readonly options: SizeDialogOptions;
	private readonly onSubmit: (result: SizeDialogResult | null) => void;
	private protectManual: boolean;

	constructor(
		app: App,
		msg: Messages,
		initial: string,
		options: SizeDialogOptions,
		onSubmit: (result: SizeDialogResult | null) => void
	) {
		super(app);
		this.msg = msg;
		this.initial = initial;
		this.options = options;
		this.protectManual = options.protectionChecked;
		this.onSubmit = onSubmit;
	}

	onOpen() {
		const { contentEl, msg } = this;
		contentEl.createEl('h3', { text: msg.modalTitle });
		contentEl.createEl('p', {
			cls: 'image-resizer-hint',
			text: msg.modalHint,
		});

		const input = contentEl.createEl('input', {
			type: 'text',
			cls: 'image-resizer-input',
		});
		input.value = this.initial;
		window.setTimeout(() => {
			input.focus();
			input.select();
		}, 0);

		input.addEventListener('keydown', (event: KeyboardEvent) => {
			if (event.key === 'Enter') {
				event.preventDefault();
				this.submit(input.value);
			}
		});

		const presets = contentEl.createDiv({ cls: 'image-resizer-presets' });
		for (const preset of SIZE_PRESETS) {
			const button = presets.createEl('button', { text: preset });
			button.addEventListener('click', () => this.submit(preset));
		}

		if (this.options.showProtection) {
			new Setting(contentEl)
				.setClass('image-resizer-protect')
				.setName(msg.modalProtectLabel)
				.setDesc(msg.modalProtectDesc)
				.addToggle((toggle) =>
					toggle.setValue(this.protectManual).onChange((value) => {
						this.protectManual = value;
					})
				);
		}

		const actions = contentEl.createDiv({ cls: 'image-resizer-actions' });
		const clear = actions.createEl('button', {
			text: msg.modalClear,
			cls: 'image-resizer-clear',
			attr: { 'aria-label': msg.modalClearTooltip },
		});
		clear.addEventListener('click', () => this.submitClear());
		const cancel = actions.createEl('button', { text: msg.modalCancel });
		cancel.addEventListener('click', () => this.closeModal());
		const apply = actions.createEl('button', { text: msg.modalApply, cls: 'mod-cta' });
		apply.addEventListener('click', () => this.submit(input.value));
	}

	onClose() {
		this.contentEl.empty();
	}

	private submit(raw: string) {
		const size = normalizeSize(raw);
		if (size === null) {
			new Notice(this.msg.modalInvalid);
			return;
		}
		this.onSubmit({ action: 'apply', size, protectManual: this.protectManual });
		this.close();
	}

	private submitClear() {
		this.onSubmit({ action: 'clear' });
		this.close();
	}

	private closeModal() {
		this.onSubmit(null);
		this.close();
	}
}

class ImageResizerSettingTab extends PluginSettingTab {
	plugin: BatchImageResizerPlugin;

	constructor(app: App, plugin: BatchImageResizerPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display() {
		const { containerEl } = this;
		const { msg } = this.plugin;
		containerEl.empty();

		new Setting(containerEl)
			.setName(msg.settingLanguageName)
			.setDesc(msg.settingLanguageDesc)
			.addDropdown((dropdown) =>
				dropdown
					.addOption('auto', msg.settingLanguageAuto)
					.addOption('zh', '简体中文')
					.addOption('en', 'English')
					.setValue(this.plugin.settings.language)
					.onChange(async (value) => {
						this.plugin.settings.language = value as LanguageSetting;
						await this.plugin.saveSettings();
						this.plugin.refreshLabels();
						this.display();
					})
			);

		new Setting(containerEl)
			.setName(msg.settingDefaultSizeName)
			.setDesc(msg.settingDefaultSizeDesc)
			.addText((text) =>
				text
					.setPlaceholder('500')
					.setValue(this.plugin.settings.defaultSize)
					.onChange(async (value) => {
						this.plugin.settings.defaultSize = value.trim();
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName(msg.settingProtectName)
			.setDesc(msg.settingProtectDesc)
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.protectManualSizes)
					.onChange(async (value) => {
						this.plugin.settings.protectManualSizes = value;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName(msg.settingCheckboxDefaultName)
			.setDesc(msg.settingCheckboxDefaultDesc)
			.addDropdown((dropdown) =>
				dropdown
					.addOption('checked', msg.settingCheckboxChecked)
					.addOption('unchecked', msg.settingCheckboxUnchecked)
					.addOption('last', msg.settingCheckboxLast)
					.setValue(this.plugin.settings.checkboxDefault)
					.onChange(async (value) => {
						this.plugin.settings.checkboxDefault = value as CheckboxDefault;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName(msg.settingMarkdownName)
			.setDesc(msg.settingMarkdownDesc)
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.includeMarkdownImages)
					.onChange(async (value) => {
						this.plugin.settings.includeMarkdownImages = value;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName(msg.settingExternalName)
			.setDesc(msg.settingExternalDesc)
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.skipExternalImages)
					.onChange(async (value) => {
						this.plugin.settings.skipExternalImages = value;
						await this.plugin.saveSettings();
					})
			);
	}
}
