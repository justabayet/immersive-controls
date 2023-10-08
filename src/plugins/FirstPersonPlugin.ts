import { Quaternion, Spherical, Vector2, Vector3, type Object3D } from 'three'
import { ControlPlugin } from './ControlPluginInterface'
import { PLUGIN_KEYS } from './keys'
import { isMobile } from '../helpers'
import { Logger } from '../Logger'

interface SphericalAnglesUnbounded {
  phi: number
  theta: number
}

/**
 *
 * **Notes**
 * - Object named with the prefix "direction" are Spherical. There angles `phi`and `theta` are bounded [-PI, PI].
 * - Object named with the prefix "angles" are Object. There angles `phi`and `theta` are not bounded.
 */
class FirstPersonPlugin extends ControlPlugin {
  public readonly key = PLUGIN_KEYS.firstPersonControls
  private readonly object: Object3D
  private readonly rotationOrigin: Vector3
  private readonly directionOrigin: Spherical
  private readonly domElement: HTMLCanvasElement

  rotateReverse: boolean
  rotateSpeed: number

  private readonly directionResult: Spherical
  /** Angles between initial object direction and target one. Unbounded values. */
  private readonly anglesDelta: SphericalAnglesUnbounded
  /** Current angles of the object */
  private readonly anglesCurrent: SphericalAnglesUnbounded

  /** Screen position where user started interaction */
  private readonly rotateStart: Vector2
  /** Screen position where user ended interaction */
  private readonly rotateEnd: Vector2
  /** Delta between where user started and ended */
  private readonly rotateDelta: Vector2

  private readonly offset: Vector3

  private readonly quat: Quaternion
  private readonly quatInverse: Quaternion

  private pointersCounter: number = 0

  private readonly onContextMenu: (event: MouseEvent) => void
  private readonly onPointerUp: (event: PointerEvent) => void
  private readonly onPointerDown: (event: PointerEvent) => void
  private readonly onPointerMove: (event: PointerEvent) => void

  constructor(object: Object3D, domElement: HTMLCanvasElement) {
    super()

    this.object = object
    this.rotationOrigin = this.object.getWorldDirection(new Vector3())
    this.directionOrigin = new Spherical().setFromVector3(this.rotationOrigin)
    this.domElement = domElement
    this.domElement.style.touchAction = 'none' // disable touch scroll
    Logger.debug('Touch scroll disabled')

    this.enabled = true

    if (isMobile()) {
      this.rotateSpeed = 0.6
    } else {
      this.rotateSpeed = 0.3
    }
    this.rotateReverse = true

    this.directionResult = new Spherical()

    const directionCurrent = new Spherical()
    directionCurrent.setFromVector3(this.rotationOrigin)
    this.anglesCurrent = {
      phi: directionCurrent.phi,
      theta: directionCurrent.theta
    }

    this.anglesDelta = { phi: 0, theta: 0 }

    this.rotateStart = new Vector2()
    this.rotateEnd = new Vector2()
    this.rotateDelta = new Vector2()

    this.offset = new Vector3()

    // so camera.up is the orbit axis
    this.quat = new Quaternion().setFromUnitVectors(this.object.up, new Vector3(0, 1, 0))
    this.quatInverse = this.quat.clone().invert()

    function onContextMenu(controls: FirstPersonPlugin) {
      return (event: MouseEvent) => {
        if (!controls.enabled) return

        event.preventDefault()
      }
    }

    this.onContextMenu = onContextMenu(this)

    function onPointerUp(controls: FirstPersonPlugin) {
      return (event: PointerEvent) => {
        controls.removePointer(event)

        if (controls.pointersCounter === 0) {
          controls.domElement.releasePointerCapture(event.pointerId)

          controls.domElement.removeEventListener('pointermove', controls.onPointerMove)
          controls.domElement.removeEventListener('pointerup', controls.onPointerUp)
        }
      }
    }
    this.onPointerUp = onPointerUp(this)

    function onPointerDown(controls: FirstPersonPlugin) {
      return (event: PointerEvent) => {
        if (!controls.enabled) return

        if (controls.pointersCounter === 0) {
          controls.domElement.setPointerCapture(event.pointerId)

          controls.domElement.addEventListener('pointermove', controls.onPointerMove)
          controls.domElement.addEventListener('pointerup', controls.onPointerUp)
        }

        controls.rotateStart.set(event.clientX, event.clientY)

        controls.addPointer(event)
      }
    }
    this.onPointerDown = onPointerDown(this)

    function onPointerMove(controls: FirstPersonPlugin): any {
      return (event: PointerEvent) => {
        if (!controls.enabled) return

        controls.rotateEnd.set(event.clientX, event.clientY)

        const rotateSpeed = controls.rotateReverse ? -controls.rotateSpeed : controls.rotateSpeed

        controls.rotateDelta.subVectors(controls.rotateEnd, controls.rotateStart).multiplyScalar(rotateSpeed)

        const ratio = (2 * Math.PI) / controls.domElement.clientHeight // yes, height for both
        controls.rotateLeft(ratio * controls.rotateDelta.x)
        controls.rotateUp(ratio * controls.rotateDelta.y)

        controls.rotateStart.copy(controls.rotateEnd)
      }
    }
    this.onPointerMove = onPointerMove(this)

    this.domElement.addEventListener('contextmenu', this.onContextMenu)
    this.domElement.addEventListener('pointerdown', this.onPointerDown)
    this.domElement.addEventListener('pointercancel', this.onPointerUp)
  }

