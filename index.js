const fs = require('fs-extra');
const path = require('path');

async function analyzeFileLevel(directory, basePath, parentDir) {

    const levelDescription = {
        fullPath: basePath || '/',
        relativePath: `/${directory}` || '/',
        parentDir,
        relativeToParent: `./${directory}`,
        subRoutes: []
    };
    const relativePathHasSlug = directory && directory.match(/\[.*?\]/g)
    if (relativePathHasSlug) {
        const slugName = directory.substring(1, directory.length - 1);
        levelDescription.relativePath = `/:${slugName}`;
        levelDescription.slugName = slugName;
    }

    const contents = await fs.readdir(path.join('./', parentDir));
    const indexOfIndex = contents.indexOf('index.js');
    if (indexOfIndex > -1) {
        contents.splice(indexOfIndex, 1);
        levelDescription.handler = 'handler.js'
    }
    const indexOfMiddlewareRouter = contents.indexOf('middleware.js');
    if (indexOfMiddlewareRouter > -1) {
        contents.splice(indexOfMiddlewareRouter, 1);
        levelDescription.middleware = 'middleware.js'
    }
    const subRoutes = await Promise.all(contents.map(async (name) => {
        const lstatInfo = await fs.lstat(path.join('./', parentDir, name));
        if (lstatInfo.isDirectory()) {
            return analyzeFileLevel(name, `${basePath}/${name}`, `${parentDir}/${name}`)
        }
    }))
    levelDescription.subRoutes = subRoutes.filter(Boolean)
    return levelDescription
}

async function copyOverRoutes() {
    return fs.copy('./routes', '.bebe/routes')
}

async function writeRouterFile(description) {
    if (description.handler) {
        await fs.rename(path.join('.bebe', description.parentDir, 'index.js'), path.join('.bebe', description.parentDir, 'handler.js'))
    }
    await fs.writeFile(path.join('.bebe', description.parentDir, 'index.js'), `
const { Router } = require('express');
${description.middleware ? `const middleware = require('./${description.middleware}');`: ''}
${description.handler ? `const handler = require('./${description.handler}');` : ''}
${description.subRoutes.map((desc, index) => `const setupRouter${index} = require('${desc.relativeToParent}');`).join('\n')}

module.exports = () => {
    const router = Router({ mergeParams: true });
    ${description.middleware ? `router.use(middleware);`: ''}
    ${description.subRoutes.map((desc, index) => `router.use('${desc.relativePath}', setupRouter${index}());`).join('\n')}
    ${description.handler ? `router.all('/', handler);`: ''}

    return router;
};
    `)
    return description.subRoutes.map(writeRouterFile)
}

async function writeServerFile(description) {
    if (description.handler) {
        await fs.rename(path.join('.bebe', description.parentDir, 'index.js'), path.join('.bebe', description.parentDir, 'handler.js'))
    }
    await fs.writeFile('.bebe/server.js', `
const express = require('express')
${description.middleware ? `const middleware = require('./${path.join(description.parentDir, description.middleware)}');`: ''}
${description.handler ? `const handler = require('./${path.join(description.parentDir, description.handler)}');` : ''}
${description.subRoutes.map((desc, index) => `const setupRouter${index} = require('./${path.join(description.parentDir, desc.relativeToParent)}');`).join('\n')}
const app = express()
const port = process.env.PORT || 3000

function setUpRoutes() {
    ${description.middleware ? `app.use(middleware);`: ''}
    ${description.subRoutes.map((desc, index) => `app.use('${desc.relativePath}', setupRouter${index}());`).join('\n')}
    ${description.handler ? `app.all('/', handler);`: ''}
}
setUpRoutes()
app.listen(port, () => console.log(\`Example app listening on port \${port}!\`))
    `)
    return description.subRoutes.map(writeRouterFile)
}

async function main() {
    const levelDescriptions = await analyzeFileLevel('routes', '', './routes')
    console.log(levelDescriptions)
    await copyOverRoutes()
    await writeServerFile(levelDescriptions)

}
main()
