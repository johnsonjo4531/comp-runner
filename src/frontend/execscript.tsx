import {spawn} from 'child_process';
import {remote} from 'electron';
import { lookpath } from 'lookpath';

type KnownCommands = 'python' | 'node'
const langMap = new Map<string, KnownCommands>(
	[
		["python", 'python'],
		["javascript", 'node'],
	]
);

export function runScript (lang: string, script: string, input: string): Promise<string> {
	return new Promise(async (res, rej) => {
		if(!langMap.has(lang)) {
			return res("Wrong command should be node or python")
		}
		const command: KnownCommands = langMap.get(lang) as KnownCommands;
		const cmdPath = await lookpath(command);
		if(!cmdPath) {
			return res('No path for node found!')
		}
		let child: ReturnType<typeof spawn>;
		if(command === 'python') {
			child = spawn(cmdPath, ['-c', script.replace(/\n*$/, "\n\n")]);
		} else if (command === 'node') {
			child = spawn(cmdPath, ['-e', script.replace(/\n*$/, "\n\n")]);
		} else {
			return res("Unknown command");
		}
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
			if(err) {
				text += err;
			}
		});

		child.on('close', (code: string) => {
			res(`${""+text.replace(/\n+$/g, '')}`);
		});
	});
}
type ArrayDropFirst<T extends any[]> = T extends [any, ...infer P] ? P : never;