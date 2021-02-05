// Modified from github.com/microsoft/SandDance under the MIT license.
import { base } from './base'
import {
  DataSourceButton,
  DataSourcePicker,
  Props as DataSourceProps,
} from './DataSourcePicker'
import { downloadData } from './download'
import { strings } from './language'
import {
  downloadSnapshotsJSON,
  serializeSnapshot,
  SnapshotExport,
  SnapshotImportLocal,
  SnapshotImportRemote,
  validSnapshots,
} from './snapshots'
import { DataSource, DataSourceSnapshot, InsightMap } from './types'
import { FluentUITypes } from '@msrvida/fluentui-react-cdn-typings'
import {
  ColorSettings,
  Explorer,
  Explorer_Class,
  getColorSettingsFromThemePalette,
  Options,
  SandDance,
  SideTabId,
  themePalettes,
  ViewerOptions,
} from '@msrvida/sanddance-explorer'
import React from 'react'
import { getAuthTokenAsBearer } from '@lib/utils/auth'

const VegaDeckGl = SandDance.VegaDeckGl

export interface Props {
  themeColors: { [theme: string]: ColorSettings }
  setTheme?: (darkTheme: boolean) => void
  darkTheme?: boolean
  dataSources: DataSource[]
  insights?: InsightMap
  initialOptions?: { [dataSetId: string]: Options }
}

export type Dialogs = 'import-local' | 'import-remote' | 'export'

export interface State {
  compactUI: boolean
  dialogMode: Dialogs
  dataSource: DataSource
  darkTheme: boolean
}

function getViewerOptions(
  darkTheme: boolean,
  themeColors: { [theme: string]: ColorSettings }
) {
  const colors = themeColors && themeColors[darkTheme ? 'dark' : 'light']
  const viewerOptions: Partial<ViewerOptions> = {
    colors: {
      ...getColorSettingsFromThemePalette(
        themePalettes[darkTheme ? 'dark-theme' : '']
      ),
      ...colors,
    },
  }
  return viewerOptions
}

function getSnapshotFromHash(): DataSourceSnapshot | undefined {
  const hash = document.location.hash && document.location.hash.substring(1)
  if (hash) {
    try {
      return JSON.parse(decodeURIComponent(hash)) as DataSourceSnapshot
    } catch (e) {}
  }
  return undefined
}

let snapshotOnLoad = getSnapshotFromHash()
if (snapshotOnLoad?.dataSource?.dataSourceType === 'local') {
  snapshotOnLoad = undefined
}

function getDefaultDataSource(dataSources: DataSource[]): DataSource {
  if (snapshotOnLoad && snapshotOnLoad.dataSource)
    dataSources.push(snapshotOnLoad.dataSource)
  const defaultID = new URLSearchParams(window.location.search).get('default')
  return (
    (defaultID && dataSources.find((d) => d.id === defaultID)) ||
    snapshotOnLoad?.dataSource ||
    dataSources[0]
  )
}

interface Handlers {
  hashchange: (e: HashChangeEvent) => void
  resize: (e: UIEvent) => void
}

const COMPACT_UI_KEY = 'explorer-compact-ui'

export class SandDanceApp extends React.Component<Props, State> {
  private viewerOptions: Partial<SandDance.types.ViewerOptions>
  private readonly handlers: Handlers
  private dataSourcePicker?: DataSourcePicker
  private postLoad?: (dataSource: DataSource) => void
  // @ts-ignore
  public explorer: Explorer_Class

  constructor(props: Props) {
    super(props)
    this.state = {
      compactUI: !!localStorage.getItem(COMPACT_UI_KEY),
      // @ts-ignore
      dialogMode: null,
      dataSource: getDefaultDataSource(props.dataSources),
      // @ts-ignore
      darkTheme: props.darkTheme,
    }
    this.viewerOptions = getViewerOptions(
      this.state.darkTheme,
      props.themeColors
    )
    this.handlers = {
      hashchange: (e) => {
        const snapshot = getSnapshotFromHash()
        if (snapshot) {
          this.explorer?.calculate(() => this.hydrateSnapshot(snapshot))
        }
      },
      resize: (e) => {
        this.explorer?.resize()
      },
    }
    this.wireEventHandlers(true)
    this.changeColorScheme(this.state.darkTheme)
  }

