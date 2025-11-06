'use client'

import { useState, useEffect, useRef } from 'react'
import useSWR from 'swr'
import { useSession } from 'next-auth/react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import { getPusherClient } from '@/lib/pusher-client'

const fetcher = (url: string) => fetch(url).then((res) => res.json())

interface ChatProps {
  taskId: string
}

export function Chat({ taskId }: ChatProps) {
  const { data: session } = useSession()
  const { data: messages, mutate } = useSWR(
    taskId ? `/api/v1/tasks/${taskId}/messages` : null,
    fetcher
  )
  const pusherRef = useRef<any>(null)
  const channelRef = useRef<any>(null)

  const [message, setMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Set up Pusher for real-time messaging
  useEffect(() => {
    const pusher = getPusherClient()
    if (!pusher || !taskId) return

    pusherRef.current = pusher
    const channel = pusher.subscribe(`task-${taskId}`)
    channelRef.current = channel

    channel.bind('new-message', () => {
      mutate() // Refresh messages when new message arrives
    })

    return () => {
      channel.unbind_all()
      channel.unsubscribe()
      pusher.disconnect()
    }
  }, [taskId, mutate])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!message.trim() || isSubmitting) return

    setIsSubmitting(true)
    try {
      const response = await fetch(`/api/v1/tasks/${taskId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: message }),
      })

      if (!response.ok) {
        throw new Error('Failed to send message')
      }

      setMessage('')
      mutate()
    } catch (error: any) {
      toast.error(error.message || 'Failed to send message')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!session) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Please sign in to view messages
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="flex flex-col h-[600px]">
      <CardHeader>
        <CardTitle>Messages</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto space-y-4 mb-4">
          {messages && messages.length > 0 ? (
            messages.map((msg: any) => {
              const isOwn = msg.senderId === session.user?.id
              return (
                <div
                  key={msg.id}
                  className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[70%] rounded-lg p-3 ${
                      isOwn
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      {!isOwn && msg.sender?.avatarUrl && (
                        <img
                          src={msg.sender.avatarUrl}
                          alt={msg.sender.name || 'User'}
                          className="w-6 h-6 rounded-full"
                        />
                      )}
                      <span className="text-sm font-medium">
                        {isOwn ? 'You' : msg.sender?.name || 'User'}
                      </span>
                    </div>
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                    <p className="text-xs opacity-70 mt-1">
                      {format(new Date(msg.createdAt), 'h:mm a')}
                    </p>
                  </div>
                </div>
              )
            })
          ) : (
            <div className="text-center text-muted-foreground py-8">
              No messages yet. Start the conversation!
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <form onSubmit={handleSubmit} className="flex gap-2">
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 min-h-[60px]"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSubmit(e)
              }
            }}
          />
          <Button type="submit" disabled={!message.trim() || isSubmitting}>
            Send
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

