To compile the fluentui, we need to modify the esbuild-plugin-postcss2 code.

Insert the following code into `ui-esbuild/node_modules/esbuild-plugin-postcss2/dist/index.js` line 79.

```diff

      if (!sourceFullPath)
        sourceFullPath = import_path.default.resolve(args.resolveDir, args.path);
+     if (import_fs_extra.existsSync(sourceFullPath+'.js')) {
+       return
+     }
```

Will figure out a better solution.
