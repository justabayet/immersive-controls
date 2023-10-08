import { type Vector3 } from 'three'

export class ControlInterface {
  update(): any {
    throw new Error('ControlPlugin parent class "update" method should be overwritten')
  }

  updateInitialRotation(_: Vector3): void {
    throw new Error('ControlPlugin parent class "updateInitialRotation" method should be overwritten')
  }

  getInitialRotation(): Vector3 {
    throw new Error('ControlPlugin parent class "getInitialRotation" method should be overwritten')
  }
}
