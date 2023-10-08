import { Euler, Vector3, Quaternion, Object3D, MathUtils } from 'three'
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

    if (GyroscopePlugin.isSupported) {
      this.setupSupport()
    } else {
      if (!GyroscopePlugin.permissionAsked) {
        this.askPermission()
      } else {
        Logger.debug('Gyroscope  not supported')
      }
    }
  }

  private askPermission(): void {
    GyroscopePlugin.permissionAsked = true

    askGyroscopePermission()
      .then((canUse) => {
        switch (canUse) {
          case 'granted':
            this.setupSupport()
            break
          case 'denied':
            void Swal.fire({
              title: 'Gyroscope access denied',
              text: 'The experience will be degraded.',
              confirmButtonText: 'I Understand, Proceed Anyway :('
            })
            break
          default: // unsupported
            void Swal.fire({
              title: 'Gyroscope blocked',
              text: 'Your experience may be limited. Please consider using a different browser such as Google Chrome, or enable gyroscope access in your current browser settings.',
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
      if (this.deviceOrientation == null) {
        return
      }

      if (this.logUpdateDirection) this.logUpdateDirection(this.deviceOrientation)

      const alpha =
        this.deviceOrientation.alpha != null
          ? MathUtils.degToRad(this.deviceOrientation.alpha + this.gyroOffset.alpha)
          : 0 // Z
      const beta =
        this.deviceOrientation.beta != null ? MathUtils.degToRad(this.deviceOrientation.beta + this.gyroOffset.beta) : 0 // X'
      const gamma =
        this.deviceOrientation.gamma != null
          ? MathUtils.degToRad(this.deviceOrientation.gamma + this.gyroOffset.gamma)
          : 0 // Y''
      const orient = this.screenOrientation != null ? MathUtils.degToRad(this.screenOrientation) : 0 // O

      // There was a bug, when alpha reached 0 the camera jumped. This is a dead simple dirty workaround fixing it.
      if (alpha === 0) {
        return
      }

      setObjectQuaternion(this.targetQuaternion, alpha, beta, gamma, orient)

      this.targetQuaternion = this.initialRotation.clone().multiply(this.targetQuaternion)

      if (this.enableInertia) {
        this.object.quaternion.slerp(this.targetQuaternion, this.inertiaFactor)
      } else {
        this.object.quaternion.copy(this.targetQuaternion)
      }

      return this.deviceOrientation
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
