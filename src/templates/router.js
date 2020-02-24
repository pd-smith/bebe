

function calculateImports(levelDescription) {
    const imports = {
        subRoutes: [],
        slugs: [],
        catchAll: []
    };
    if (levelDescription.middleware) {
        imports.middleware = {
            import: `const middleware = require('./${levelDescription.middleware}');`,
            mount: `router.use(middleware);`
        }
    }
    if (levelDescription.handler) {
        const routerMethod = levelDescription.catchAll ? 'use' : 'all';
        imports.handler = {
            import: `const handler = require('./${levelDescription.handler}');`,
            mount: `router.${routerMethod}('/', handler);`
        }
    }

    if (levelDescription.subRoutes) {
        levelDescription.subRoutes.forEach((subRoute, index) => {
            if (subRoute.catchAll) {
                imports.catchAll.push({
                    import: `const setupRouter${index} = require('${subRoute.relativeToParent}');`,
                    mount: `router.use('${subRoute.relativePath}', (req, res, next) => {
                        const fullPath = req.originalUrl.split('/').filter(Boolean);
                        const currentPath = req.path.split('/').filter(Boolean);
                        fullPath.splice(0, fullPath.length - currentPath.length - 1);
                        req.catch = fullPath;
                        next();
                    }, setupRouter${index}());`

                })
            } else {
                const type = subRoute.slugName ? 'slugs' : 'subRoutes'
                imports[type].push({
                    import: `const setupRouter${index} = require('${subRoute.relativeToParent}');`,
                    mount: `router.use('${subRoute.relativePath}', setupRouter${index}());`
                })
            }
        });
    }

    return imports;
}

function createTemplate({ middleware, handler, subRoutes, slugs, catchAll }) {
    return (`
    const { Router } = require('express');
    ${middleware ? middleware.import : ''}
    ${handler ? handler.import : ''}
    ${subRoutes.map((subRoute) => subRoute.import).join('\n')}
    ${slugs.map((slug) => slug.import).join('\n')}
    ${catchAll.map((catchAll) => catchAll.import).join('\n')}

    module.exports = () => {
        const router = Router({ mergeParams: true });
        ${middleware ? middleware.mount : ''}
        ${subRoutes.map((subRoute) => subRoute.mount).join('\n')}
        ${handler ? handler.mount : ''}
        ${slugs.map((slug) => slug.mount).join('\n')}
        ${catchAll.map((catchAll) => catchAll.mount).join('\n')}

        return router;
    };`)
}

function getServerFile(levelDescription) {
    return createTemplate(calculateImports(levelDescription))
}

module.exports = getServerFile;