import { Vector3, Quaternion, Object3D, MathUtils } from 'three'
import { ControlPlugin } from './ControlPluginInterface'
import { PLUGIN_KEYS } from './keys'
import { type Orientation } from '../types'
import Swal from 'sweetalert2'
import { Logger } from '../Logger'
import { askGyroscopePermission, setObjectQuaternion } from '../helpers'

class GyroscopePlugin extends ControlPlugin {
  key = PLUGIN_KEYS.gyroscopeControls

  private readonly object: Object3D
  private deviceOrientation?: DeviceOrientationEvent
  private readonly initialObject: Object3D
  private readonly rotationOrigin: Vector3
  private readonly initialRotation: Quaternion

  private readonly onBecomingAvailable: () => void
  private readonly logUpdateDirection?: (orientation: Orientation) => void

  private readonly gyroOffset = {
    alpha: 0,
    beta: 0,
    gamma: 0
  }

  private static isSupported: boolean = false

  private readonly screenOrientation: number = 0

  private static permissionAsked: boolean = false

  private targetQuaternion: Quaternion = new Quaternion()

  constructor(
    object: Object3D,
    onBecomingAvailable: () => void = () => {
      this.setEnabled(true)
    },
    logUpdateDirection?: (orientation: Orientation) => void
  ) {
    super()

    this.object = object
    this.rotationOrigin = this.object.getWorldDirection(new Vector3())
    this.initialRotation = new Quaternion().copy(this.object.quaternion)
    this.initialObject = new Object3D()

    this.onBecomingAvailable = onBecomingAvailable
    this.logUpdateDirection = logUpdateDirection

    Logger.debug('Gyroscope  constructor:', { isSupported: GyroscopePlugin.isSupported, permissionAsked: !GyroscopePlugin.permissionAsked })

    if (GyroscopePlugin.isSupported) {
      this.setupSupport()
    } else if (!GyroscopePlugin.permissionAsked) {
      this.askPermission()
    } else {
      Logger.debug('Gyroscope  not supported')
    }
  }

  private askPermission(): void {
    GyroscopePlugin.permissionAsked = true

    askGyroscopePermission()
      .then((canUse) => {
        Logger.debug('Answer askGyroscopePermission', { canUse })
        switch (canUse) {
          case 'granted':
            this.setupSupport()
            break
          case 'denied':
            Swal.fire({
              title: 'Gyroscope access denied',
              text: 'The experience will be degraded.',
              confirmButtonText: 'I Understand, Proceed Anyway :('
            })
            break
          default: // unsupported
            Swal.fire({
              title: 'Gyroscope blocked',
              text: 'Experience limited. Consider using Google Chrome, or enable gyroscope access in your current browser settings.',
              confirmButtonText: 'I Understand, Proceed Anyway :('
            })
        }
      })
      .catch((reason) => {
        Logger.debug('Error occured while getting permission for gyroscope', reason)
      })
  }

  private setupSupport(): void {
    Logger.debug('Gyroscope controls setup')
    const onOrientationDataAvailable = (event: DeviceOrientationEvent): void => {
      this.deviceOrientation = event
      // If the first time this event is triggered with a value in the alpha field.
      // It means that the device support this feature.
      if (!GyroscopePlugin.isSupported && event.alpha != null) {
        Logger.debug('Gyroscope value received')
        this.onBecomingAvailable()
        this.updateOffset()
        GyroscopePlugin.isSupported = true
      }
    }

    window.addEventListener('deviceorientation', onOrientationDataAvailable)
  }

  public update(): any {
    if (!this.enabled) {
      Logger.debug('Trying to update gyro controls. But it is not in used.')
    } else {
      if (this.deviceOrientation == null) return

      if (this.logUpdateDirection) this.logUpdateDirection(this.deviceOrientation)

      const { alpha, beta, gamma, orient } = this.getUpdatedQuatValues(this.deviceOrientation)

      // There was a bug, when alpha reached 0 the camera jumped. This is a dead simple dirty workaround fixing it.
      if (alpha === 0) return

      this.updateObjectRotation(alpha, beta, gamma, orient)

      return this.deviceOrientation
    }
  }

  private getUpdatedQuatValues(orientation: Orientation) {
    const alpha = orientation.alpha != null ? MathUtils.degToRad(orientation.alpha + this.gyroOffset.alpha) : 0 // Z
    const beta = orientation.beta != null ? MathUtils.degToRad(orientation.beta + this.gyroOffset.beta) : 0 // X'
    const gamma = orientation.gamma != null ? MathUtils.degToRad(orientation.gamma + this.gyroOffset.gamma) : 0 // Y''
    const orient = this.screenOrientation != null ? MathUtils.degToRad(this.screenOrientation) : 0 // O

    return { alpha, beta, gamma, orient }
  }

  private updateObjectRotation(alpha: number, beta: number, gamma: number, orient: number) {
    setObjectQuaternion(this.targetQuaternion, alpha, beta, gamma, orient)

    this.targetQuaternion = this.initialRotation.clone().multiply(this.targetQuaternion)

    if (this.enableInertia) {
      this.object.quaternion.slerp(this.targetQuaternion, this.inertiaFactor)
    } else {
      this.object.quaternion.copy(this.targetQuaternion)
    }
  }

  updateOffset(): void {
    if (this.deviceOrientation == null || this.deviceOrientation?.alpha === null) return
    this.gyroOffset.alpha = -this.deviceOrientation.alpha
  }

  updateInitialRotation(newRotationOrigin: Vector3): void {
    this.rotationOrigin.copy(newRotationOrigin)

    this.initialObject.lookAt(new Vector3().sub(newRotationOrigin))

    this.initialRotation.copy(this.initialObject.quaternion)
  }

  getInitialRotation(): Vector3 {
    return this.rotationOrigin.clone()
  }
}

export { GyroscopePlugin }
