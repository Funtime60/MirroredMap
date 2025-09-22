# MirroredMap
A quickly (1 day) put together JavaScript Class that extends Map and mirrors it _through_ a Proxy so that it can be used like a plain object.

I wrote this because I wanted to watch my custom Map deeply for changes (and write to a file), but I realized you can't do that generically as all calls to a Map are gets that retrieve functions. You'd have to de-genericize it to recognize a Map and listen specifically for a Set call but then you might miss custom functions that are implemented.

This subclass exposes one extra static property (getter), a symbol, and one extra instance property (getter/setter) "mirror". Internally there is an array of proxies which starts with just the internally defined one and the last one added is considered to contain all the previous ones. This array functions as a stack which can be controlled via the "mirror" setter where passing a proxy of the getter will add it to the stack and passing undefined will "pop" an added proxy of. The getter simply peeks at the stack. The only check of the proxy in the setter is that it responds correctly when passed the static symbol, responding with a referense to the backing map. All calls to the standard Map methods are passed through the top of the proxy stack which then converts them back into super calls.

This is done so that you can drop it into a Map class, yet still install an object proxy listener to it. Example usage: `mirroredMap.mirror = new Proxy(mirroredMap.mirror, handlerObject);`. This will install your handler so that it calls it instead of the internal one. Clearly you will need call the previous proxy and such until you hit the internal one. See the Reflect API (I think, I'm still teaching myself JS).

I specifically made this after I realized why Observable-Slim wasn't working for my project and I now realize this should in fact make maps compatible with that library. (I'll probably write my own now for fun.)
