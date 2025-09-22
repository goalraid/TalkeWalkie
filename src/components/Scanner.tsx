import { BrowserQRCodeReader } from '@zxing/browser'
import type { IScannerControls } from '@zxing/browser'
import React from 'react'

type ScannerProps = {
  onDetected: (text: string) => void
  onError?: (message: string) => void
}

export const Scanner: React.FC<ScannerProps> = ({ onDetected, onError }) => {
  const videoRef = React.useRef<HTMLVideoElement | null>(null)
  const controlsRef = React.useRef<IScannerControls | null>(null)

  React.useEffect(() => {
    const reader = new BrowserQRCodeReader()
    const videoElement = videoRef.current

    if (!videoElement) {
      return undefined
    }

    let cancelled = false

    const start = async () => {
      try {
        const devices = await BrowserQRCodeReader.listVideoInputDevices()
        const preferredDeviceId =
          devices.find((device) => /back|rear|environment/i.test(device.label))?.deviceId ||
          devices[0]?.deviceId

        if (!preferredDeviceId) {
          throw new Error('No camera found. Please attach a camera and try again.')
        }

        const controls = await reader.decodeFromVideoDevice(
          preferredDeviceId,
          videoElement,
          (result, _error, controls) => {
            if (!result) {
              return
            }

            controlsRef.current = controls
            controls.stop()
            if (navigator.vibrate) navigator.vibrate(40)
            if (!cancelled) {
              onDetected(result.getText())
            }
          },
        )

        controlsRef.current = controls
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Camera error'
        console.error('[Scanner] failed to start', error)
        if (!cancelled) {
          onError?.(message)
        }
      }
    }

    start().catch((error) => {
      console.error('[Scanner] unexpected start failure', error)
    })

    return () => {
      cancelled = true
      controlsRef.current?.stop()
      const stream = videoElement.srcObject as MediaStream | null
      stream?.getTracks().forEach((track) => track.stop())
      videoElement.srcObject = null
    }
  }, [onDetected, onError])

  return (
    <div className="scanner">
      <div className="scanner__video-wrapper">
        <video ref={videoRef} className="scanner__video" autoPlay playsInline muted />
        <div className="scanner__overlay" aria-hidden />
      </div>
      <p className="scanner__hint">Align the QR code within the frame</p>
    </div>
  )
}
