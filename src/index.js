#!/usr/bin/env node

const fs = require('fs-extra');
const watch = require('watch');
const path = require('path');
const chalk = require('chalk');
const fork = require('child_process').fork;
const babel = require('./util/babel')

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
    const indexOfErrorRouter = contents.indexOf('error.js');
    if (indexOfErrorRouter > -1) {
        contents.splice(indexOfErrorRouter, 1);
        levelDescription.error = 'error.js'

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


async function exportServer() {
    const { stderr: compileStderr } = await babel('routes', '.bebe/routes');
    if (compileStderr) {
        throw new Error(`Failed to export server: \n ${stderr}`)
    }
    await main()
    console.log(chalk.green("Successfully Exported server to .bebe/"))
}

function devServer() {
    let childProcess;
    watch.watchTree('./routes', async () => {
        if (childProcess) {
            childProcess.kill('SIGINT')
        }
        const { stderr } = await babel('routes', '.bebe/routes');
        if (stderr) console.log(chalk.red(stderr));
        await main().then(() => {
            childProcess = fork(path.join('.bebe/server.js'));
            childProcess.on('exit', (code) => {
                console.log(chalk.yellow('Changes detected. Restarting server...'));
            });
        })
    })
}

(async function () {
    const [, , command] = process.argv;
    try {
        switch (command) {
            case 'dev': {
                await devServer()
                return;
            }
            case 'export': {
                await exportServer()
                return;
            }
            case 'help': {
                console.log(chalk.green(`
Commands:
        
    dev - Run a dev server. Hot reloads on edits
                
    export - Builds an executable express server
                `));
                return;
            }
            default: {
                console.log(chalk.yellow(`Run "bebe help" for options`));
                return;
            }
        }
    } catch (error) {
        console.error(error)
    }
})()
