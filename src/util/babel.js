const globby = require('globby')
const path = require('path')
const fs = require('fs-extra')
const babelCore = require('@babel/core')


module.exports = (src, dest, options) => {
  src = path.resolve(src)
  dest = path.resolve(dest)

  function t(file) {
    return transform(file, src, dest, {
      filename: file,
      ...options
    })
  }

  return globby('**/*.js', {
    cwd: src
  })
    .then((files) => {
      return Promise.all(files.map(t))
    })
}


async function transform(file, src, dest, { config, onFile } = {}) {
  const filepath = path.join(src, file)
  const content = await fs.readFile(filepath)
  const destpath = path.join(dest, file)
  const babelConfigPath = path.join(__dirname, '../../babel.config')
  const {
    code
  } = await babelCore.transform(content.toString(), {
    configFile: babelConfigPath,
    ...config
  });

  return fs.outputFile(destpath, code).then(() => {
    onFile && onFile(file)
  })
}