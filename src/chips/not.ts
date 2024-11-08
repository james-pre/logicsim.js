import { Chip } from '../chip.js';
import { Pin } from '../pin.js';

export class NOT extends Chip {
	public isBuiltin: boolean = true;

	public input = new Pin(this, true);

	public output = new Pin(this, false);

	public constructor() {
		super();
	}

	public update(): void {
		this.output.set(!this.input.state);
	}
}