  private wireEventHandlers(add: boolean) {
    for (const key in this.handlers) {
      if (add) {
        window.addEventListener(key, this.handlers[key])
      } else {
        window.removeEventListener(key, this.handlers[key])
      }
    }
  }

  private isSameDataSource(a: DataSource, b: DataSource) {
    if (
      a.dataSourceType === b.dataSourceType &&
      a.type === b.type &&
      a.id === b.id
    ) {
      if (a.dataSourceType === 'url') {
        return a.dataUrl === b.dataUrl
      }
      return true
    }
    return false
  }

  private hydrateSnapshot(
    snapshot: DataSourceSnapshot,
    selectedSnapshotIndex = -1
  ) {
    if (snapshot.dataSource) {
      if (this.isSameDataSource(snapshot.dataSource, this.state.dataSource)) {
        if (selectedSnapshotIndex === -1) {
          this.explorer.reviveSnapshot(snapshot)
        } else {
          this.explorer.reviveSnapshot(selectedSnapshotIndex)
        }
        if (
          snapshot.dataSource.snapshotsUrl &&
          snapshot.dataSource.snapshotsUrl !==
            this.state.dataSource.snapshotsUrl
        ) {
          //load new snapshots url
          fetch(snapshot.dataSource.snapshotsUrl)
            .then((response) => response.json())
            .then((snapshots) => {
              if (validSnapshots(snapshots)) {
                this.explorer.setState({ snapshots })
                const dataSource = { ...this.state.dataSource }
                dataSource.snapshotsUrl = snapshot.dataSource.snapshotsUrl
                this.setState({ dataSource })
              }
            })
        }
      } else {
        if (snapshot.dataSource.dataSourceType === 'local') {
          this.dataSourcePicker!.setState({ dialogMode: 'local' })
          this.postLoad = (ds) => {
            if (this.isSameDataSource(snapshot.dataSource, ds)) {
              this.hydrateSnapshot(snapshot, selectedSnapshotIndex)
            }
          }
        } else {
          this.load(snapshot.dataSource, snapshot.insight)
            .then(() => {
              this.explorer.setState({
                sideTabId: SideTabId.Snapshots,
                note: snapshot.description!,
              })
              this.explorer.scrollSnapshotIntoView(selectedSnapshotIndex)
            })
            .catch((e) => {
              this.loadError(snapshot.dataSource)
            })
        }
      }
      return true
    }
  }

  async load(
    dataSource: DataSource,
    partialInsight?: Partial<SandDance.specs.Insight>
  ) {
    //clone so that we do not modify original object
    dataSource = VegaDeckGl.util.clone(dataSource)
    this.setState({ dataSource })
    document.title = `DataViz - ${dataSource.displayName}`
    if (dataSource.withToken && dataSource.dataUrl) {
      try {
        const data = await VegaDeckGl.base.vega.loader().http(
          dataSource.dataUrl,
          dataSource.withToken
            ? {
                headers: {
                  Authorization: getAuthTokenAsBearer() || '',
                },
              }
            : {}
        )
        dataSource.dataUrl = undefined
        dataSource.rawText = data
      } catch (e) {}
    }
    return this.explorer.load(
      dataSource,
      // @ts-ignore
      (columns) => {
        dataSource.columnsTransformer && dataSource.columnsTransformer(columns)
        return (
          partialInsight ||
          (this.props.insights && this.props.insights[dataSource.id])
        )
      },
      this.props.initialOptions &&
        VegaDeckGl.util.deepMerge(
          {},
          this.props.initialOptions['*'],
          this.props.initialOptions[dataSource.id]
        )
    )
  }

  private dataSourceError(dataSource: DataSource) {
    switch (dataSource.dataSourceType) {
      case 'local':
        return strings.errorDataSourceFromLocal(dataSource)
      case 'dashboard':
      case 'url':
        return strings.errorDataSourceFromUrl(dataSource)
    }
  }

