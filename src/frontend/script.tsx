import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom";
import MonacoEditor, { MonacoDiffEditor } from 'react-monaco-editor';
import "./style.css";
import {runScript} from "./execscript";
import debounce from "lodash.debounce";

const runCode = debounce(runScript, 250, {
	trailing: true,
});

function App() {
	const [input, setInput] = useState(localStorage.getItem('input') || "");
	const [code, setCode] = useState(localStorage.getItem('code') || "");
	const [output, setOutput] = useState<string>();
	const [language, setLanguage] = useState<string>(localStorage.getItem('language')  || "javascript");
	const [expectedOut, setExpected] = useState<string>(localStorage.getItem('expectedOut') || "")
	const [[windowWidth, windowHeight], setDim] = useState([window.innerWidth, window.innerHeight]);
	const inputRef = React.useRef<MonacoEditor | null>();
	const codeRef = React.useRef<MonacoEditor | null>();
	const outputRef = React.useRef<MonacoDiffEditor | null>();


	useEffect(() => {
		localStorage.setItem("input", input);
	}, [input]);

	useEffect(() => {
		localStorage.setItem("language", language);
	}, [language]);

	useEffect(() => {
		localStorage.setItem("code", code);
	}, [code]);

	useEffect(() => {
		runCode(language, code, input)?.then(out => {
			setOutput(out);
		})
	}, [code, input, setOutput]);

	useEffect(() => {
		window.addEventListener('resize', (e) => {
			setDim([window.innerWidth, window.innerHeight]);
			if (inputRef.current) { inputRef.current?.editor?.layout();}
			if (codeRef.current) { codeRef.current?.editor?.layout(); }
			if (outputRef.current) { outputRef.current?.editor?.layout(); }
		})
	}, []);

	return (
		<div className="body">
			<div className="code-editor editor">
			<div className="status-bar input-editor-statusbar">
				<span>Code</span>
				<select value={language} onChange={(e) => {
					const lang = e.target.value;
					setLanguage(e.target.value);
				}}><option value="javascript">Javascript (Node.js)</option> <option value="python">Python</option></select>
			</div>
			<MonacoEditor ref={(ref) => {
					codeRef.current = ref;
				}} theme='vs-dark' value={code} language={language} onChange={(text) => {
					setCode(text);
				}} />
				</div>
				<div className="input-editor editor">
					<div className="status-bar input-editor-statusbar">Input File</div>
				<MonacoEditor ref={(ref) => {
					inputRef.current = ref;
				}} theme='vs-dark' value={input} language="plaintext" onChange={(text) => {
					setInput(text);
				}} />
				</div>
			<div className="output-editor editor">
				<div className="status-bar output-editor-statusbar">
					Actual/Expected Output
				</div>
				<MonacoDiffEditor ref={(ref) => {
					outputRef.current = ref;
				}} theme='vs-dark' language="plaintext" original={output}  value={expectedOut} onChange={(text) => {
					setExpected(text);
				}} />
			</div>
		</div>);
}

ReactDOM.render(<App />, document.getElementById('app'));

