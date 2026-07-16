import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('artemis', {
  getState: () => ipcRenderer.invoke('state:get'),
  onState: (cb) => {
    const listener = (_e, state) => cb(state)
    ipcRenderer.on('state', listener)
    return () => ipcRenderer.removeListener('state', listener)
  },
  setSettings: (patch) => ipcRenderer.invoke('settings:set', patch),
  inaraRefresh: () => ipcRenderer.invoke('inara:refresh'),
  toggleOverlay: () => ipcRenderer.invoke('overlay:toggle'),
  toggleClickThrough: () => ipcRenderer.invoke('overlay:clickthrough'),
  clearVault: () => ipcRenderer.invoke('vault:clear'),
  minimize: () => ipcRenderer.invoke('win:minimize'),
  close: () => ipcRenderer.invoke('win:close'),
  searchTargets: (species) => ipcRenderer.invoke('targets:search', species),
  updateDownload: () => ipcRenderer.invoke('update:download'),
  plotRoute: (opts) => ipcRenderer.invoke('route:plot', opts),
  importRoute: () => ipcRenderer.invoke('route:import'),
  clearRoute: () => ipcRenderer.invoke('route:clear'),
  getSlef: () => ipcRenderer.invoke('ship:slef')
})
