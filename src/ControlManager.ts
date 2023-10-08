import { type Vector3 } from 'three'
import { type ControlPlugin } from './plugins/ControlPluginInterface'
import { ControlInterface } from './ControlInterface'
import { Logger } from './Logger'

class ControlManager extends ControlInterface {
  private readonly plugins: ControlPlugin[] = []
  private currentPluginIndex: number = 0

  constructor(isVerbose: boolean = false) {
    super()
    Logger.isVerbose = isVerbose
  }

  public addPlugin(plugin: ControlPlugin): void {
    this.plugins.push(plugin)
    Logger.debug('ControlManager: plugin added', plugin)
  }

  public containsPlugin(key: string): boolean {
    return !!this.plugins.find((plugin) => plugin.key === key)
  }

  public switchControl(): void {
    if (this.plugins.length === 0) throw new Error("ControlManager doesn't have any control plugins setup yet")

    this.setCurrentControl((this.currentPluginIndex + 1) % this.plugins.length)
  }

  public enableControl(key: string): void {
    const controlIndex = this.plugins.findIndex((plugin) => plugin.key === key)

    if (controlIndex === -1) throw new Error(`ControlManager doesn't have any control plugins of key ${key} setup yet`)

    this.setCurrentControl(controlIndex)
  }

  private setCurrentControl(index: number): void {
    this.getCurrentPlugin().setEnabled(false)
    this.currentPluginIndex = index
    this.getCurrentPlugin().setEnabled(true)
  }

  public isControlEnabled(key: string): boolean {
    const foundPlugin = this.plugins.find((plugin) => plugin.key === key)

    if (!foundPlugin) return false

    return foundPlugin.isEnabled()
  }

  public update(): void {
    this.getCurrentPlugin().update()
  }

  private getCurrentPlugin(): ControlPlugin {
    return this.plugins[this.currentPluginIndex]
  }

  public getInitialRotation(): Vector3 {
    return this.getCurrentPlugin().getInitialRotation()
  }

  public updateInitialRotation(newRotationOrigin: Vector3): void {
    this.getCurrentPlugin().updateInitialRotation(newRotationOrigin)
  }

  public updateOffset(): void {
    for (const plugin of this.plugins) {
      plugin.updateOffset()
    }
  }
}

export { ControlManager }
