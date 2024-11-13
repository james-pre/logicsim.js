/* Static data structures and functions. These are used for serialization */

export interface WireData {
	/**
	 * From sub-chip index, pin no.
	 */
	from: [number, number];
	/**
	 * To sub-chip index, pin no.
	 */
	to: [number, number];

	/**
	 * [x, y] list
	 */
	anchors: [number, number][];
}

export interface SubChip {
	kind: string;
	x: number;
	y: number;
}

export interface ChipData {
	id: string;
	name: string;
	chips: SubChip[];
	wires: WireData[];
}

export interface EditorState {
	input: (0 | 1)[];
}

export interface ProjectFile {
	version: number;
	file: 'project';
	name: string;
	editor: ChipData;
	state: EditorState;
	chips: ChipData[];
}

export interface ChipFile {
	version: number;
	file: 'chip';
	chip: ChipData;
}

export type FileData = ProjectFile | ChipFile;

export const version = 0;