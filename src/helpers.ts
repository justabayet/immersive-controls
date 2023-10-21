import { Euler, Vector3, Quaternion } from 'three'
import { Logger } from './Logger'

export function isMobile(): boolean {
  // Check if the user is usign a mobile device. https://stackoverflow.com/questions/11381673/detecting-a-mobile-browser
  const toMatch = [/Android/i, /webOS/i, /iPhone/i, /iPad/i, /iPod/i, /BlackBerry/i, /Windows Phone/i]

  const isMatching = toMatch.some((toMatchItem) => {
    return toMatchItem.exec(navigator.userAgent)
  })

  return isMatching
}

export const setObjectQuaternion = (() => {
  const zee = new Vector3(0, 0, 1)
  const euler = new Euler()
  const q0 = new Quaternion()
  const q1 = new Quaternion(-Math.sqrt(0.5), 0, 0, Math.sqrt(0.5)) // - PI/2 around the x-axis

  return (quaternion: Quaternion, alpha: number, beta: number, gamma: number, orient: number): void => {
    euler.set(beta, alpha, -gamma, 'YXZ') // 'ZXY' for the device, but 'YXZ' for us
    quaternion.setFromEuler(euler) // orient the device
    quaternion.multiply(q1) // camera looks out the back of the device, not the top
    quaternion.multiply(q0.setFromAxisAngle(zee, -orient)) // adjust for screen orientation
  }
})()

interface DeviceOrientationEventiOS extends DeviceOrientationEvent {
  requestPermission?: () => Promise<'granted' | 'denied'>
}

type PermissionStatus = 'granted' | 'denied' | 'unsupported'

export async function askGyroscopePermission(): Promise<PermissionStatus> {
  // source : https://leemartin.dev/how-to-request-device-motion-and-orientation-permission-in-ios-13-74fc9d6cd140
  Logger.debug('askGyroscopePermission')

  if (!window.DeviceOrientationEvent) {
    Logger.debug('askGyroscopePermission: !window.DeviceOrientationEvent', { DeviceOrientationEvent: !window.DeviceOrientationEvent })
    return 'unsupported'
  }

  const requestPermission = (window.DeviceOrientationEvent as unknown as DeviceOrientationEventiOS).requestPermission
  Logger.debug('askGyroscopePermission: requestPermission', { requestPermission })

  const isIOs = typeof requestPermission === 'function'
  if (isIOs) {
    const requestResponse = await requestPermission()
      .then((response) => {
        Logger.debug('askGyroscopePermission: iOS requestPermission response', { response })
        return response
      })
      .catch((reason) => {
        Logger.debug('askGyroscopePermission: Could\'nt get permission for gyroscope.', reason)
        return 'unsupported'
      })
    return requestResponse as PermissionStatus
  } else {
    const queryValue = await navigator.permissions.query({ name: 'gyroscope' } as any)
    Logger.debug('askGyroscopePermission: no iOS', { queryValue })
    const state = queryValue.state
    return state !== 'granted' ? 'unsupported' : 'granted'
  }
}
