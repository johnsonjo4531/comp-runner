import React, { useState, useEffect, useCallback } from "react";
import ReactDOM from "react-dom";
import "./style.css"
import { runScript } from "./execscript";
import debounce from "lodash.debounce";
import { GridResizeHandler } from "./Resizer";
import ReactAnsi from 'react-ansi';
import MonacoEditor from "./MonacoEditor";

const runCode = debounce(runScript, 1000, {
	leading: true,
});

export type KnownLanguages = 'python' | 'javascript' | 'deno'
export type MonacoKnownLanguages = 'python' | 'javascript' | 'typescript'
const languageMap = new Map<KnownLanguages, MonacoKnownLanguages>([
	["deno", "typescript"],
	["javascript", "javascript"],
	['python', "python"]
])

const noop = () => { };

function getState<T>(state: T | (() => T)): T {
	return state instanceof Function ? state() : state;
}
function getSetStateAction<T>(state: React.SetStateAction<T>, prevState: T): T {
	return state instanceof Function ? state(prevState) : state;
}
type F = React.SetStateAction <number>
type KnownOutputFormats = "diff-editor" | "ansi-html"
const outputFormats = new Set<KnownOutputFormats>(["ansi-html", "diff-editor"]);

function extractedSetter<T>(...params: Parameters<IUseLocalState<T>>) {
	const [key, initialState, { deserialize, serialize = (x: T) => "" + x }] = params;
	return (): T => {
		const possibleInit = localStorage.getItem(key)
		const newState = possibleInit ? deserialize(possibleInit) : getState(initialState);
		localStorage.setItem(key, serialize(newState));
		return newState;
	}
}

	
interface IUseLocalState<T> {
	(key: string, initialState: T | (() => T), {deserialize, serialize }: {deserialize: (fromLocalStorage: string) => T, serialize?: (toLocalStorageValue: T) => string }): [T, React.Dispatch<React.SetStateAction<T>>]
}

/**
* 
* @param key 
* @param initialState 
* @param param2 
* @returns []
*/
function useLocalState<T>(...params: Parameters<IUseLocalState<T>>): ReturnType<IUseLocalState<T>> {
	const [key, initialState, { deserialize, serialize = (x: T) => "" + x}] = params;
	const [prevState, setState] = useState(extractedSetter(...params));
	useEffect(() => {
		setState(deserialize(localStorage.getItem(key) ?? ""));
	}, [key, setState]);
	useEffect(() => {
		localStorage.setItem(key, serialize(prevState));
	}, [key, prevState]);
	return [prevState, setState]
}

function App() {
	const [output, setOutput] = useState("");
	const [language, setLanguage] = useLocalState<KnownLanguages>('language', "javascript", {
		deserialize: x => x as any
	});
	const [input, setInput] = useLocalState('input', "", {
		deserialize: x => x
	});
	const [code, setCode] = useLocalState(`code-${language}`, "", {
		deserialize: x => x
	});
	const [outputFormat, setOutputFormat] = useLocalState<KnownOutputFormats>('outputFormat', "diff-editor", {
		deserialize: x => x as any
	});
	const [autoRun, setAutoRun] = useLocalState("auto-run", true, {
		deserialize: x => x !== "false"
	});
	const [expectedOut, setExpected] = useLocalState('expectedOut', "", {
		deserialize: x => x
	})

	useEffect(() => {
		const handler = (e: KeyboardEvent) => {
			if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
				runCode(language, code, input, {
					colors: outputFormat === "ansi-html"
				})?.then(out => {
					setOutput(out);
				})
			}
		};
		window.removeEventListener("keydown", handler)
		window.addEventListener('keydown', handler);
		return () => {
			window.removeEventListener('keydown', handler);
		}
	}, [language, code, input, outputFormat, setOutput])

	useEffect(() => {
		if (!autoRun) {
			return;
		}
		runCode(language, code, input, {
			colors: outputFormat === "ansi-html"
		})?.then(out => {
			setOutput(out);
		})
	}, [code, input, language, outputFormat, autoRun, setOutput]);

	return (
		<div className="app-comp-runner">
			<div className="code-editor editor">
				<MonacoEditor options={{ theme: "dark" }} value={code} language={languageMap.get(language)} onChange={(editor) => {
					setCode(editor.getValue());
				}} />
				<GridResizeHandler dir="ns" align="bottom" minLength={5} unitLength="vw/vh" className="status-bar input-editor-statusbar">
					<div>
						Code
					</div>
					<div className="controls">
						<div>
							<span>Language: </span>
							<select value={language} onChange={(e) => {
								setLanguage(e.target.value as KnownLanguages);
							}}><option value="javascript">Javascript (Node.js)</option> <option value="python">Python</option> <option value="deno">Deno (TypeScript)</option></select>
						</div>
						<div>
							<span>Output: </span>
							<select value={outputFormat} onChange={(e) => {
								setOutputFormat(e.target.value as KnownOutputFormats);
								}}>{[...outputFormats].map(x => <option value={x} key={x}>{x}</option>)}</select>
						</div>
						<div>
							<span>Auto Run: </span>
							<input type="checkbox" checked={autoRun} onChange={(e) => {
								setAutoRun(e.target.checked);
							}} />
						</div>
					</div>
			</GridResizeHandler>
			</div>
			<div className="input-editor editor">
				<div className="status-bar input-editor-statusbar">Input File</div>
				<MonacoEditor options={{
					theme: "vs-dark"
				}} value={input} language="plaintext" onChange={(editor) => {
					setInput(editor.getValue());
				}} />
				<GridResizeHandler className="right-aligned-resizer" dir="ew" align="right" minLength={5} unitLength={"vw/vh"}/>
			</div>
			<div className="output-editor editor">
				<div className="status-bar output-editor-statusbar">
					{outputFormat === "diff-editor" && "Actual/Expected"} Output
				</div>
				{outputFormat === "diff-editor" ? <MonacoEditor type="diff" options={{
					theme: "vs-dark"
				}} language="plaintext" original={output} value={expectedOut} onChange={(editor) => {
					setExpected(editor.getModifiedEditor().getValue())
				}} /> : outputFormat === "ansi-html" ? (
					<div style={{
						backgroundColor: "#1e1e1e",
						padding: "1em",
						height: '100%',
						maxHeight: "100%",
						boxSizing: "border-box",
						color: "#efefef",
						fontSize: '0.75em',
						wordWrap: 'break-word',
						overflowY: 'scroll'
					}}><ReactAnsi log={output}>{({ errors, hasError }) => (hasError && <div>{errors}</div>) as any}</ReactAnsi></div>
				) : null}
			</div>
		</div>);
}

ReactDOM.render(<App />, document.getElementById('app'));

