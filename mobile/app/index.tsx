import { useState, useRef, useCallback } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  StyleSheet,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { sendMessage, type Message } from '../lib/claudeClient'

// ─── Snabbkommandon ───────────────────────────────────────────────────────────

const QUICK_ACTIONS = [
  { label: 'Visa saldo', prompt: 'Visa mig ekonomisk statistik och saldo' },
  { label: 'Senaste verifikationer', prompt: 'Visa mina 10 senaste bokföringsposter' },
  { label: 'Återbetala lån', prompt: 'Jag vill bokföra en återbetalning av ägarlånet' },
]

// ─── Chattbubbla ──────────────────────────────────────────────────────────────

function ChatBubble({ message }: { message: Message }) {
  const isUser = message.role === 'user'
  return (
    <View style={[styles.bubbleWrapper, isUser ? styles.bubbleWrapperUser : styles.bubbleWrapperAssistant]}>
      {!isUser && (
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>B</Text>
        </View>
      )}
      <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleAssistant]}>
        <Text style={[styles.bubbleText, isUser ? styles.bubbleTextUser : styles.bubbleTextAssistant]}>
          {message.content}
        </Text>
      </View>
    </View>
  )
}

// ─── Huvudskärm ───────────────────────────────────────────────────────────────

export default function ChatScreen() {
  const [history, setHistory] = useState<Message[]>([
    {
      role: 'assistant',
      content:
        'Hej Victor! Jag är din bokföringsassistent. Berätta vad du vill bokföra — eller använd en snabbknapp nedan.',
    },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [toolStatus, setToolStatus] = useState<string | null>(null)
  const listRef = useRef<FlatList>(null)

  const TOOL_LABELS: Record<string, string> = {
    add_transaction: 'Skapar verifikation…',
    get_accounts: 'Hämtar kontoplanen…',
    get_recent_transactions: 'Hämtar verifikationer…',
    get_statistics: 'Hämtar statistik…',
  }

  const send = useCallback(
    async (text: string) => {
      if (!text.trim() || loading) return
      const userMsg: Message = { role: 'user', content: text.trim() }
      setHistory((h) => [...h, userMsg])
      setInput('')
      setLoading(true)
      setToolStatus(null)

      try {
        const reply = await sendMessage(history, text.trim(), (toolName) => {
          setToolStatus(TOOL_LABELS[toolName] ?? `Kör ${toolName}…`)
        })
        setHistory((h) => [...h, { role: 'assistant', content: reply }])
      } catch (err) {
        setHistory((h) => [
          ...h,
          { role: 'assistant', content: `Något gick fel: ${err instanceof Error ? err.message : String(err)}` },
        ])
      } finally {
        setLoading(false)
        setToolStatus(null)
      }
    },
    [history, loading]
  )

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Bokföring AI</Text>
        <Text style={styles.headerSub}>Script Collective AB</Text>
      </View>

      {/* Meddelandelista */}
      <FlatList
        ref={listRef}
        data={history}
        keyExtractor={(_, i) => String(i)}
        renderItem={({ item }) => <ChatBubble message={item} />}
        contentContainerStyle={styles.messageList}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
      />

      {/* Statusrad när Claude kör verktyg */}
      {loading && (
        <View style={styles.statusBar}>
          <ActivityIndicator size="small" color="#6366f1" />
          <Text style={styles.statusText}>{toolStatus ?? 'Claude tänker…'}</Text>
        </View>
      )}

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        {/* Snabbknappar */}
        <View style={styles.quickActions}>
          {QUICK_ACTIONS.map((qa) => (
            <TouchableOpacity key={qa.label} style={styles.quickBtn} onPress={() => send(qa.prompt)}>
              <Text style={styles.quickBtnText}>{qa.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Inmatning */}
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            value={input}
            onChangeText={setInput}
            placeholder="Vad ska bokföras?"
            placeholderTextColor="#555"
            multiline
            returnKeyType="send"
            onSubmitEditing={() => send(input)}
            editable={!loading}
          />
          <TouchableOpacity
            style={[styles.sendBtn, (!input.trim() || loading) && styles.sendBtnDisabled]}
            onPress={() => send(input)}
            disabled={!input.trim() || loading}
          >
            <Text style={styles.sendBtnText}>↑</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

// ─── Stilar ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f0f' },

  header: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1e1e1e',
  },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '700' },
  headerSub: { color: '#555', fontSize: 12, marginTop: 2 },

  messageList: { padding: 16, gap: 12 },

  bubbleWrapper: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginBottom: 4 },
  bubbleWrapperUser: { justifyContent: 'flex-end' },
  bubbleWrapperAssistant: { justifyContent: 'flex-start' },

  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#6366f1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#fff', fontSize: 12, fontWeight: '700' },

  bubble: { maxWidth: '78%', borderRadius: 16, padding: 12 },
  bubbleUser: { backgroundColor: '#6366f1', borderBottomRightRadius: 4 },
  bubbleAssistant: { backgroundColor: '#1a1a1a', borderBottomLeftRadius: 4 },

  bubbleText: { fontSize: 15, lineHeight: 21 },
  bubbleTextUser: { color: '#fff' },
  bubbleTextAssistant: { color: '#e5e5e5' },

  statusBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#111',
  },
  statusText: { color: '#6366f1', fontSize: 13 },

  quickActions: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 12,
    paddingTop: 10,
    flexWrap: 'wrap',
  },
  quickBtn: {
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  quickBtnText: { color: '#aaa', fontSize: 13 },

  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    padding: 12,
  },
  input: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    color: '#fff',
    fontSize: 15,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  sendBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#6366f1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: { backgroundColor: '#2a2a2a' },
  sendBtnText: { color: '#fff', fontSize: 20, fontWeight: '700' },
})