  private loadError(dataSource: DataSource) {
    let error = this.dataSourceError(dataSource)
    this.explorer.setState({ errors: [error] })
    this.setState({
      // @ts-ignore
      dataSource: { dataSourceType: null, id: null, type: null },
    })
  }

  updateExplorerViewerOptions(
    viewerOptions: Partial<SandDance.types.ViewerOptions>
  ) {
    this.viewerOptions = viewerOptions
    this.explorer && this.explorer.updateViewerOptions(this.viewerOptions)
  }

  getThemePalette(darkTheme: boolean) {
    const theme = darkTheme ? 'dark-theme' : ''
    return themePalettes[theme]
  }

  changeColorScheme(darkTheme: boolean) {
    this.updateExplorerViewerOptions(
      getViewerOptions(darkTheme, this.props.themeColors)
    )
    VegaDeckGl.base.vega.scheme(
      SandDance.constants.ColorScaleNone,
      (x) => this.explorer.viewer.options.colors.defaultCube
    )
    this.explorer &&
      this.explorer.viewer &&
      this.explorer.viewer.renderSameLayout(this.viewerOptions)
    base.fluentUI.loadTheme({ palette: this.getThemePalette(darkTheme) })
  }

  render() {
    const theme = this.state.darkTheme ? 'dark-theme' : ''
    const dataSourceProps: DataSourceProps = {
      dataSource: this.state.dataSource,
      dataSources: this.props.dataSources,
      changeDataSource: (dataSource: DataSource) => {
        document.location.hash = ''
        return this.load(dataSource)
          .then(() => {
            if (this.postLoad) {
              this.postLoad(dataSource)
              // @ts-ignore
              this.postLoad = null
            }
          })
          .catch(() => this.loadError(dataSource))
      },
    }
    return (
      <section className="sanddance-app">
        <Explorer
          logoClickTarget="_self"
          theme={theme}
          snapshotProps={{
            // @ts-ignore
            modifySnapShot: (snapshot: DataSourceSnapshot) => {
              snapshot.dataSource = this.state.dataSource
            },
            getTopActions: (snapshots) => {
              const items: FluentUITypes.IContextualMenuItem[] = [
                {
                  key: 'import',
                  text: strings.menuSnapshotsImport,
                  subMenuProps: {
                    items: [
                      {
                        key: 'import-local',
                        text: strings.menuLocal,
                        onClick: () =>
                          this.setState({ dialogMode: 'import-local' }),
                      },
                      {
                        key: 'import-remote',
                        text: strings.menuUrl,
                        onClick: () =>
                          this.setState({ dialogMode: 'import-remote' }),
                      },
                    ],
                  },
                },
                {
                  key: 'export',
                  text: strings.menuSnapshotsExportAsJSON,
                  disabled: snapshots.length === 0,
                  onClick: () =>
                    downloadSnapshotsJSON(
                      snapshots,
                      `${this.state.dataSource.displayName}.snapshots`
                    ),
                },
                {
                  key: 'export-as',
                  text: strings.menuSnapshotsExportAs,
                  disabled: snapshots.length === 0,
                  onClick: () => this.setState({ dialogMode: 'export' }),
                },
              ]
              return items
            },
            getChildren: (snapshots) => (
              <div>
                {this.state.dialogMode === 'import-local' && (
                  <SnapshotImportLocal
                    theme={theme}
                    dataSource={this.state.dataSource}
                    onImportSnapshot={(snapshots) =>
                      this.explorer.setState({ snapshots })
                    }
                    // @ts-ignore
                    onDismiss={() => this.setState({ dialogMode: null })}
                  />
                )}
                {this.state.dialogMode === 'import-remote' && (
                  <SnapshotImportRemote
                    theme={theme}
                    dataSource={this.state.dataSource}
                    onImportSnapshot={(snapshots) =>
                      this.explorer.setState({ snapshots })
                    }
                    onSnapshotsUrl={(snapshotsUrl) => {
                      const dataSource = { ...this.state.dataSource }
                      dataSource.snapshotsUrl = snapshotsUrl
                      this.setState({ dataSource })
                    }}
                    // @ts-ignore
                    onDismiss={() => this.setState({ dialogMode: null })}
                  />
                )}
                {this.state.dialogMode === 'export' && (
                  <SnapshotExport
                    explorer={this.explorer}
                    dataSource={this.state.dataSource}
                    snapshots={snapshots}
                    // @ts-ignore
                    onDismiss={() => this.setState({ dialogMode: null })}
                    theme={theme}
                  />
                )}
              </div>
            ),
            // @ts-ignore
            getActions: (snapshot: DataSourceSnapshot, i) => {
              const url = '#' + serializeSnapshot(snapshot)
              let element: JSX.Element
              if (
                snapshot.dataSource &&
                snapshot.dataSource.dataSourceType === 'local'
              ) {
                element = <span key={`link${i}`}>{strings.labelLocal}</span>
              } else {
                element = (
                  <a
                    key={`link${i}`}
                    href={url}
                    title={strings.labelLinkDescription}
                    aria-label={strings.labelLinkDescription}
                  >
                    {strings.labelShare}
                  </a>
                )
              }
              return [{ element }]
            },
            getTitle: (insight) =>
              `${this.state.dataSource.displayName} ${insight.chart}`,
            getDescription: (insight) => '', //TODO create description from filter etc.
          }}
          // @ts-ignore
          onSnapshotClick={(
            snapshot: DataSourceSnapshot,
            selectedSnapshotIndex
          ) => this.hydrateSnapshot(snapshot, selectedSnapshotIndex)}
          initialView="2d"
          mounted={(e) => {
            this.explorer = e
            this.load(
              this.state.dataSource,
              snapshotOnLoad && snapshotOnLoad.insight
            ).catch((e) => {
              this.loadError(this.state.dataSource)
            })
            document.onkeyup = (e) => {
              if (e.ctrlKey && (e.key === 'z' || e.key === 'Z')) {
                if (e.shiftKey) {
                  this.explorer.redo()
                } else {
                  this.explorer.undo()
                }
              }
            }
          }}
          dataExportHandler={(data, datatype, displayName) => {
            try {
              downloadData(data, `${displayName}.${datatype}`)
            } catch (e) {
              this.explorer.setState({ errors: [strings.errorDownloadFailure] })
            }
          }}
          datasetElement={
            <DataSourceButton
              getPicker={() => this.dataSourcePicker!}
              {...dataSourceProps}
            />
          }
          topBarButtonProps={[
            {
              key: 'theme',
              text: this.state.darkTheme
                ? strings.buttonThemeLight
                : strings.buttonThemeDark,
              iconProps: {
                iconName: this.state.darkTheme ? 'Sunny' : 'ClearNight',
              },
              onClick: () => {
                const darkTheme = !this.state.darkTheme
                this.props.setTheme && this.props.setTheme(darkTheme)
                this.setState({ darkTheme })
                this.changeColorScheme(darkTheme)
              },
            },
          ]}
          viewerOptions={this.viewerOptions}
          compactUI={this.state.compactUI}
          additionalSettings={[
            {
              groupLabel: strings.labelPreferences,
              children: (
                <base.fluentUI.Toggle
                  label={strings.labelCompactUI}
                  title={strings.labelCompactUIDescription}
                  checked={this.state.compactUI}
                  onChange={(e, checked) => {
                    if (checked) {
                      localStorage.setItem(COMPACT_UI_KEY, 'true')
                    } else {
                      localStorage.removeItem(COMPACT_UI_KEY)
                    }
                    if (checked !== undefined)
                      this.setState({ compactUI: checked })
                  }}
                />
              ),
            },
          ]}
        ></Explorer>
        <DataSourcePicker
          ref={(dsp) => {
            if (dsp && !this.dataSourcePicker) this.dataSourcePicker = dsp
          }}
          theme={theme}
          {...dataSourceProps}
        />
      </section>
    )
  }
}
