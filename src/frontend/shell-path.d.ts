declare module 'shell-path' {
	type ShellPath = () => Promise<string>;
	const shellPath: ShellPath;
	export default shellPath;
}
