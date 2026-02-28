import { useEffect } from 'react'
import { getAblyRealtimeClient } from '../services/ablyRealtime'

type MessageCallback = (data: unknown, message: unknown) => void

export function useAblyChannel(channelName: string | null | undefined, eventName: string, callback: MessageCallback) {
  useEffect(() => {
    if (!channelName || !eventName || typeof callback !== 'function') return

    const client = getAblyRealtimeClient()
    const channel = client.channels.get(channelName)
    const handler = (message: any) => {
      callback(message?.data, message)
    }

    channel.subscribe(eventName, handler)

    return () => {
      channel.unsubscribe(eventName, handler)
    }
  }, [channelName, eventName, callback])
}
