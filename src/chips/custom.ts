import { Pin } from '../pin.js';
import type { ChipData } from '../static.js';
import { Chip, chips, type ChipLike, type ChipMetadata } from './chip.js';

export class CustomChip extends Chip {
	declare ['constructor']: ChipMetadata & typeof Chip & { data: ChipData };

	public constructor() {
		super();

		for (const chip of this.constructor.data.chips) {
			if (chip.kind == 'input' || chip.kind == 'output') {
				new Pin(this, chip.kind == 'input', false);
			}
		}
	}

	public Update(): void {
		const inputs = this.inputs.toArray().map(input => input.state);

		const out_values = chip_eval(this.constructor.id, inputs);

		const out_pins = this.outputs;

		for (let i = 0; i < out_pins.size; i++) {
			out_pins.at(i).set(out_values[i]);
		}
	}
}

export function chip_eval(kind: string, input_values: boolean[], _debug: boolean = false): boolean[] {
	const chip = chips.get(kind);

	if (!chip) throw 'Chip does not exist: ' + kind;

	if (chip.eval) {
		const out = chip.eval(input_values);
		if (_debug) console.debug('[chip_eval] (static)', kind, input_values, out);
		return out;
	}

	if (chip.builtin) {
		throw 'Built-in chip can not be dynamically evaluated: ' + kind;
	}

	if (_debug) console.group('[chip_eval] (dynamic)', kind, input_values);

	// Dynamic eval for custom chips

	const { data } = chip as ChipMetadata & ChipLike & { data: ChipData };

	if (!data) throw 'Custom chip data missing: ' + kind;

	const subChips: Map<number, boolean[]> = new Map();
	const output_values: boolean[] = new Array(data.chips.length).fill(false) as boolean[];
	const evaluatedSubChips: Set<number> = new Set();

	// Identify input and output sub-chips
	const inputIndices = new Set<number>();
	const outputIndices = new Set<number>();

	for (const [i, subChip] of data.chips.entries()) {
		if (subChip.kind === 'input') {
			inputIndices.add(i);
		} else if (subChip.kind === 'output') {
			outputIndices.add(i);
		}
	}
	if (_debug) console.debug(inputIndices.size, 'inputs,', outputIndices.size, 'outputs');

	// Rule validation
	for (const wire of data.wires) {
		if (inputIndices.has(wire.to[0])) {
			throw new Error(`Invalid wire configuration: Input chip at index ${wire.to[0]} appears in 'to' field of a wire.`);
		}
		if (outputIndices.has(wire.from[0])) {
			throw new Error(`Invalid wire configuration: Output chip at index ${wire.from[0]} appears in 'from' field of a wire.`);
		}
	}

	// Initialize inputs for "input" kind sub-chips, allowing multiple inputs
	for (const [i, value] of input_values.entries()) {
		if (data.chips[i]?.kind == 'input') {
			if (_debug) console.debug('init input', i);
			const chipInputs = subChips.get(i) || [];
			chipInputs.push(value);
			subChips.set(i, chipInputs);
		}
	}

	// Process wires to propagate values
	let currentSubChips = new Set<number>(Array.from(inputIndices));

	let depth = 0;

	while (currentSubChips.size > 0) {
		const nextSubChips = new Set<number>();

		if (_debug) console.group('depth', depth);

		for (const i of currentSubChips) {
			const inputs = subChips.get(i) || [];

			// Step 5b: Throw error if the sub-chip has already been evaluated
			if (evaluatedSubChips.has(i) && !chips.get(data.chips[i].kind)?.builtin) {
				throw `Invalid chip evaluation flow: sub-chip at index ${i} has already been evaluated.`;
			}

			// Step 5a: Throw error if the sub-chip is of kind "input"
			if (data.chips[i].kind === 'input') {
				console.warn(`chip evaluation flow: sub-chip at index ${i} is an "input" chip.`);
			}

			// Evaluate the sub-chip outputs and store results
			const subOutputs = chip_eval(data.chips[i].kind, inputs);
			evaluatedSubChips.add(i);

			// Step 5c: Check if the sub-chip is an "output" chip
			if (data.chips[i].kind == 'output') {
				if (_debug) console.debug('set output', i, 'to', subOutputs[0]);
				output_values[i] = subOutputs[0];
			} else {
				// Step 5d: Store evaluated sub-chip's outputs and mark for further propagation
				subChips.set(i, subOutputs);
				nextSubChips.add(i);
			}

			// Propagate output through wires to other sub-chips
			for (const wire of data.wires) {
				if (wire.from[0] != i) continue;
				const toChipInputs = subChips.get(wire.to[0]) || [];
				toChipInputs[wire.to[1]] = subOutputs[wire.from[1]];
				subChips.set(wire.to[0], toChipInputs);
				nextSubChips.add(wire.to[0]);
				if (_debug) console.debug('update', wire);
			}
		}

		if (_debug) console.debug('evaled', [...currentSubChips].join(','), 'next', [...nextSubChips].join(','));

		// Move to the next layer of sub-chips to evaluate
		currentSubChips = nextSubChips;
		depth++;

		if (_debug) console.groupEnd();
	}

	if (_debug) {
		console.debug(output_values);
		console.groupEnd();
	}
	return output_values;
}
