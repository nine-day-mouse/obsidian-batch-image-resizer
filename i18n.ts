export type Lang = 'zh' | 'en';

/** `auto` follows whatever language Obsidian itself is using. */
export type LanguageSetting = 'auto' | Lang;

export interface Messages {
	ribbonTooltip: string;
	commandSetSize: string;
	commandClearSize: string;
	menuSetSize: string;
	menuClearSize: string;
	modalTitle: string;
	modalHint: string;
	modalApply: string;
	modalCancel: string;
	modalClear: string;
	modalClearTooltip: string;
	modalInvalid: string;
	modalProtectLabel: string;
	modalProtectDesc: string;
	noticeOpenNote: string;
	noticeNothingToResize: string;
	noticeNothingToClear: string;
	noticeSkipped: (count: number) => string;
	noticeAllProtected: string;
	noticeResized: (count: number, size: string) => string;
	noticeCleared: (count: number) => string;
	settingProtectName: string;
	settingProtectDesc: string;
	settingCheckboxDefaultName: string;
	settingCheckboxDefaultDesc: string;
	settingCheckboxChecked: string;
	settingCheckboxUnchecked: string;
	settingCheckboxLast: string;
	settingLanguageName: string;
	settingLanguageDesc: string;
	settingLanguageAuto: string;
	settingDefaultSizeName: string;
	settingDefaultSizeDesc: string;
	settingMarkdownName: string;
	settingMarkdownDesc: string;
	settingExternalName: string;
	settingExternalDesc: string;
}

export const STRINGS: Record<Lang, Messages> = {
	en: {
		ribbonTooltip: 'Resize all images in this note',
		commandSetSize: 'Set size for all images in current note',
		commandClearSize: 'Clear size for all images in current note',
		menuSetSize: 'Set size for all images',
		menuClearSize: 'Clear size for all images',
		modalTitle: 'Image size',
		modalHint: 'Width only (500) or width x height (500x300).',
		modalApply: 'Apply',
		modalCancel: 'Cancel',
		modalClear: 'Clear sizes',
		modalClearTooltip: 'Remove the size of every image in this note',
		modalInvalid: 'Enter a width like 500, or width x height like 500x300.',
		modalProtectLabel: 'Skip manually resized images',
		modalProtectDesc: 'A size not ending in 0 (e.g. 437) counts as manually adjusted.',
		noticeOpenNote: 'Open a Markdown note first.',
		noticeNothingToResize: 'No images to resize in this note.',
		noticeNothingToClear: 'No image sizes to remove in this note.',
		noticeSkipped: (count) =>
			`${count} ${count === 1 ? 'image was' : 'images were'} skipped (manually sized).`,
		noticeAllProtected: 'Nothing to change: every image already has a manual size.',
		noticeResized: (count, size) =>
			`Resized ${count} ${count === 1 ? 'image' : 'images'} to ${size}.`,
		noticeCleared: (count) =>
			`Removed the size of ${count} ${count === 1 ? 'image' : 'images'}.`,
		settingProtectName: 'Protect manually resized images',
		settingProtectDesc:
			'Ask before overwriting sizes that look manually adjusted. Keep "Default size" a multiple of 10, or the sizes this plugin writes will look manual too.',
		settingCheckboxDefaultName: 'Checkbox default',
		settingCheckboxDefaultDesc:
			'Initial state of the "skip manually resized images" checkbox in the dialog.',
		settingCheckboxChecked: 'Always checked',
		settingCheckboxUnchecked: 'Always unchecked',
		settingCheckboxLast: 'Remember last choice',
		settingLanguageName: 'Interface language',
		settingLanguageDesc:
			'Language used by this plugin. "Follow Obsidian" tracks the app language.',
		settingLanguageAuto: 'Follow Obsidian',
		settingDefaultSizeName: 'Default size',
		settingDefaultSizeDesc:
			'Pre-filled in the dialog. Width only (500) or width x height (500x300).',
		settingMarkdownName: 'Also resize Markdown images',
		settingMarkdownDesc:
			'Rewrite ![alt](image.png) as ![alt|500](image.png) in addition to wiki embeds.',
		settingExternalName: 'Skip external images',
		settingExternalDesc: 'Leave images pointing to http(s):// or data: URLs untouched.',
	},
	zh: {
		ribbonTooltip: '批量修改本笔记图片尺寸',
		commandSetSize: '设置当前笔记所有图片的尺寸',
		commandClearSize: '清除当前笔记所有图片的尺寸',
		menuSetSize: '设置所有图片的尺寸',
		menuClearSize: '清除所有图片的尺寸',
		modalTitle: '图片尺寸',
		modalHint: '只填宽度（500），或宽度 x 高度（500x300）。',
		modalApply: '应用',
		modalCancel: '取消',
		modalClear: '清除尺寸',
		modalClearTooltip: '去掉本笔记所有图片的尺寸',
		modalInvalid: '请输入宽度（如 500），或宽 x 高（如 500x300）。',
		modalProtectLabel: '跳过手动调整过的图片',
		modalProtectDesc: '个位数不是 0 的尺寸（如 437）视为手动调整。',
		noticeOpenNote: '请先打开一篇 Markdown 笔记。',
		noticeNothingToResize: '这篇笔记里没有需要修改尺寸的图片。',
		noticeNothingToClear: '这篇笔记里没有带尺寸的图片。',
		noticeSkipped: (count) => `另有 ${count} 张图片因已手动调整而跳过。`,
		noticeAllProtected: '没有需要修改的图片：它们都已经是手动调整过的尺寸。',
		noticeResized: (count, size) => `已将 ${count} 张图片的尺寸设为 ${size}。`,
		noticeCleared: (count) => `已清除 ${count} 张图片的尺寸。`,
		settingProtectName: '保护手动调整过的图片',
		settingProtectDesc:
			'改尺寸前询问是否跳过看起来是手动调整的图片。建议把「默认尺寸」保持为 10 的整数倍，否则插件自己写入的尺寸也会被当成手动调整。',
		settingCheckboxDefaultName: '勾选框默认状态',
		settingCheckboxDefaultDesc: '弹窗里「跳过手动调整过的图片」勾选框的初始状态。',
		settingCheckboxChecked: '固定打钩',
		settingCheckboxUnchecked: '固定不打钩',
		settingCheckboxLast: '记住上次的选择',
		settingLanguageName: '界面语言',
		settingLanguageDesc: '插件使用的语言。「跟随 Obsidian」会与主程序语言保持一致。',
		settingLanguageAuto: '跟随 Obsidian',
		settingDefaultSizeName: '默认尺寸',
		settingDefaultSizeDesc: '打开弹窗时预填的值。只填宽度（500），或宽度 x 高度（500x300）。',
		settingMarkdownName: '同时处理 Markdown 图片',
		settingMarkdownDesc: '除 wiki 嵌入外，把 ![alt](image.png) 也改写成 ![alt|500](image.png)。',
		settingExternalName: '跳过外部图片',
		settingExternalDesc: '不改动指向 http(s):// 或 data: 的图片。',
	},
};

/** Reads Obsidian's own language setting. */
export function detectLang(): Lang {
	const raw = window.localStorage.getItem('language') || navigator.language || 'en';
	return raw.toLowerCase().startsWith('zh') ? 'zh' : 'en';
}

export function resolveLang(setting: LanguageSetting): Lang {
	return setting === 'auto' ? detectLang() : setting;
}
