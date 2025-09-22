class MirroredMap extends Map {										// Extends the built-in Map class
	get Class() { return MirroredMap; }								// Returns the class itself

	static #privateSymbol = Symbol('MirroredMap');					// Private symbol for internal use, it MUST remain internal to the class.
	static #mirrorMapCheck = Symbol('MirroredMapCheck');			// Private check symbol storage, but the symbol is public.
	static get symbol() { return this.#mirrorMapCheck; }			// Static getter for the check symbol. This way the symbol is RO
	#proxies = [];													// Private array to store proxy instances.
	get mirror() { return this.#proxies.at(-1); }					// Returns the last proxy in the array.
	set mirror(proxy) {												// Setter for the mirror property.
		if(proxy === undefined) return this.#proxies.length > 1 ? this.#proxies.pop() : undefined;
																	// Removes last proxy if undefined.
		if(proxy[this.Class.#privateSymbol] !== this || proxy[Symbol()] === this) throw new Error("Proxy cannot be confirmed to reference the correct backer.");
																	// Validates the proxy.
		this.#proxies.push(proxy);									// Adds the proxy to the array.
	}

	constructor(iterable) {											// Constructor accepts an iterable.
		super(iterable);											// Calls Map constructor.
		this.mirror = new Proxy(this, {								// Creates a proxy for this instance.
			defineProperty: (_, __, ___) => false,					// Disables defineProperty, I don't use it internally and don't use it externally personally so I have no clue how to implement it. Disabling it doesn't seem to break anything.
			deleteProperty: (map, property) => !(property === map.Class.symbol || property === map.Class.#privateSymbol) && (map.#super('delete', property) || true),
																	// If the property isn't a special symbol delete it, but always return true, otherwise false.
			get: (map, property, _) => (property === map.Class.symbol || property === map.Class.#privateSymbol) ? map : map.#super('get', property),
																	// If the property isn't a special symbol return it, otherwise return the mirrored Map.
			getOwnPropertyDescriptor: (map, property) => (property === map.Class.symbol || property === map.Class.#privateSymbol) ? ({configurable: false, enumerable: false, value: map, writable: false}) : ({configurable: true, enumerable: true, value: map.#super('get', property), writable: true}),
																	// Same as get really, just more details.
			getPrototypeOf: (_) => Object.getPrototypeOf({}),		// Returns a plain object prototype since it's pretending to be an object. I have no idea if this breaks something, but I'm pretty sure without it that console.log() failed.
			has: (map, property) => (property === map.Class.symbol || property === map.Class.#privateSymbol) || map.#super('has', property),
																	// If the property isn't a special symbol check that it exists else return true.
			isExtensible: (_) => true,								// Always extensible.
			ownKeys: (map) => [...map.#super('keys')],				// Returns map keys as property names.
			preventExtensions: (_) => false,						// Prevents making the object non-extensible.
			set: (map, property, value, _) => !(property === map.Class.symbol || property === map.Class.#privateSymbol) && !!map.#super('set', property, value),
																	// If the property isn't a special symbol set it.
			setPrototypeOf: (_, __) => false,						// Disables prototype setting, I don't want to know what that would do to this thing.
		});
	}

	#super(func, ...args) {											// Helper to call super methods dynamically. I'm pretty sure that I can't always call super from the handler (If I didn't use arrows) so I need a helper and I'm not writting a dozen different ones.
		return typeof super[func] === 'function' ? super[func](...args) : super[func];
	}
	clear() {														// Clears all entries iteratively, not sure it's the best way.
		this.forEach((_, key, map) => map.delete(key));
	}
	delete(key) {													// Deletes a key if it exists, since delete always returns true pretty much.
		return key !== undefined && key !== null && this.has(key) && delete this.mirror[key];
	}
	entries() {														// Converts the Object.entries return Array into an Array iterator, it's close enough.
		return Object.entries(this.mirror)[Symbol.iterator]();
	}
	forEach(callbackFn, thisArg = undefined) {						// Uses the entries method to make an array and iterate over everything.
		[...this.entries()].forEach(([key, value]) => callbackFn(value, key, this, thisArg));
	}
	get(key) {
		return this.mirror[key];
	}
	has(key) {
		return key in this.mirror;
	}
	keys() {
		return Object.keys(this.mirror);
	}
	set(key, value) {												// Sets value for key, and does funky boolean stuff to always return this in one line rather than value.
		return (this.mirror[key] = value) && this || this;
	}
	values() {
		return Object.values(this.mirror);
	}
	[Symbol.iterator]() {											// Docs say this is practically an alias so...
		return this.entries();
	}

	get size() {													// Nothing to do here since the object doesn't have an equivalent.
		return super.size;
	}
	get [Symbol.toStringTag]() {									// Asked AI for boilerplate and it mentioned this so I made it look FANCY.
		return this.Class.name;
	}
}

export { MirroredMap, MirroredMap as default }
