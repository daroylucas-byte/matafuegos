import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  MessageSquare, 
  Send, 
  Users, 
  Hash, 
  Store, 
  Clock, 
  CheckCheck, 
  Loader2,
  Menu,
  X,
  Search,
  Dot
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { useConfig } from '../contexts/ConfigContext'
import { useLocal } from '../contexts/LocalContext'
import { cn } from '../lib/utils'
import toast from 'react-hot-toast'

interface ChatMessage {
  id: string
  mensaje: string
  sender_id: string
  local_id: string | null
  leido_por: string[]
  created_at: string
  sender?: {
    nombre: string
    email: string
    rol: string
  }
  isTemp?: boolean
}

interface UserProfile {
  id: string
  nombre: string
  email: string
  rol: string
  activo: boolean
}

const Chat: React.FC = () => {
  const { profile } = useAuth()
  const { config, loading: configLoading } = useConfig()
  const { locales, loading: localesLoading } = useLocal()
  const navigate = useNavigate()

  // State management
  const [activeChannel, setActiveChannel] = useState<'general' | string>('general')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [messagesLoading, setMessagesLoading] = useState(true)
  const [newMessage, setNewMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [profiles, setProfiles] = useState<UserProfile[]>([])
  const [profilesMap, setProfilesMap] = useState<Record<string, UserProfile>>({})
  const [profilesLoaded, setProfilesLoaded] = useState(false)
  const [showMembers, setShowMembers] = useState(false)
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false)
  const [searchMemberQuery, setSearchMemberQuery] = useState('')

  const chatEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const profilesMapRef = useRef<Record<string, UserProfile>>({})

  // Redirect if chat module is disabled
  useEffect(() => {
    if (!configLoading && config) {
      const modulos = config?.servicios?.modulos || {}
      if (modulos.chat !== true) {
        toast.error('El módulo de Chat no está habilitado para esta cuenta.')
        navigate('/dashboard')
      }
    }
  }, [config, configLoading, navigate])

  // Fetch all profiles to populate user list and link details offline in real-time
  useEffect(() => {
    if (profile) {
      fetchProfiles()
    }
  }, [profile])

  const fetchProfiles = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, nombre, email, rol, activo')
        .eq('activo', true)
        .order('nombre')

      if (error) throw error

      if (data) {
        setProfiles(data)
        const map: Record<string, UserProfile> = {}
        data.forEach(p => {
          map[p.id] = p
        })
        setProfilesMap(map)
        profilesMapRef.current = map
        setProfilesLoaded(true)
      }
    } catch (err: any) {
      console.error('Error al cargar perfiles:', err)
    }
  }

  // Fetch messages when channel changes or when profiles are loaded
  useEffect(() => {
    if (profile && profilesLoaded) {
      fetchMessages()
    }
  }, [activeChannel, profile, profilesLoaded])

  const fetchMessages = async () => {
    setMessagesLoading(true)
    try {
      let query = supabase
        .from('chat_mensajes')
        .select('*')
      
      if (activeChannel === 'general') {
        query = query.is('local_id', null)
      } else {
        query = query.eq('local_id', activeChannel)
      }

      const { data, error } = await query
        .order('created_at', { ascending: true })
        .limit(100)

      if (error) throw error

      const formattedMessages = (data || []).map((msg: any) => ({
        ...msg,
        sender: profilesMap[msg.sender_id] || {
          nombre: 'Usuario del Sistema',
          email: '',
          rol: 'vendedor'
        }
      }))

      setMessages(formattedMessages)
      scrollToBottom()
      
      // Mark as read asynchronously and in parallel (non-blocking)
      markChannelAsRead(formattedMessages)
    } catch (err: any) {
      toast.error('Error al cargar mensajes: ' + err.message)
    } finally {
      setMessagesLoading(false)
    }
  }

  // Subscribe to real-time updates for chat messages
  useEffect(() => {
    if (!profile || !profilesLoaded) return

    const subscription = supabase
      .channel('chat_realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_mensajes' },
        async (payload) => {
          const newMsg = payload.new as ChatMessage
          
          // Check if message belongs to the current active channel
          const isCurrentGeneral = activeChannel === 'general' && newMsg.local_id === null
          const isCurrentLocal = activeChannel !== 'general' && newMsg.local_id === activeChannel

          if (isCurrentGeneral || isCurrentLocal) {
            // Find sender details from stable Ref
            const senderDetails = profilesMapRef.current[newMsg.sender_id] || {
              nombre: 'Usuario',
              email: '',
              rol: 'vendedor',
              id: newMsg.sender_id,
              activo: true
            }

            const fullMsg = {
              ...newMsg,
              sender: senderDetails
            }

            setMessages(prev => {
              // Avoid duplicates in case of fast inserts
              if (prev.some(m => m.id === fullMsg.id)) return prev

              // Replace optimistic message if it was sent by us
              if (newMsg.sender_id === profile.id) {
                const tempIndex = prev.findIndex(m => m.isTemp && m.mensaje === newMsg.mensaje)
                if (tempIndex !== -1) {
                  return prev.map((m, idx) => idx === tempIndex ? fullMsg : m)
                }
              }

              return [...prev, fullMsg]
            })

            // Automatically scroll to bottom
            setTimeout(scrollToBottom, 50)
            
            // Mark new message as read if it wasn't sent by us
            if (newMsg.sender_id !== profile.id) {
              markMessageAsRead(newMsg)
            }
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'chat_mensajes' },
        (payload) => {
          const updatedMsg = payload.new as ChatMessage
          setMessages(prev => prev.map(m => m.id === updatedMsg.id ? { ...m, leido_por: updatedMsg.leido_por } : m))
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(subscription)
    }
  }, [activeChannel, profile, profilesLoaded])

  // Mark all unread messages in this channel as read in parallel (non-blocking)
  const markChannelAsRead = (channelMsgs: ChatMessage[]) => {
    if (!profile?.id) return
    
    const unread = channelMsgs.filter(
      m => m.sender_id !== profile.id && (!m.leido_por || !m.leido_por.includes(profile.id))
    )
    
    if (unread.length === 0) return

    const promises = unread.map(async (msg) => {
      const currentLeido = msg.leido_por || []
      if (!currentLeido.includes(profile.id)) {
        return supabase
          .from('chat_mensajes')
          .update({ leido_por: [...currentLeido, profile.id] })
          .eq('id', msg.id)
      }
    })

    Promise.all(promises).catch(err => {
      console.error('Error al marcar mensajes como leídos:', err)
    })
  }

  // Mark a single message as read (non-blocking)
  const markMessageAsRead = (msg: ChatMessage) => {
    if (!profile?.id) return
    const currentLeido = msg.leido_por || []
    if (currentLeido.includes(profile.id)) return

    supabase
      .from('chat_mensajes')
      .update({ leido_por: [...currentLeido, profile.id] })
      .eq('id', msg.id)
      .then(({ error }) => {
        if (error) console.error('Error al marcar mensaje como leído:', error)
      })
  }

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  // Optimized with UI Optimistic updates for zero latency feel!
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || !profile?.id) return

    const textToSend = newMessage.trim()
    setNewMessage('')
    setSending(true)

    // Create optimistic temporary message
    const tempId = `temp-${Date.now()}`
    const tempMsg: ChatMessage = {
      id: tempId,
      mensaje: textToSend,
      sender_id: profile.id,
      local_id: activeChannel === 'general' ? null : activeChannel,
      leido_por: [profile.id],
      created_at: new Date().toISOString(),
      sender: {
        nombre: profile.nombre,
        email: profile.email || '',
        rol: profile.rol || 'vendedor'
      },
      isTemp: true
    }

    // Instantly append to state so it renders immediately in 0ms!
    setMessages(prev => [...prev, tempMsg])
    setTimeout(scrollToBottom, 50)

    try {
      const { data, error } = await supabase
        .from('chat_mensajes')
        .insert({
          mensaje: textToSend,
          sender_id: profile.id,
          local_id: activeChannel === 'general' ? null : activeChannel,
          leido_por: [profile.id]
        })
        .select()
        .single()

      if (error) throw error

      // Replace temp message with exact database record
      if (data) {
        const persistedMsg = {
          ...data,
          sender: tempMsg.sender
        }
        setMessages(prev => prev.map(m => m.id === tempId ? persistedMsg : m))
      }
    } catch (err: any) {
      toast.error('Error al enviar mensaje: ' + err.message)
      // Revert optimistic update
      setMessages(prev => prev.filter(m => m.id !== tempId))
      setNewMessage(textToSend)
    } finally {
      setSending(false)
    }
  }

  // Format timestamp in a beautiful way
  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  const formatDateLabel = (dateString: string) => {
    const date = new Date(dateString)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    if (date.toDateString() === today.toDateString()) {
      return 'Hoy'
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Ayer'
    } else {
      return date.toLocaleDateString([], { day: 'numeric', month: 'long', year: 'numeric' })
    }
  }

  // Filter members by search input
  const filteredMembers = profiles.filter(p => 
    p.nombre.toLowerCase().includes(searchMemberQuery.toLowerCase()) ||
    p.rol.toLowerCase().includes(searchMemberQuery.toLowerCase())
  )

  // Get active channel info
  const activeChannelName = activeChannel === 'general' 
    ? 'Canal General' 
    : locales.find(l => l.id === activeChannel)?.nombre || 'Sucursal'

  const activeChannelDesc = activeChannel === 'general'
    ? 'Canal de comunicación global para todos los locales y roles.'
    : `Canal exclusivo de la sucursal ${activeChannelName}.`

  // Get dynamic role classes for color-coded badges
  const getRoleBadgeClass = (rol: string) => {
    switch (rol?.toLowerCase()) {
      case 'superadmin':
        return 'bg-amber-100 text-amber-800 border-amber-200'
      case 'admin':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'vendedor':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200'
      case 'cajero':
        return 'bg-purple-100 text-purple-800 border-purple-200'
      case 'visor':
        return 'bg-gray-100 text-gray-800 border-gray-200'
      default:
        return 'bg-slate-100 text-slate-800 border-slate-200'
    }
  }

  const getRoleLabel = (rol: string) => {
    switch (rol?.toLowerCase()) {
      case 'superadmin': return 'Super Admin'
      case 'admin': return 'Admin'
      case 'vendedor': return 'Vendedor'
      case 'cajero': return 'Cajero'
      case 'visor': return 'Visor'
      default: return rol
    }
  }

  if (configLoading || localesLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-body-md text-on-surface-variant">Cargando módulo de chat...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-[calc(100vh-8rem)] flex bg-white border border-outline-variant rounded-2xl overflow-hidden shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-300">
      
      {/* 1. LEFT SIDEBAR: Channels & Rooms */}
      <aside className={cn(
        "w-64 border-r border-outline-variant bg-surface-container-lowest flex flex-col shrink-0 transition-all duration-300 md:relative absolute z-40 h-full",
        isMobileSidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
      )}>
        <div className="p-4 border-b border-outline-variant flex items-center justify-between">
          <div className="flex items-center gap-2 text-primary">
            <MessageSquare className="h-5 w-5" />
            <h2 className="font-bold text-headline-sm">Canales de Chat</h2>
          </div>
          <button 
            className="md:hidden p-1 rounded-lg hover:bg-surface-container"
            onClick={() => setIsMobileSidebarOpen(false)}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-4">
          {/* General Channel */}
          <div>
            <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wider px-3 mb-2">Canal Global</p>
            <button
              onClick={() => {
                setActiveChannel('general')
                setIsMobileSidebarOpen(false)
              }}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left font-medium transition-all",
                activeChannel === 'general' 
                  ? "bg-primary text-white shadow-sm" 
                  : "text-on-surface hover:bg-surface-container-low"
              )}
            >
              <Hash className="h-5 w-5 shrink-0" />
              <span className="truncate">General</span>
            </button>
          </div>

          {/* Sucursales/Locales Channels */}
          <div>
            <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wider px-3 mb-2">Por Sucursal</p>
            <div className="space-y-1">
              {locales.map((l) => (
                <button
                  key={l.id}
                  onClick={() => {
                    setActiveChannel(l.id)
                    setIsMobileSidebarOpen(false)
                  }}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left font-medium transition-all",
                    activeChannel === l.id 
                      ? "bg-primary text-white shadow-sm" 
                      : "text-on-surface hover:bg-surface-container-low"
                  )}
                >
                  <Store className="h-5 w-5 shrink-0" />
                  <span className="truncate">{l.nombre}</span>
                </button>
              ))}
              {locales.length === 0 && (
                <p className="text-xs text-on-surface-variant italic px-3">No tienes sucursales asignadas.</p>
              )}
            </div>
          </div>
        </div>

        {/* User Card at Bottom of Sidebar */}
        <div className="p-4 border-t border-outline-variant bg-surface-container-low flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-primary text-white flex items-center justify-center font-bold text-sm shrink-0">
            {profile?.nombre?.charAt(0) || 'U'}
          </div>
          <div className="overflow-hidden">
            <p className="font-bold text-xs truncate text-on-surface">{profile?.nombre}</p>
            <span className={cn(
              "text-[10px] px-1.5 py-0.5 rounded-md border font-medium uppercase",
              getRoleBadgeClass(profile?.rol || 'vendedor')
            )}>
              {getRoleLabel(profile?.rol || 'vendedor')}
            </span>
          </div>
        </div>
      </aside>

      {/* Mobile Sidebar Overlay */}
      {isMobileSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/20 z-30 md:hidden"
          onClick={() => setIsMobileSidebarOpen(false)}
        />
      )}

      {/* 2. CENTER PANEL: Message Thread */}
      <main className="flex-1 flex flex-col min-w-0 bg-surface-container-lowest">
        
        {/* Chat Area Header */}
        <header className="h-16 px-4 border-b border-outline-variant flex items-center justify-between shrink-0 bg-white shadow-sm z-10">
          <div className="flex items-center gap-3 min-w-0">
            <button 
              onClick={() => setIsMobileSidebarOpen(true)}
              className="md:hidden p-2 -ml-2 rounded-lg hover:bg-surface-container text-on-surface"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-1.5 min-w-0">
              {activeChannel === 'general' ? (
                <Hash className="h-6 w-6 text-primary shrink-0" />
              ) : (
                <Store className="h-6 w-6 text-primary shrink-0" />
              )}
              <div className="min-w-0">
                <h1 className="font-bold text-title-md text-on-surface truncate">{activeChannelName}</h1>
                <p className="text-xs text-on-surface-variant truncate hidden sm:block">{activeChannelDesc}</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowMembers(!showMembers)}
              className={cn(
                "p-2 rounded-xl border flex items-center gap-2 hover:bg-surface-container-low transition-all text-on-surface text-body-sm",
                showMembers ? "bg-primary/10 border-primary/20 text-primary" : "border-outline"
              )}
            >
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Miembros ({profiles.length})</span>
            </button>
          </div>
        </header>

        {/* Messages list container */}
        <div 
          ref={messagesContainerRef}
          className="flex-1 overflow-y-auto p-4 space-y-4"
        >
          {messagesLoading ? (
            <div className="h-full flex items-center justify-center">
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-body-sm text-on-surface-variant">Cargando conversación...</p>
              </div>
            </div>
          ) : messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 max-w-sm mx-auto">
              <div className="w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-4">
                <MessageSquare className="h-8 w-8" />
              </div>
              <h3 className="font-bold text-headline-sm text-on-surface">¡Comienza la conversación!</h3>
              <p className="text-body-sm text-on-surface-variant mt-2">
                Envía un mensaje para saludar a tu equipo. Todos los miembros autorizados de este canal lo verán al instante.
              </p>
            </div>
          ) : (
            <>
              {messages.map((msg, index) => {
                const isMe = msg.sender_id === profile?.id
                const showDateLabel = index === 0 || 
                  new Date(messages[index - 1].created_at).toDateString() !== new Date(msg.created_at).toDateString()
                
                // Read count
                const readByOthers = (msg.leido_por || []).filter(id => id !== msg.sender_id)
                const isRead = readByOthers.length > 0

                return (
                  <div key={msg.id} className="space-y-3">
                    {/* Date separator */}
                    {showDateLabel && (
                      <div className="flex items-center justify-center my-6">
                        <span className="text-[10px] font-bold text-on-surface-variant bg-surface-container px-3 py-1.5 rounded-full uppercase tracking-wider shadow-sm">
                          {formatDateLabel(msg.created_at)}
                        </span>
                      </div>
                    )}

                    {/* Message Bubble Container */}
                    <div className={cn(
                      "flex gap-3 max-w-[85%] md:max-w-[70%]",
                      isMe ? "ml-auto flex-row-reverse" : "mr-auto"
                    )}>
                      {/* Avatar */}
                      {!isMe && (
                        <div className="w-9 h-9 rounded-full bg-primary-container/20 border border-primary/10 text-primary flex items-center justify-center font-bold text-sm shrink-0 shadow-sm self-end">
                          {msg.sender?.nombre?.charAt(0) || 'U'}
                        </div>
                      )}

                      <div className="space-y-1">
                        {/* Sender info */}
                        <div className={cn(
                          "flex items-center gap-2 pl-1",
                          isMe ? "justify-end flex-row-reverse pl-0 pr-1" : "justify-start"
                        )}>
                          <span className="font-bold text-xs text-on-surface">
                            {isMe ? 'Tú' : msg.sender?.nombre || 'Usuario'}
                          </span>
                          <span className={cn(
                            "text-[9px] px-1.5 py-0.5 rounded-md font-medium border uppercase tracking-wider shrink-0",
                            getRoleBadgeClass(msg.sender?.rol || 'vendedor')
                          )}>
                            {getRoleLabel(msg.sender?.rol || 'vendedor')}
                          </span>
                        </div>

                        {/* Message Bubble */}
                        <div className={cn(
                          "px-4 py-2.5 rounded-2xl shadow-sm border text-body-md transition-all break-words relative",
                          isMe 
                            ? "bg-primary text-white border-primary/20 rounded-br-none" 
                            : "bg-white text-on-surface border-outline-variant rounded-bl-none hover:border-primary/20",
                          msg.isTemp && "opacity-70 animate-pulse"
                        )}>
                          <p className="whitespace-pre-line leading-relaxed">{msg.mensaje}</p>
                          
                          {/* Time & Read indicator inside the bubble */}
                          <div className={cn(
                            "flex items-center justify-end gap-1 text-[9px] mt-1.5 select-none",
                            isMe ? "text-white/70" : "text-on-surface-variant"
                          )}>
                            <Clock className="h-2.5 w-2.5" />
                            <span>{formatTime(msg.created_at)}</span>
                            {isMe && (
                              <CheckCheck className={cn(
                                "h-3.5 w-3.5 shrink-0",
                                isRead ? "text-emerald-300" : "text-white/50"
                              )} />
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
              <div ref={chatEndRef} />
            </>
          )}
        </div>

        {/* Input box */}
        <footer className="p-4 border-t border-outline-variant bg-white shadow-md z-10">
          <form onSubmit={handleSendMessage} className="flex gap-2">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              disabled={sending}
              placeholder={`Enviar mensaje a #${activeChannelName.toLowerCase().replace(/\s+/g, '-')}`}
              className="flex-1 px-4 py-3 bg-surface-container-lowest border border-outline rounded-xl text-body-md focus:outline-none focus:border-primary transition-all disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={sending || !newMessage.trim()}
              className={cn(
                "p-3 rounded-xl bg-primary text-white font-medium hover:bg-primary/95 transition-all shadow-md active:scale-95 flex items-center justify-center shrink-0 disabled:opacity-50 disabled:scale-100 disabled:pointer-events-none"
              )}
            >
              {sending ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Send className="h-5 w-5" />
              )}
            </button>
          </form>
        </footer>
      </main>

      {/* 3. RIGHT SIDEBAR: Member Presence List */}
      {showMembers && (
        <aside className="w-64 border-l border-outline-variant bg-white flex flex-col shrink-0 animate-in slide-in-from-right-4 duration-300 hidden lg:flex">
          <div className="p-4 border-b border-outline-variant flex items-center justify-between">
            <div className="flex items-center gap-2 text-on-surface">
              <Users className="h-5 w-5 text-primary" />
              <h2 className="font-bold text-headline-sm">Miembros</h2>
            </div>
            <button 
              className="p-1 rounded-lg hover:bg-surface-container text-on-surface-variant"
              onClick={() => setShowMembers(false)}
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Search Box */}
          <div className="p-3 border-b border-outline-variant">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-on-surface-variant" />
              <input
                type="text"
                placeholder="Buscar miembro..."
                value={searchMemberQuery}
                onChange={(e) => setSearchMemberQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-surface-container-low border border-outline rounded-lg text-xs focus:outline-none focus:border-primary transition-all"
              />
            </div>
          </div>

          {/* List of members */}
          <div className="flex-1 overflow-y-auto p-3 space-y-1">
            {filteredMembers.map((m) => (
              <div 
                key={m.id}
                className="flex items-center gap-3 p-2 rounded-xl hover:bg-surface-container-lowest transition-all group"
              >
                <div className="relative shrink-0">
                  <div className="w-8 h-8 rounded-full bg-primary-container/20 border border-primary/10 text-primary flex items-center justify-center font-bold text-xs shadow-sm">
                    {m.nombre.charAt(0)}
                  </div>
                  {/* Subtle online indicator dot */}
                  <div className="absolute -bottom-0.5 -right-0.5 bg-emerald-500 rounded-full border-2 border-white">
                    <Dot className="h-3 w-3 text-transparent shrink-0" />
                  </div>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-xs truncate text-on-surface group-hover:text-primary transition-colors">{m.nombre}</p>
                  <p className="text-[9px] text-on-surface-variant font-medium uppercase truncate">{getRoleLabel(m.rol)}</p>
                </div>
              </div>
            ))}
            {filteredMembers.length === 0 && (
              <p className="text-xs text-on-surface-variant italic text-center py-4">No se encontraron miembros.</p>
            )}
          </div>
        </aside>
      )}

    </div>
  )
}

export default Chat
