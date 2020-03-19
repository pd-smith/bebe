const { join } = require('../util')


function calculateImports(levelDescription) {
    const imports = {
        subRoutes: [],
        slugs: [],
        catchAll: []
    };
    if (levelDescription.middleware) {
        imports.middleware = {
            import: `const middleware = require('${join(levelDescription.parentDir, levelDescription.middleware)}').default;`,
            mount: `app.use(middleware);`
        }
    }
    if (levelDescription.handler) {
        imports.handler = {
            import: `const handler = require('${join(levelDescription.parentDir, levelDescription.handler)}').default;`,
            mount: "app.all('/', handler);"
        }
    }

    if (levelDescription.subRoutes) {
        levelDescription.subRoutes.forEach((subRoute, index) => {
            if (subRoute.catchAll) {
                imports.catchAll.push({
                    import: `const setupRouter${index} = require('${subRoute.parentDir}').default;`,
                    mount: `app.use('${subRoute.relativePath}', (req, res, next) => {
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
                    import: `const setupRouter${index} = require('${subRoute.parentDir}').default;`,
                    mount: `app.use('${subRoute.relativePath}', setupRouter${index}());`
                })
            }
        });
    }

    return imports;
}

function createTemplate({ middleware, handler, subRoutes, slugs, catchAll }) {
    return (`
const express = require('express')
${middleware ? middleware.import : ''}
${handler ? handler.import : ''}
${subRoutes.map((subRoute) => subRoute.import).join('\n')}
${slugs.map((slug) => slug.import).join('\n')}
${catchAll.map((catchAll) => catchAll.import).join('\n')}
const app = express()
const port = process.env.PORT || 3000

function setUpRoutes() {
    ${middleware ? middleware.mount : ''}
    ${subRoutes.map((subRoute) => subRoute.mount).join('\n')}
    ${handler ? handler.mount : ''}
    ${slugs.map((slug) => slug.mount).join('\n')}
    ${catchAll.map((catchAll) => catchAll.mount).join('\n')}
}
setUpRoutes()
app.listen(port, () => console.log(\`Server listening on port \${port}!\`))
    `)
}

function getServerFile(levelDescription) {
    return createTemplate(calculateImports(levelDescription))
}

module.exports = getServerFile;
