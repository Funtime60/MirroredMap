class MirroredMap extends Map {
	get Class() { return MirroredMap; }

	
	static #privateSymbol = Symbol('MirroredMap'); // Private symbol for internal use, it MUST remain internal to the class.
	static #mirrorMapCheck = Symbol('MirroredMapCheck'); // Private check symbol storage, but the symbol is public.
	static get publicSymbol() { return this.#mirrorMapCheck; }
	static #symbolList = [this.#privateSymbol, this.#mirrorMapCheck]; // Array of symbols since they're special.

	static #getAllKeys(obj) {	// Recursive helper function to get the names of all the gettable keys on an object.
		const prototype = Object.getPrototypeOf(obj);
		const inherited = (prototype) ? this.#getAllKeys(prototype) : [];
		return [...new Set(Object.getOwnPropertyNames(obj).concat(inherited))];
	}

	#proxies = [];
	get proxy() { return this.#proxies.at(-1); }
	set proxy(proxy) {
		if(proxy === undefined) { // Removes a proxy off the stack if the input is undefined.
			if(this.#proxies.length > 1) { // Don't do it if we just have the starting proxy.
				this.#proxies.pop();
			}
		}else if(this.Class.#symbolList.every((symbol) => proxy[symbol] !== this) || proxy[Symbol()] === this) {
			// Check that it returns the map if it passes the special symbols, but fails if any symbol causes a return of the map.
			throw new Error("Proxy cannot be confirmed to reference the correct backer."); 
		}else {
			this.#proxies.push(proxy);
		}
	}
	get map() { return this.proxy[this.Class.publicSymbol]; } // Returns a direct reference to the backing map.


	#reservedKeysStore = this.Class.#getAllKeys(this); // Initialize with keys.
	// Call the helper function on ourself on demand. Filter out the initial keys.
	get definedKeys() { return this.Class.#getAllKeys(this).filter((key) => !(this.reservdKeys).includes(key)); }
	get reservdKeys() { return this.#reservedKeysStore; } // Return the stored initial keys.
	// Helper to check if a property is a specified kind of key.
	// Defaults to checking if it's any explicitly defined key, but if any kind is specified it only checks the specified kinds.
	#propertyCheck(property, {special, defined, reservd} = {special: true, reservd: true, defined: true}) {
		const specialKeys = special && this.Class.#symbolList.includes(property);
		const reservdKeys = reservd &&       this.reservdKeys.includes(property);
		const definedKeys = defined &&       this.definedKeys.includes(property);
		return specialKeys || reservdKeys || definedKeys;
	}

	constructor(iterable) {
		super(); // Can't call set until after the next "line" and super(iterable) does.
		this.proxy = new Proxy(this, {
			defineProperty(map, property, _) { // Allow defining of properties if they aren't reserved or special.
				if(map.#propertyCheck(property, {reservd: true, special: true})) throw new Error(`Cannot define reserved property: {${property}}`);
				return Reflect.defineProperty(...arguments);
			},
			deleteProperty(map, property) { // Allow deleting of "properties" if they aren't reserved or special.
				if(map.#propertyCheck(property, {reservd: true, special: true})) throw new Error(`Cannot delete reserved property: {${property}}`);
				map.#super('delete', property);
				return true;
			},
			get(map, property, _) {
				if(map.#propertyCheck(property, {special: true})) return map; // If special, return the backing map.
				if(map.#propertyCheck(property, {defined: true, reservd: true})) return map?.[property]; // If defined or reserved return off of the backing map.
				return map.#super('get', property);
			},
			has(map, property) {
				if(map.#propertyCheck(property, {special: true})) return true; // If special, return if the backing map exists... it does.
				if(map.#propertyCheck(property, {defined: true, reservd: true})) return property in map; // If defined or reserved check off of the backing map.
				return map.#super('has', property);
			},
			set(map, property, value, _) { // Allow setting of "properties" if they aren't reserved or special.
				if(map.#propertyCheck(property, {reservd: true, special: true})) throw new Error(`Cannot set reserved property: {${property}}`);
				return !!map.#super('set', property, value);
			},
			getOwnPropertyDescriptor(map, property) { // If special or reserved, return a dummy descriptor.
				if(map.#propertyCheck(property, {reservd: true, special: true})) return {configurable: false, enumerable: false, value: map, writable: false};
				if(map.#propertyCheck(property, {defined: true})) return Reflect.getOwnPropertyDescriptor(...arguments); // If defined, can just reflect.
				// Else return a different dummy descriptor if the property exists.
				if(map.#super('has', property)) return {configurable: true, enumerable: true, value: map.#super('get', property), writable: true};
			},
			ownKeys(map) { return [...map.#super('keys')]; },
			getPrototypeOf(map) { return Object.getPrototypeOf(map) }, // Matches default IIRC, but I don't trust it.
			// Don't feel like handling the logic for the rest of these. Besides, in most cases using these would defeat the purpose of this map.
			isExtensible: (_) => true,
			preventExtensions: (_) => false,
			setPrototypeOf: (_, __) => false,
		});
		if(iterable && typeof iterable === 'object') { // Added object check to allow converting the result of JSON.parse on this class.
			iterable = Object.entries(iterable)
		}
		for(const entry of iterable) { // set iterable here since it couldn't be done before.
			this.set(...entry);
		}
		return this.proxy; // Return a proxy instead of the map. This way it always has the traps in theory.
	}

	#super(func, ...args) { // Private helper function to make super calls/gets.
		if(typeof super[func] === 'function') return super[func](...args);
		return super[func];
	}
	clear() { // Clears all entries iteratively. I'm not sure it's the best way and certainly not happy with it.
		this.forEach((_, key, map) => map.delete(key));
	}
	delete(key) { // Since delete always returns true pretty much, check manually first.
		if(this.map.#propertyCheck(key)) return false; // Don't allow use of Map function on non-map keys.
		return key !== undefined && key !== null && this.has(key) && delete this.proxy[key];
	}
	entries() { // Pass it through a new map to get a mapiterator. (capitalize? IDK.)
		return (new Map(Object.entries(this.proxy))).entries();
	}
	forEach(callbackFn, thisArg = undefined) { // I might not need this one, but that depends on how the super calls the callback, so it's here.
		[...this.entries()].forEach(([key, value]) => callbackFn(value, key, this, thisArg));
	}
	get(key) {
		if(this.map.#propertyCheck(key)) return false; // Don't allow use of Map function on non-map keys.
		return this.proxy[key];
	}
	has(key) {
		if(this.map.#propertyCheck(key)) return false; // Don't allow use of Map function on non-map keys.
		return key in this.proxy; // This is where I finally learn 'in' is a keyword AND committed it to memory.
	}
	keys() {
		return Object.keys(this.proxy);
	}
	set(key, value) {
		if(this.map.#propertyCheck(key)) return false; // Don't allow use of Map function on non-map keys.
		this.proxy[key] = value;
		return this; // Return this since object syntax returns value.
	}
	values() {
		return Object.values(this.proxy);
	}
	[Symbol.iterator]() { // Docs say this is practically an alias so...
		return this.entries();
	}

	get size() { // Nothing special to do here since the object doesn't have an equivalent.
		return super.size;
	}
	get [Symbol.toStringTag]() { // Asked AI for boilerplate and it mentioned this so I made it look FANCY.
		return this.Class.name;
	}
	toString() { // Couldn't be bothered to do anything more. Does highlight that at least one benefit is that it allows a map to stringify.
		return JSON.stringify(this);
	}
}

export { MirroredMap, MirroredMap as default }
