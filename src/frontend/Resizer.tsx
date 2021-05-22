import React, { PropsWithChildren, useCallback } from "react";
import "./Resizer.css";
console.clear();

function* doubles<T>(nums: T[]): Generator<[T, T]> {
	for (let i = 0; i < nums.length - 1; ++i) {
		yield [nums[i], nums[i + 1]];
	}
}

function areasFromGridLines(gridLines: number[]) {
	return [...doubles(gridLines)].map(([start, end], i) => end - start);
}

function gridLinesFromAreas(areas: number[]) {
	return [...areas].reduce(
		(newArr, area, i, arr) => {
			return [...newArr, newArr[i] + area];
		},
		[0]
	);
}

function gridDataSetup(
	resize: "ns" | "ew",
	styles: { gridTemplateRows: string; gridTemplateColumns: string }
) {
	// setup data
	const gridTemplateProp =
		resize === "ns" ? "gridTemplateRows" : ("gridTemplateColumns" as const);
	const { [gridTemplateProp]: gridTemplates } = styles;
	const areas = gridTemplates
		.replace(/[^\d\s.]/g, "")
		.split(/\s+/)
		.map(Number);
	return {
		gridLines: gridLinesFromAreas(areas),
		areas,
		gridTemplateProp
	} as const;
}

// given a dim value and gridlines find the closest gridline
function closestGridline(newDim: number, gridLines: number[]) {
	let minIdx = -1,
		min = Infinity;
	for (let i = 1; i < gridLines.length - 1; ++i) {
		const line = gridLines[i];
		if (Math.abs(newDim - line) < min) {
			min = Math.abs(newDim - line);
			minIdx = i;
		}
	}
	return minIdx;
}

// change the gridline position to a newDim
function changeGridLines(gridLines: number[], idx: number, newDim: number) {
	const newGridLines = [...gridLines];
	newGridLines[idx] = newDim;

	return newGridLines;
}

function boundGridLinesByMin(gridLines: number[], dir: number, minDim: number) {
	const gridlines = [...gridLines];
	if (dir >= 1) {
		gridlines.reverse();
	}
	for (let i = 1; i < gridlines.length - 1; ++i) {
		if (Math.abs(gridlines[i - 1] - gridlines[i]) < minDim) {
			gridlines[i] =
				gridlines[i] -
				dir * Math.abs(minDim - Math.abs(gridlines[i - 1] - gridlines[i]));
		}
	}
	if (dir >= 1) {
		gridlines.reverse();
	}
	return gridlines;
}

// compute new areas from newDim gridlines and minDim
function newAreas(
	newDim: number,
	gridlines: number[],
	targetIdxs: number[],
	mainTargetIdx: number,
	minDim: number,
	unitConverter: (px: number) => number
) {
	const areas = areasFromGridLines(
		boundGridLinesByMin(
			targetIdxs
				.reduce(
					(newGridLines: number[], targetIdx: number) =>
						changeGridLines(newGridLines, targetIdx, newDim),
					gridlines
				)
				.map(unitConverter),
			Math.sign(newDim - gridlines[mainTargetIdx]),
			minDim
		)
	);
	return areas;
}

const fromPxToUnit = (
	outUnit: "%" | "vw/vh" | "px",
	dir: "ns" | "ew",
	el: HTMLElement
) =>
	function fromPxToUnit(px: number) {
		if (outUnit === "%") {
			const num =
				(100 * px) /
				Number(
					el[
					dir === "ns" ? ("clientHeight" as const) : ("clientWidth" as const)
					]
				);
			return num;
		} else if (outUnit === "vw/vh") {
			const num =
				(100 * px) /
				window[
				dir === "ns" ? ("innerHeight" as const) : ("innerWidth" as const)
				];
			return num;
		} else {
			return px;
		}
	};

function gridResize(
	gridEl: HTMLElement | undefined | null,
	dir: "ew" | "ns",
	[x, y]: [number, number],
	minDim: number = 0,
	targetIdx: number,
	out: "px" | "%" | "vw/vh" = "px",
	keepOuterCoords = true
) {
	if (!gridEl) return;
	const newDim = dir === "ns" ? y : x;
	const styles = window.getComputedStyle(gridEl);
	const { gridTemplateProp, gridLines } = gridDataSetup(dir, styles);
	const unitConverter = fromPxToUnit(out, dir, gridEl);
	const dimLength = unitConverter(
		dir === "ns" ? gridEl.clientHeight : gridEl.clientWidth
	);
	const targetIdxs = gridLines
		.slice(1, -1)
		.map((x, i, arr) => {
			const tIdx = targetIdx - 1;
			// console.log(
			//   i,
			//   tIdx === i,
			//   Math.abs(x - arr[tIdx]) <= 10 + minDim,
			//   Math.sign(newDim - arr[tIdx]),
			//   Math.sign(newDim - x),
			//   tIdx === i ||
			//     (unitConverter(Math.abs(x - arr[tIdx])) <= minDim &&
			//       Math.sign(newDim - arr[tIdx]) === Math.sign(x - arr[tIdx]) &&
			//       Math.sign(newDim - arr[tIdx]) === Math.sign(newDim - x))
			// );
			if (
				tIdx === i ||
				(unitConverter(Math.abs(x - arr[tIdx])) <= minDim &&
					Math.sign(newDim - arr[tIdx]) === Math.sign(x - arr[tIdx]) &&
					Math.sign(newDim - arr[tIdx]) === Math.sign(newDim - x))
			) {
				return i + 1;
			}
			return -1;
		})
		.filter((x) => x >= 0);
	let areas = newAreas(
		newDim,
		gridLines,
		targetIdxs,
		targetIdx,
		minDim,
		unitConverter
	);
	if (keepOuterCoords) {
		const sum = areas.reduce((a, b) => a + b, 0);
		const remainingDim = dimLength - sum;
		areas = areas.map((x, i, arr) => (x += remainingDim / arr.length));
	}
	gridEl.style[gridTemplateProp] = areas
		.map((x) => {
			if (out === "%") {
				return "" + x + "%";
			} else if (out === "vw/vh") {
				return "" + x + "v" + (dir === "ns" ? "h" : "w");
			} else {
				return "" + x + "px";
			}
		})
		.join(" ");
	return {
		gridEl,
		areas,
		newDim,
		unitConverter,
		dir
	};
}