  update(): any {
    this.offset.copy(this.rotationOrigin)

    // rotate offset to "y-axis-is-up" space
    this.offset.applyQuaternion(this.quat)

    // angle from z-axis around y-axis
    this.directionOrigin.setFromVector3(this.offset)

    // Get desired target
    const anglesTarget: SphericalAnglesUnbounded = {
      theta: this.directionOrigin.theta + this.anglesDelta.theta,
      phi: this.directionOrigin.phi + this.anglesDelta.phi
    }

    // If inertia enabled find intermediary target
    if (this.enableInertia) {
      anglesTarget.theta =
        this.anglesCurrent.theta + (anglesTarget.theta - this.anglesCurrent.theta) * this.inertiaFactor
      anglesTarget.phi = this.anglesCurrent.phi + (anglesTarget.phi - this.anglesCurrent.phi) * this.inertiaFactor
    }

    // Save unbounded angles value
    this.anglesCurrent.theta = anglesTarget.theta
    this.anglesCurrent.phi = anglesTarget.phi

    // Find actual new angles
    this.directionResult.theta = this.anglesCurrent.theta
    this.directionResult.phi = this.anglesCurrent.phi

    this.directionResult.makeSafe()

    this.offset.setFromSpherical(this.directionResult)

    // rotate offset back to "camera-up-vector-is-up" space
    this.offset.applyQuaternion(this.quatInverse)

    this.object.lookAt(this.offset.add(this.object.position))
  }

  dispose(): void {
    this.domElement.removeEventListener('contextmenu', this.onContextMenu)

    this.domElement.removeEventListener('pointerdown', this.onPointerDown)
    this.domElement.removeEventListener('pointercancel', this.onPointerUp)

    this.domElement.removeEventListener('pointermove', this.onPointerMove)
    this.domElement.removeEventListener('pointerup', this.onPointerUp)
  }

  rotateLeft(angle: number): void {
    this.anglesDelta.theta -= angle
  }

  rotateUp(angle: number): void {
    this.anglesDelta.phi += angle
  }

  addPointer(_: PointerEvent): void {
    this.pointersCounter += 1
  }

  removePointer(_: PointerEvent): void {
    this.pointersCounter -= 1
  }

  updateInitialRotation(newRotationOrigin: Vector3): void {
    this.rotationOrigin.copy(newRotationOrigin)
    this.directionOrigin.setFromVector3(this.rotationOrigin)
  }

  getInitialRotation(): Vector3 {
    return this.rotationOrigin.clone()
  }
}

export { FirstPersonPlugin }
