class MirroredMap extends Map {
	// static #privateSymbol = Symbol('MirroredMap');
	static #mirrorMapCheck = Symbol('MirroredMapCheck');
	static get symbol() { return this.#mirrorMapCheck; }
	#inner;
	#mirror;
	get mirror() { return this.#mirror; }
	set mirror(proxyHandler) { this.#mirror = new Proxy(this.#inner, proxyHandler); }

	get Class() { return MirroredMap; }

	constructor(iterable) {
		super(iterable);
		this.#inner = new Proxy(this, {
			defineProperty: (_, __, ___) => false,
			deleteProperty: (map, property) => property === map.Class.symbol && (map.#super('delete', property) || true),
			get: (map, property, _) => (property === map.Class.symbol) ? map : map.#super('get', property),
			getOwnPropertyDescriptor: (map, property) => (property === map.Class.symbol) ? ({configurable: false, enumerable: false, value: map, writable: false}) : ({configurable: true, enumerable: true, value: map.#super('get', property), writable: true}),
			// getPrototypeOf: (map) => Object.getPrototypeOf(map), // No need, this is the same as default.
			has: (map, property) => property === map.Class.symbol || map.#super('has', property),
			isExtensible: (_) => true,
			ownKeys: (map) => [...map.#super('keys')],
			preventExtensions: (_) => false,
			set: (map, property, value, _) => property !== map.Class.symbol && !!map.#super('set', property, value),
			setPrototypeOf: (_, __) => false,
		});
		this.#mirror = new Proxy(this.#inner, {});
	}

	#super(func, ...args) {
		return typeof super[func] === 'function' ? super[func](...args) : super[func];
	}
	clear() {
		this.forEach((_, key, map) => map.delete(key));
	}
	delete(key) {
		return this.has(key) && delete this.mirror[key];
	}
	entries() {
		return Object.entries(this.mirror)[Symbol.iterator]();
	}
	forEach(callbackFn, thisArg = undefined) {
		[...this.entries()].forEach(([key, value], index, array) => callbackFn(value, key, this, thisArg));
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
	set(key, value) {
		return (this.mirror[key] = value) && this || this;
	}
	values() {
		return Object.values(this.mirror);
	}
	[Symbol.iterator]() {
		return this.entries();
	}

	get size() {
		return super.size;
	}
	get [Symbol.toStringTag]() {
		return this.Class.name;
	}
}

export { MirroredMap, MirroredMap as default }

const test = new MirroredMap();

test.mirror = {set(_, property) {console.log(property); return Reflect.set(...arguments);}}
test.set("ABBA", "BOO");
const test2 = test.mirror[MirroredMap.symbol];
console.log(test2);