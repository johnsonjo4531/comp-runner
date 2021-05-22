import { spawn } from 'child_process';
import tempPath from 'temp-dir';
import { lookpath } from 'lookpath';
import shellPath from 'shell-path';
import { transform } from "@babel/core";
import { KnownLanguages } from './script';
import { createWriteStream } from "fs";
import { join } from 'path';
import decolorify from 'strip-ansi';
import { promisify } from "util";

export type KnownCommands = 'python' | 'node' | 'deno'
const langMap = new Map<KnownLanguages, KnownCommands>(
	[
		["python", 'python'],
		["javascript", 'node'],
		['deno', 'deno']
	]
);

// the path of the given executable will be set during execution programmatically.
const pathMap = new Map<KnownCommands, string>([
	["python", ''],
	["node", ''],
	["deno", '']
]);

const getOptions = new Map<KnownCommands, string[]>([
	["python", ['$FILE']],
	["node", ['$FILE']],
	["deno", ['run', '-q', '$FILE']]
]);

type KnownExtensions = ".ts" | ".js" | ".py";
const extensions = new Map<KnownLanguages, KnownExtensions>([
	["deno", ".ts"],
	['javascript', '.js'],
	['python', '.py'],
])

const pathMappingGetter = (async () => {
	for (const command of pathMap.keys()) {
		let cmdPath = await lookpath(command);
		if (!cmdPath) {
			// we are probably in MacOS because it doesn't load the path for GUI programs
			try {
				cmdPath = await lookpath(command, { include: await (await shellPath()).split(":") });
			} catch (err) {
				console.error(err);
			}
		}
		if (cmdPath) {
			pathMap.set(command, cmdPath);
		}
	}
})();

export function runScript(lang: KnownLanguages, script: string, input: string, {
	colors = false
}: {colors?: boolean} = {}): Promise<string> {
	return new Promise(async (res, rej) => {
		const scriptFilePath = join(`${"" + tempPath}`, `script${"" + extensions.get(lang)}`);
		const scriptFile = createWriteStream(scriptFilePath, "utf8");
		scriptFile.write(`${"" + script}\n\n`);
		scriptFile.end(async () => {
			const command = langMap.get(lang);
			if (!command) {
				return res("Unknown language chosen.")
			}
			await pathMappingGetter;
			const cmdPath = pathMap.get(command);
			if (!cmdPath) {
				return res("Could not find command " + command?.toString() + " in Path.");
			}
			let child!: ReturnType<typeof spawn>;
			const options = getOptions.get(command);
			if (!options) {
				return
			}
			const finalOpts = options.map(x => {
				return x === "$FILE" ? scriptFilePath : x;
			})
			child = spawn(cmdPath, finalOpts);

			child.stdin?.write((input));
			child.stdin?.end();

			setTimeout(() => {
				child.stdin?.end();
				child.kill();
				res("Error timedout: script took longer than 10 seconds to run.");
			}, 10000)

			let text: string = "";
			child.stdout?.setEncoding('utf8');
			child.stdout?.on('data', (chunk: string) => {
				text += chunk;
			});

			// TODO: later I'll handle stderr this but ignore for now 
			child.stderr?.setEncoding("utf8");
			child.stderr?.on('data', (err) => {
				if (err) {
					text += err;
				}
			});

			child.on('close', (code: string) => {
				const output = `${"" + text.replace(/\n+$/g, '')}`;
				res(colors ? output : decolorify(output));
			});
		})
	});
}
