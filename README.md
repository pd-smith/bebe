# bebe

To start:

```sh
bebe dev # Makes a dev server

bebe export # Exports compiled express server to .bebe/
```


## How to Use

1. there must be a `route` file
2. `route` represents `/`
3. inside you can define both a `index.js` and a `middleware.js` (this can be done at any path)
4. middleware will always be mounted before handlers
5. inside routes (or any directory in routes) you can define a path by creating a directory
 * ex. if you have `routes/foo/index.js`, a route for `/foo` will be created
6. You can also define `slugs` and `catch-all` routes.
 * ex. if you have `routes/[slug]/index.js`, a route for `/:slug` will be created
 * ex. if you have `routes/[...slug]/index.js`, a route for `/*` will be created. You can find out the caught path by looking up the path used `req.slug`

*Note* slugs and catch alls can use any name.

Current Limitations:
* only supports @babel/preset-env syntax
* relationships for complex routing have not been ironed out all the way (should a double slug route before a catch all ?)

