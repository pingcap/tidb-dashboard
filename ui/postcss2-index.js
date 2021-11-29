var __create = Object.create
var __defProp = Object.defineProperty
var __getProtoOf = Object.getPrototypeOf
var __hasOwnProp = Object.prototype.hasOwnProperty
var __getOwnPropNames = Object.getOwnPropertyNames
var __getOwnPropDesc = Object.getOwnPropertyDescriptor
var __markAsModule = (target) =>
  __defProp(target, '__esModule', { value: true })
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true })
}
var __exportStar = (target, module2, desc) => {
  if (
    (module2 && typeof module2 === 'object') ||
    typeof module2 === 'function'
  ) {
    for (let key of __getOwnPropNames(module2))
      if (!__hasOwnProp.call(target, key) && key !== 'default')
        __defProp(target, key, {
          get: () => module2[key],
          enumerable:
            !(desc = __getOwnPropDesc(module2, key)) || desc.enumerable,
        })
  }
  return target
}
var __toModule = (module2) => {
  return __exportStar(
    __markAsModule(
      __defProp(
        module2 != null ? __create(__getProtoOf(module2)) : {},
        'default',
        module2 && module2.__esModule && 'default' in module2
          ? { get: () => module2.default, enumerable: true }
          : { value: module2, enumerable: true }
      )
    ),
    module2
  )
}
__markAsModule(exports)
__export(exports, {
  default: () => src_default,
})
var import_fs_extra = __toModule(require('fs-extra'))
var import_util = __toModule(require('util'))
var import_path = __toModule(require('path'))
var import_tmp = __toModule(require('tmp'))
var import_postcss2 = __toModule(require('postcss'))
var import_postcss_modules = __toModule(require('postcss-modules'))
var import_less = __toModule(require('less'))
var import_stylus = __toModule(require('stylus'))
var import_resolve_file = __toModule(require('resolve-file'))
const postCSSPlugin = ({
  plugins = [],
  modules = true,
  rootDir = process.cwd(),
  sassOptions = {},
  lessOptions = {},
  stylusOptions = {},
}) => ({
  name: 'postcss2',
  setup(build) {
    let cache = new Map()
    // cache = {
    //   'srcPath': {
    //     lastMtimeMs: 1634030364414,
    //     output: ''
    //   }
    // }

    const tmpDirPath = import_tmp.default.dirSync().name,
      modulesMap = []
    const modulesPlugin = (0, import_postcss_modules.default)({
      generateScopedName: '[name]__[local]___[hash:base64:5]',
      ...(typeof modules !== 'boolean' ? modules : {}),
      getJSON(filepath, json, outpath) {
        const mapIndex = modulesMap.findIndex((m) => m.path === filepath)
        if (mapIndex !== -1) {
          modulesMap[mapIndex].map = json
        } else {
          modulesMap.push({
            path: filepath,
            map: json,
          })
        }
        if (
          typeof modules !== 'boolean' &&
          typeof modules.getJSON === 'function'
        )
          return modules.getJSON(filepath, json, outpath)
      },
    })

    build.onResolve(
      { filter: /.\.(css|sass|scss|less|styl)$/ },
      async (args) => {
        const start = Date.now()

        if (args.namespace !== 'file' && args.namespace !== '') return

        let sourceFullPath = (0, import_resolve_file.default)(args.path)
        if (!sourceFullPath)
          sourceFullPath = import_path.default.resolve(
            args.resolveDir,
            args.path
          )
        // hack
        let exist = await import_fs_extra.exists(sourceFullPath + '.js')
        if (exist) {
          return
        }
        exist = await import_fs_extra.exists(sourceFullPath)
        if (!exist) {
          sourceFullPath = import_path.default.resolve(
            process.cwd(),
            'node_modules',
            args.path
          )
        }

        const stat = await (0, import_fs_extra.stat)(sourceFullPath)
        // console.log('stat:', stat)
        // stat: Stats {
        //   dev: 64768,
        //   mode: 33188,
        //   nlink: 1,
        //   uid: 1001,
        //   gid: 1001,
        //   rdev: 0,
        //   blksize: 4096,
        //   ino: 49809915,
        //   size: 2719,
        //   blocks: 8,
        //   atimeMs: 1638153245827.8914,
        //   mtimeMs: 1634030364414,
        //   ctimeMs: 1637892184476.8418,
        //   birthtimeMs: 1637892184472.842,
        //   atime: 2021-11-29T02:34:05.828Z,
        //   mtime: 2021-10-12T09:19:24.414Z,
        //   ctime: 2021-11-26T02:03:04.477Z,
        //   birthtime: 2021-11-26T02:03:04.473Z
        // }

        let tmpFilePath = ''

        // cache
        let cacheVal = cache.get(sourceFullPath)
        // console.log('cache val:', cacheVal)
        if (cacheVal && cacheVal.lastMtimeMs === stat.mtimeMs) {
          // console.log('hit cache')
          tmpFilePath = cacheVal.output
        } else {
          // console.log('miss cache')
        }

        const sourceExt = import_path.default.extname(sourceFullPath)
        const sourceBaseName = import_path.default.basename(
          sourceFullPath,
          sourceExt
        )
        const isModule = sourceBaseName.match(/\.module$/)
        const sourceDir = import_path.default.dirname(sourceFullPath)

        if (tmpFilePath === '') {
          // let tmpFilePath
          if (args.kind === 'entry-point') {
            const sourceRelDir = import_path.default.relative(
              import_path.default.dirname(rootDir),
              import_path.default.dirname(sourceFullPath)
            )
            tmpFilePath = import_path.default.resolve(
              tmpDirPath,
              sourceRelDir,
              `${sourceBaseName}.css`
            )
            await (0, import_fs_extra.ensureDir)(
              import_path.default.dirname(tmpFilePath)
            )
          } else {
            const uniqueTmpDir = import_path.default.resolve(
              tmpDirPath,
              uniqueId()
            )
            tmpFilePath = import_path.default.resolve(
              uniqueTmpDir,
              `${sourceBaseName}.css`
            )
          }
          await (0, import_fs_extra.ensureDir)(
            import_path.default.dirname(tmpFilePath)
          )
          const fileContent = await (0, import_fs_extra.readFile)(
            sourceFullPath
          )

          let css = sourceExt === '.css' ? fileContent : ''
          if (sourceExt === '.sass' || sourceExt === '.scss')
            css = (
              await renderSass({ ...sassOptions, file: sourceFullPath })
            ).css.toString()
          if (sourceExt === '.styl')
            css = await renderStylus(
              new import_util.TextDecoder().decode(fileContent),
              {
                ...stylusOptions,
                filename: sourceFullPath,
              }
            )
          if (sourceExt === '.less')
            css = (
              await import_less.default.render(
                new import_util.TextDecoder().decode(fileContent),
                {
                  ...lessOptions,
                  filename: sourceFullPath,
                  rootpath: import_path.default.dirname(args.path),
                }
              )
            ).css
          const result = await (0, import_postcss2.default)(
            isModule ? [modulesPlugin, ...plugins] : plugins
          ).process(css, {
            from: sourceFullPath,
            to: tmpFilePath,
          })
          await (0, import_fs_extra.writeFile)(tmpFilePath, result.css)

          cache.set(sourceFullPath, {
            lastMtimeMs: stat.mtimeMs,
            output: tmpFilePath,
          })
        }

        const end = Date.now()
        console.log(
          `plugin took ${end - start}ms [onResolve] for ${sourceFullPath}`
        )

        return {
          namespace: isModule ? 'postcss-module' : 'file',
          path: tmpFilePath,
          watchFiles: getFilesRecursive(sourceDir),
          pluginData: {
            originalPath: sourceFullPath,
          },
        }
      }
    )
    build.onLoad(
      { filter: /.*/, namespace: 'postcss-module' },
      async (args) => {
        const mod = modulesMap.find(
            ({ path: path2 }) => path2 === args?.pluginData?.originalPath
          ),
          resolveDir = import_path.default.dirname(args.path)
        return {
          resolveDir,
          contents: `import ${JSON.stringify(args.path)};
export default ${JSON.stringify(mod && mod.map ? mod.map : {})};`,
        }
      }
    )
  },
})
function renderSass(options) {
  return new Promise((resolve, reject) => {
    getSassImpl().render(options, (e, res) => {
      if (e) reject(e)
      else resolve(res)
    })
  })
}
function renderStylus(str, options) {
  return new Promise((resolve, reject) => {
    import_stylus.default.render(str, options, (e, res) => {
      if (e) reject(e)
      else resolve(res)
    })
  })
}
function getSassImpl() {
  let impl = 'sass'
  try {
    require.resolve('sass')
  } catch {
    try {
      require.resolve('node-sass')
      impl = 'node-sass'
    } catch {
      throw new Error('Please install "sass" or "node-sass" package')
    }
  }
  return require(impl)
}
function getFilesRecursive(directory) {
  return (0, import_fs_extra.readdirSync)(directory).reduce((files, file) => {
    const name = import_path.default.join(directory, file)
    return (0, import_fs_extra.statSync)(name).isDirectory()
      ? [...files, ...getFilesRecursive(name)]
      : [...files, name]
  }, [])
}
let idCounter = 0
function uniqueId() {
  return Date.now().toString(16) + (idCounter++).toString(16)
}
var src_default = postCSSPlugin