function computeClosestGridLine(
	gridEl: HTMLElement | undefined | null,
	dir: "ew" | "ns",
	[x, y]: [number, number]
) {
	if (!gridEl) {
		return;
	}
	const newDim = dir === "ns" ? y : x;
	const styles = window.getComputedStyle(gridEl);
	const idx = closestGridline(newDim, gridDataSetup(dir, styles).gridLines);
	return idx;
}

function findClosestGrid(
	el: HTMLElement | null | undefined
): HTMLElement | null | undefined {
	return el === null ||
		el === undefined ||
		getComputedStyle(el).display === "grid"
		? el
		: findClosestGrid(el?.parentElement);
}

export function GridResizeHandler<
	Dir extends "ew" | "ns",
	Align extends Dir extends "ew" ? "left" | "right" : "top" | "bottom"
>({
	dir,
	gridElement,
	align,
	minLength,
	unitLength,
	onResize,
	...props
}: PropsWithChildren<
	{
		gridElement?: HTMLElement;
		dir: Dir;
		align: Align;
		unitLength: "%" | "vw/vh" | "px";
		minLength?: number;
		onResize?: (gridResizeData: {
			gridEl: HTMLElement;
			areas: number[];
			newDim: number;
			unitConverter: ReturnType<typeof fromPxToUnit>;
			dir: Dir;
		}) => void;
	} & React.DetailedHTMLProps<
		React.HTMLAttributes<HTMLDivElement>,
		HTMLDivElement
	>
>) {
	const [dragIdx, setDragIdx] = React.useState<number>(-1);
	const handlerRef = React.useRef<HTMLDivElement | null>(null);

	React.useEffect(() => {
		const handler = (e: any) => {
			if(!handlerRef.current) {
				return;
			}
			if (dragIdx && dragIdx >= 0) {
				let gridEl;
				if (!gridElement) {
					gridEl = findClosestGrid(handlerRef.current);
					if (!gridEl) {
						return;
						// throw new Error(
						// 	"You must make a `display: grid` element as an ancestor of the GridResizeHandler!"
						// );
					}
				}
				const resizeData = gridResize(
					gridElement || gridEl,
					dir,
					[e.clientX, e.clientY],
					minLength,
					dragIdx,
					unitLength
				);
				if (resizeData && onResize) {
					onResize({ ...resizeData, dir });
				}
			}
		};

		const mouseUpHandler = (e: any) => {
			setDragIdx(-1);
			const gridEl = gridElement || findClosestGrid(handlerRef.current);
			if (!gridEl) {
				throw new Error(
					"GridResizeHandler must be contained in a grid element"
				);
			}
		};

		window.addEventListener("mousemove", handler);
		window.addEventListener("mouseup", mouseUpHandler);
		window.addEventListener("mouseup", mouseUpHandler);
		return () => {
			window.removeEventListener("mouseup", mouseUpHandler);
			window.removeEventListener("mousemove", handler);
			window.removeEventListener("mouseup", mouseUpHandler);
		};
	}, [dragIdx, dir, minLength, onResize, unitLength, gridElement, handlerRef.current]);

	React.useEffect(() => {
		if (!handlerRef.current) return;
		let gridEl: HTMLElement | null | undefined = gridElement;
		if (!gridElement) {
			gridEl = findClosestGrid(handlerRef.current);
			if (!gridEl) {
				return;
				// throw new Error(
				// 	"You must make a `display: grid` element as an ancestor of the GridResizeHandler!"
				// );
			}
		}
		gridEl?.classList.toggle("resize-grid", true);
	}, [gridElement, handlerRef.current]);

	const cb = useCallback(
		(e) => {
			const gridEl = findClosestGrid(e.target as HTMLElement);
			if (!gridEl) {
				return;
			}
			const dragIdx = computeClosestGridLine(gridEl, dir, [
				e.clientX,
				e.clientY
			]);
			if (!dragIdx) {
				return;
			}
			setDragIdx(dragIdx);
		},
		[dir]
	);

	return (
		<div
			{...props}
			ref={handlerRef}
			onMouseDown={cb}
			onMouseUp={() => setDragIdx(-1)}
			className={`grid-resize-align-${align}` + " " + props.className}
			data-resize={dir}
		>
			{props.children}
		</div>
	);
}
