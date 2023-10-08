import { Euler, Vector3, Quaternion } from 'three'
import { Logger } from './Logger'

export function isMobile(): boolean {
  // Check if the user is usign a mobile device. https://stackoverflow.com/questions/11381673/detecting-a-mobile-browser

  // First method working on all devices.
  const toMatch = [/Android/i, /webOS/i, /iPhone/i, /iPad/i, /iPod/i, /BlackBerry/i, /Windows Phone/i]

  const isMatching = toMatch.some((toMatchItem) => {
    return navigator.userAgent.match(toMatchItem)
  })

  // Seconde method. Not compatible with all devices.
  // Especially problematic for Iphone using Safari and WebView Android when the site opens up there.
  // https://developer.mozilla.org/en-US/docs/Web/API/Navigator/userAgentData

  // const isMobile = navigator.userAgentData.mobile;

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

  try {
    const requestPermission = (DeviceOrientationEvent as unknown as DeviceOrientationEventiOS).requestPermission
    const isIOs = typeof requestPermission === 'function'
    if (isIOs) {
      const requestResponse = await requestPermission()
        .then((response) => {
          return response
        })
        .catch((reason) => {
          Logger.debug("Could'nt get permission for gyroscope.", reason)
          return 'unsupported'
        })
      return requestResponse as PermissionStatus
    } else {
      const queryValue = await navigator.permissions.query({ name: 'gyroscope' } as any)
      const state = queryValue.state
      return state !== 'granted' ? 'unsupported' : 'granted'
    }
  } catch (error: any) {
    if (error instanceof ReferenceError) {
      return 'granted'
    } else {
      throw error
    }
  }
}