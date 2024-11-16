import { css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import type { Chip } from './chips/chip.js';
import { Component } from './component.js';
import { connectWire, element } from './editor.js';
import type { Wire } from './wire.js';
import { colorState } from './utils.js';
import { chipHeightScaling } from './static.js';

@customElement('sim-pin')
export class Pin extends Component {
	public static styles = css`
		:host {
			display: block;
			position: absolute;
			border-radius: 50%;
			width: 1em;
			height: 1em;
		}
	`;

	@property() public accessor state: boolean = false;

	public wires = new Set<Wire>();

	public constructor(
		public chip: Chip,
		/**
		 * Whether this pin is input for the chip
		 */
		public isInput: boolean,
		/**
		 * Whether this pin is at the top level (i.e. i/o for the chip being edited)
		 */
		public isTop: boolean = false
	) {
		super({ canMove: isTop });
		chip.pins.add(this);

		this.addEventListener('click', (e: MouseEvent) => {
			connectWire(this);
			e.stopPropagation();
		});
	}

	public override get x(): number {
		return this.offsets().x;
	}

	public override get y(): number {
		return this.offsets().y;
	}

	public set(state: boolean): void {
		this.state = state;
		this.Update();
	}

	public offsets() {
		const { left, top } = element.offset()!;
		const { x, y, width, height } = this.getBoundingClientRect();

		return {
			x: x - left + width / 2,
			y: y - top + height / 2,
		};
	}

	protected updated(_: Map<PropertyKey, unknown>): void {
		super.updated(_);
		this.style.backgroundColor = colorState(this.state);

		for (const wire of this.wires) {
			wire.requestUpdate();
		}

		if (this.isTop) {
			this.style[this.isInput ? 'left' : 'right'] = '-1.5em';
			this.style.top = 'calc(50% - 0.5em)';
			return;
		}

		const pins = this.isInput ? this.chip.inputs : this.chip.outputs;
		const index = pins.toArray().indexOf(this);

		this.style[this.isInput ? 'left' : 'right'] = '-0.5em';
		const offset = !(pins.size % 2) ? index * chipHeightScaling : index * chipHeightScaling;
		this.style.top = offset + 'em';
	}

	public Update(): void {
		if (this.isInput || this.isTop) {
			this.chip.Update();
		}
		if (this.isInput) return;
		for (const wire of this.wires) {
			wire.Update();
		}
	}

	public remove(): void {
		super.remove();
		this.chip.pins.delete(this);
		for (const wire of this.wires) {
			wire.remove();
		}
	}
}
