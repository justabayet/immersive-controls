import { ControlInterface } from '../ControlInterface'

export class ControlPlugin extends ControlInterface {
  protected enabled: boolean = false

  enableInertia: boolean = true
  inertiaFactor: number = 0.2

  /** Key used to identify a plugin to make it selectable. */
  public key: string = 'ControlPlugin'

  setEnabled(value: boolean): void {
    this.enabled = value
  }

  isEnabled(): boolean {
    return this.enabled
  }

  updateOffset(): void {
    return undefined
  }
}
