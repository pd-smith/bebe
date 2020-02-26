const fs = require('fs-extra');
const watch = require('watch');
const path = require('path');
const chalk = require('chalk');
const util = require('util');
const fork = require('child_process').fork;
const execAsPromise = util.promisify(require('child_process').exec);

const { join } = require('./util')
const createServerFile = require('./templates/server')
const createRouterFile = require('./templates/router')

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
        let slugName = directory.substring(1, directory.length - 1);
        if (slugName.startsWith('...')) {
            slugName = slugName.substring(3)
            levelDescription.catchAll = true;
        }
        levelDescription.relativePath = `/:${slugName}`;
        levelDescription.slugName = slugName;
    }

    const contents = await fs.readdir(join('./', parentDir));
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
        const lstatInfo = await fs.lstat(join('./', parentDir, name));
        if (lstatInfo.isDirectory()) {
            return analyzeFileLevel(name, `${basePath}/${name}`, `${parentDir}/${name}`)
        }
    }))
    levelDescription.subRoutes = subRoutes.filter(Boolean)
    return levelDescription
}

async function writeRouterFile(description) {
    if (description.handler) {
        await fs.rename(join('.bebe', description.parentDir, 'index.js'), join('.bebe', description.parentDir, 'handler.js'))
    }
    await fs.writeFile(join('.bebe', description.parentDir, 'index.js'), createRouterFile(description))
    return description.subRoutes.map(writeRouterFile)
}

async function writeServerFile(description) {
    if (description.handler) {
        await fs.rename(join('.bebe', description.parentDir, 'index.js'), join('.bebe', description.parentDir, 'handler.js'))
    }
    await fs.writeFile('.bebe/server.js', createServerFile(description))
    return description.subRoutes.map(writeRouterFile)
}

async function main() {
    const levelDescriptions = await analyzeFileLevel('routes', '', './routes')
    await writeServerFile(levelDescriptions)
}

let childProcess;
watch.watchTree('./routes', async () => {
    if (childProcess) {
        childProcess.kill('SIGINT')
    }
    const { stderr } = await execAsPromise('npm run compile:files:dev');
    console.log(chalk.red(stderr));
    await main().then(() => { 
        childProcess = fork(path.join('.bebe/server.js'));
        childProcess.on('exit', (code) => {
            console.log(chalk.yellow('Changes detected. Restarting server...'));
        });
    })
})
