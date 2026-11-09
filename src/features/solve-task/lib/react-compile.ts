/**
 * Сборка React-задачи: TSX → JavaScript компилятором TypeScript 6 плюс защита от бесконечных циклов.
 *
 * Код задачи выполняется в iframe в основном потоке страницы, и остановить его по таймеру нельзя.
 * Поэтому в каждый цикл вставляется счётчик: после миллиона повторов цикл бросает ошибку.
 * Модуль не импортирует TypeScript сам: компилятор передаётся снаружи (воркер или тесты).
 */
import type * as TS from 'ts6'

type Ts = typeof TS

export const LOOP_LIMIT = 1_000_000
export const LOOP_ERROR = `Цикл повторился больше ${LOOP_LIMIT.toLocaleString('ru-RU')} раз и был остановлен — похоже на бесконечный цикл.`

/** Функция, которую вызывает защита цикла. Передаётся в область видимости выполняемого кода. */
export function loopLimit(): never {
  throw new Error(LOOP_ERROR)
}

function loopGuard(ts: Ts): TS.TransformerFactory<TS.SourceFile> {
  return (context) => {
    const { factory } = context

    /** Цикл со счётчиком в начале тела и объявление этого счётчика. */
    function guard(loop: TS.IterationStatement): [TS.Statement, TS.IterationStatement] {
      const counter = factory.createUniqueName('__loops')
      // if (++__loops > LIMIT) __loopLimit()
      const check = factory.createIfStatement(
        factory.createBinaryExpression(factory.createPrefixIncrement(counter), ts.SyntaxKind.GreaterThanToken, factory.createNumericLiteral(LOOP_LIMIT)),
        factory.createExpressionStatement(factory.createCallExpression(factory.createIdentifier('__loopLimit'), undefined, [])),
      )
      const body = factory.createBlock([check, ...(ts.isBlock(loop.statement) ? loop.statement.statements : [loop.statement])], true)
      const guarded = ts.isWhileStatement(loop)
        ? factory.updateWhileStatement(loop, loop.expression, body)
        : ts.isDoStatement(loop)
          ? factory.updateDoStatement(loop, body, loop.expression)
          : ts.isForStatement(loop)
            ? factory.updateForStatement(loop, loop.initializer, loop.condition, loop.incrementor, body)
            : ts.isForOfStatement(loop)
              ? factory.updateForOfStatement(loop, loop.awaitModifier, loop.initializer, loop.expression, body)
              : factory.updateForInStatement(loop as TS.ForInStatement, (loop as TS.ForInStatement).initializer, (loop as TS.ForInStatement).expression, body)
      const declaration = factory.createVariableStatement(
        undefined,
        factory.createVariableDeclarationList([factory.createVariableDeclaration(counter, undefined, undefined, factory.createNumericLiteral(0))], ts.NodeFlags.Let),
      )
      return [declaration, guarded]
    }

    const visit = (node: TS.Node): TS.Node => {
      // У цикла с меткой счётчик объявляется перед меткой: иначе `continue outer` перестал бы видеть свой цикл.
      if (ts.isLabeledStatement(node) && ts.isIterationStatement(node.statement, false)) {
        const [declaration, loop] = guard(ts.visitEachChild(node.statement, visit, context))
        return factory.createBlock([declaration, factory.updateLabeledStatement(node, node.label, loop)], true)
      }
      const visited = ts.visitEachChild(node, visit, context)
      if (!ts.isIterationStatement(visited, false)) return visited
      return factory.createBlock(guard(visited), true)
    }
    return (file) => ts.visitNode(file, visit) as TS.SourceFile
  }
}

export interface CompileResult {
  code?: string
  error?: string
}

/**
 * Код решения, тесты и предпросмотр собираются в один модуль CommonJS:
 * `import { useState } from 'react'` превращается в require, который подставляет среда выполнения.
 * Предпросмотр — JSX-выражение, оно попадает в exports.__licPreview.
 */
export function compileReact(ts: Ts, code: string, tests: string, preview?: string): CompileResult {
  const source = `${code}\n;\n${tests}\n${preview ? `;exports.__licPreview = () => (${preview});\n` : ''}`
  const output = ts.transpileModule(source, {
    fileName: 'task.tsx',
    reportDiagnostics: true,
    compilerOptions: {
      jsx: ts.JsxEmit.React,
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.CommonJS,
      esModuleInterop: true,
    },
    transformers: { before: [loopGuard(ts)] },
  })
  // С reportDiagnostics список есть всегда.
  const errors = output.diagnostics!
  if (errors.length) {
    const first = errors[0]
    const line = first.file!.getLineAndCharacterOfPosition(first.start!).line + 1
    return { error: `Синтаксическая ошибка, строка ${line}: ${ts.flattenDiagnosticMessageText(first.messageText, '\n')}` }
  }
  return { code: output.outputText }
}
