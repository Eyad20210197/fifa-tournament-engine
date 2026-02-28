import { useEffect } from 'react'
import { getAblyRealtimeClient } from '../services/ablyRealtime'

type MessageCallback = (data: unknown, message: unknown) => void

export function useAblyChannel(channelName: string | null | undefined, eventName: string, callback: MessageCallback) {
  useEffect(() => {
    if (!channelName || !eventName || typeof callback !== 'function') return

    const client = getAblyRealtimeClient()
    const channel = client.channels.get(channelName)
    const handler = (message: any) => {
      console.debug('[ABLY] Received message:', {
        channel: channelName,
        event: eventName,
        messageName: message?.name,
        data: message?.data,
      })
      callback(message?.data, message)
    }

    console.log('[ABLY SUBSCRIBE]', channelName, eventName)
    channel.subscribe(eventName, handler)

    return () => {
      console.debug('[ABLY] Unsubscribing from channel/event:', {
        channel: channelName,
        event: eventName,
      })
      channel.unsubscribe(eventName, handler)
    }
  }, [channelName, eventName, callback])
}
