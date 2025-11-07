'use client'

import { useState, useEffect, useRef } from 'react'
import useSWR from 'swr'
import { useSession } from 'next-auth/react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { format, isToday, isYesterday } from 'date-fns'
import toast from 'react-hot-toast'
import { getPusherClient } from '@/lib/pusher-client'
import { Send, Circle, User } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

const fetcher = (url: string) => fetch(url).then((res) => res.json())

interface ChatProps {
  taskId: string
  otherUser?: {
    id: string
    name: string | null
    avatarUrl: string | null
  }
}

export function Chat({ taskId, otherUser }: ChatProps) {
  const { data: session } = useSession()
  const { data: messages, mutate } = useSWR(
    taskId ? `/api/v1/tasks/${taskId}/messages` : null,
    fetcher,
    {
      refreshInterval: 3000, // Poll every 3 seconds for new messages
      revalidateOnFocus: true, // Refresh when tab becomes active
    }
  )
  const pusherRef = useRef<any>(null)
  const channelRef = useRef<any>(null)
  const presenceChannelRef = useRef<any>(null)
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)

  const [message, setMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set())
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set())

  // Set up Pusher for real-time messaging with private channel
  useEffect(() => {
    const pusher = getPusherClient()
    if (!pusher || !taskId || !session?.user?.id) return

    pusherRef.current = pusher
    
    // Subscribe to private message channel
    const channel = pusher.subscribe(`private-task-${taskId}`)
    channelRef.current = channel

    channel.bind('new-message', () => {
      mutate() // Refresh messages when new message arrives
    })

    channel.bind('typing', (data: { userId: string; isTyping: boolean }) => {
      if (data.userId === session.user?.id) return
      
      setTypingUsers((prev) => {
        const next = new Set(prev)
        if (data.isTyping) {
          next.add(data.userId)
        } else {
          next.delete(data.userId)
        }
        return next
      })
    })

    // Subscribe to presence channel for online/offline tracking
    const presenceChannel = pusher.subscribe(`presence-task-${taskId}`)
    presenceChannelRef.current = presenceChannel

    presenceChannel.bind('pusher:subscription_succeeded', (members: any) => {
      const online = new Set<string>()
      members.each((member: any) => {
        if (member.id !== session.user?.id) {
          online.add(member.id)
        }
      })
      setOnlineUsers(online)
    })

    presenceChannel.bind('pusher:member_added', (member: any) => {
      if (member.id !== session.user?.id) {
        setOnlineUsers((prev) => new Set(prev).add(member.id))
      }
    })

    presenceChannel.bind('pusher:member_removed', (member: any) => {
      setOnlineUsers((prev) => {
        const next = new Set(prev)
        next.delete(member.id)
        return next
      })
      setTypingUsers((prev) => {
        const next = new Set(prev)
        next.delete(member.id)
        return next
      })
    })

    return () => {
      channel.unbind_all()
      channel.unsubscribe()
      presenceChannel.unbind_all()
      presenceChannel.unsubscribe()
    }
  }, [taskId, mutate, session?.user?.id])

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight
    }
  }, [messages])

  const handleTyping = () => {
    if (!channelRef.current || !session?.user?.id) return

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }

    // Emit typing start
    channelRef.current.trigger('client-typing', {
      userId: session.user.id,
      isTyping: true,
    })

    // Emit typing stop after 3 seconds of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      channelRef.current?.trigger('client-typing', {
        userId: session.user?.id,
        isTyping: false,
      })
    }, 3000)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!message.trim() || isSubmitting) return

    // Stop typing indicator
    if (channelRef.current && session?.user?.id) {
      channelRef.current.trigger('client-typing', {
        userId: session.user.id,
        isTyping: false,
      })
    }
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }

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

  // Format timestamp
  const formatMessageTime = (date: Date) => {
    if (isToday(date)) {
      return format(date, 'h:mm a')
    } else if (isYesterday(date)) {
      return `Yesterday ${format(date, 'h:mm a')}`
    } else {
      return format(date, 'MMM d, h:mm a')
    }
  }

  // Group consecutive messages from same sender
  const groupMessages = (messages: any[]) => {
    if (!messages || messages.length === 0) return []
    
    const grouped: any[] = []
    let currentGroup: any = null

    messages.forEach((msg, index) => {
      const isOwn = msg.senderId === session?.user?.id
      const prevMsg = index > 0 ? messages[index - 1] : null
      const isSameSender = prevMsg && prevMsg.senderId === msg.senderId
      const timeDiff = prevMsg 
        ? new Date(msg.createdAt).getTime() - new Date(prevMsg.createdAt).getTime()
        : Infinity
      const isConsecutive = timeDiff < 5 * 60 * 1000 // 5 minutes

      if (isSameSender && isConsecutive && currentGroup) {
        currentGroup.messages.push(msg)
      } else {
        currentGroup = {
          senderId: msg.senderId,
          sender: msg.sender,
          isOwn,
          messages: [msg],
        }
        grouped.push(currentGroup)
      }
    })

    return grouped
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

  // Get other user info
  const otherUserId = messages?.[0]?.receiverId || otherUser?.id
  const isOtherUserOnline = otherUserId ? onlineUsers.has(otherUserId) : false
  const isOtherUserTyping = otherUserId ? typingUsers.has(otherUserId) : false
  const groupedMessages = groupMessages(messages || [])

  return (
    <Card className="flex flex-col h-[600px] overflow-hidden">
      {/* Header */}
      <CardHeader className="border-b pb-3 px-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {otherUser && (
              <>
                <Avatar className="h-10 w-10">
                  <AvatarImage src={otherUser.avatarUrl || undefined} alt={otherUser.name || 'User'} />
                  <AvatarFallback>
                    {otherUser.name ? (
                      otherUser.name.charAt(0).toUpperCase()
                    ) : (
                      <User className="h-5 w-5" />
                    )}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm">{otherUser.name || 'User'}</span>
                    {isOtherUserOnline && (
                      <Badge variant="outline" className="text-xs px-1.5 py-0 h-5 border-green-500">
                        <Circle className="w-2 h-2 fill-green-500 text-green-500 mr-1" />
                        Online
                      </Badge>
                    )}
                  </div>
                  {isOtherUserTyping && (
                    <p className="text-xs text-muted-foreground italic">
                      typing...
                    </p>
                  )}
                </div>
              </>
            )}
            {!otherUser && (
              <span className="font-semibold text-sm">Messages</span>
            )}
          </div>
        </div>
      </CardHeader>

      {/* Messages Container */}
      <CardContent className="flex-1 flex flex-col overflow-hidden p-0">
        <div 
          ref={messagesContainerRef}
          className="flex-1 overflow-y-auto px-4 py-4 space-y-1"
        >
          {groupedMessages.length > 0 ? (
            groupedMessages.map((group, groupIndex) => {
              const isOwn = group.isOwn
              const showAvatar = !isOwn && (groupIndex === 0 || groupedMessages[groupIndex - 1].isOwn)
              
              return (
                <div
                  key={`group-${groupIndex}`}
                  className={`flex gap-2 ${isOwn ? 'justify-end' : 'justify-start'} mb-1`}
                >
                  {/* Avatar for received messages */}
                  {!isOwn && (
                    <div className="flex-shrink-0 w-8">
                      {showAvatar ? (
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={group.sender?.avatarUrl || undefined} alt={group.sender?.name || 'User'} />
                          <AvatarFallback className="text-xs">
                            {group.sender?.name ? group.sender.name.charAt(0).toUpperCase() : <User className="h-4 w-4" />}
                          </AvatarFallback>
                        </Avatar>
                      ) : (
                        <div className="w-8" />
                      )}
                    </div>
                  )}

                  {/* Messages in group */}
                  <div className={`flex flex-col gap-1 ${isOwn ? 'items-end' : 'items-start'} max-w-[75%]`}>
                    {group.messages.map((msg: any, msgIndex: number) => {
                      const isFirstInGroup = msgIndex === 0
                      const isLastInGroup = msgIndex === group.messages.length - 1
                      const showTime = isLastInGroup
                      
                      return (
                        <div
                          key={msg.id}
                          className={`relative ${
                            isOwn
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted text-foreground'
                          } rounded-2xl px-4 py-2 ${
                            isOwn ? 'rounded-tr-sm' : 'rounded-tl-sm'
                          } ${
                            isFirstInGroup ? 'mt-2' : ''
                          } shadow-sm`}
                          style={{
                            maxWidth: '100%',
                            wordWrap: 'break-word',
                          }}
                        >
                          <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">
                            {msg.content}
                          </p>
                          {showTime && (
                            <div className={`flex items-center gap-1 mt-1 ${isOwn ? 'justify-end' : 'justify-start'}`}>
                              <span className="text-[10px] opacity-70">
                                {formatMessageTime(new Date(msg.createdAt))}
                              </span>
                              {isOwn && msg.readAt && (
                                <span className="text-[10px] opacity-70">✓✓</span>
                              )}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>

                  {/* Spacer for sent messages */}
                  {isOwn && <div className="flex-shrink-0 w-8" />}
                </div>
              )
            })
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center text-muted-foreground">
                <p className="text-sm mb-1">No messages yet</p>
                <p className="text-xs">Start the conversation!</p>
              </div>
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="border-t p-4 bg-background">
          <form onSubmit={handleSubmit} className="flex gap-2 items-end">
            <div className="flex-1 relative">
              <Textarea
                value={message}
                onChange={(e) => {
                  setMessage(e.target.value)
                  handleTyping()
                }}
                placeholder="Type a message..."
                className="min-h-[44px] max-h-[120px] resize-none pr-12 rounded-2xl border-2 focus:border-primary"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleSubmit(e)
                  }
                }}
                rows={1}
              />
            </div>
            <Button 
              type="submit" 
              disabled={!message.trim() || isSubmitting}
              size="icon"
              className="h-11 w-11 rounded-full flex-shrink-0"
            >
              <Send className="h-5 w-5" />
            </Button>
          </form>
        </div>
      </CardContent>
    </Card>
  )
}
