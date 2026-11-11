/** Ссылки из раздела «Источники» заметки исследования в формате markdown. */
export function sourcesFromNote(note: string): string[]

/** Создаёт заготовку темы: три файла с метками TODO и отметку content: true в дереве. */
export function scaffoldTopic(options: { contentRoot: string; docsRoot: string; id: string; now?: Date }): Promise<{ topicId: string; files: string[]; warnings: string[] }>
