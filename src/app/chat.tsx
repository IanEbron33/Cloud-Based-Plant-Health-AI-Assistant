import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Brain, Zap } from 'lucide-react-native';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, TouchableOpacity, useColorScheme, View } from 'react-native';
import vegetablesDb from '../../assets/data/vegetables_db.json';
import { useAuth } from '../context/AuthContext';
import { useScan } from '../context/ScanContext';
import { useToast } from '../context/ToastContext';
import { chatWithAI } from '../services/api.service';
import { clearChatMessages, fetchChatMessages, fetchScanById, getOrCreateChatSession, saveChatMessage } from '../services/scan.service';

interface Message {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  thought?: string;
  timestamp: string;
  modelUsed?: 'flash' | 'deep';
  isNew?: boolean;
}

const MascotAvatar = ({ size = 32 }: { size?: number }) => {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        overflow: 'hidden',
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#32b043ff',
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <Image
        source={require('../../assets/images/mascot-transparent.png')}
        style={{
          width: size * 1.55,
          height: size * 1.55,
          transform: [{ translateY: size * 0.16 }],
        }}
        contentFit="contain"
      />
    </View>
  );
};

function CollapsibleThought({ thought, isDark }: { thought: string; isDark: boolean }) {
  const [expanded, setExpanded] = useState(false);

  if (!thought || !thought.trim()) return null;

  return (
    <View
      className={`mt-1 mb-2 rounded-[16px] overflow-hidden border ${isDark ? 'bg-stone-900 border-stone-800' : 'bg-stone-50 border-stone-200'
        }`}
    >
      <TouchableOpacity
        onPress={() => setExpanded(!expanded)}
        activeOpacity={0.7}
        className={`px-4 py-2.5 flex-row items-center justify-between ${isDark ? 'bg-stone-850' : 'bg-stone-100'
          }`}
      >
        <View className="flex-row items-center">
          <Ionicons name="bulb" size={13} color="#10b981" style={{ marginRight: 6 }} />
          <Text
            style={{ fontFamily: 'Fredoka_700Bold' }}
            className={`text-[10px] font-bold uppercase tracking-wider ${isDark ? 'text-stone-300' : 'text-stone-700'
              }`}
          >
            Thinking Process
          </Text>
        </View>
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={14}
          color={isDark ? '#a8a29e' : '#78716c'}
        />
      </TouchableOpacity>
      {expanded && (
        <View className="px-4 py-3 border-t border-stone-200/40 dark:border-stone-800/40">
          <Text
            style={{ fontFamily: 'Fredoka_400Regular' }}
            className={`text-xs leading-5 italic ${isDark ? 'text-stone-400' : 'text-stone-500'
              }`}
          >
            {thought}
          </Text>
        </View>
      )}
    </View>
  );
}

function ActiveTextLoading({ activeModel }: { activeModel: 'flash' | 'deep' }) {
  const phrases = activeModel === 'deep'
    ? [
      "Bugsok is analyzing the crop symptoms...",
      "Bugsok is in deep thinking...",
      "Bugsok is formulating treatment options...",
      "Bugsok is preparing your customized advice..."
    ]
    : [
      "Bugsok is typing..."
    ];

  const [phraseIndex, setPhraseIndex] = useState(0);

  useEffect(() => {
    if (activeModel !== 'deep') return;
    const interval = setInterval(() => {
      setPhraseIndex((prev) => (prev + 1) % phrases.length);
    }, 2500);
    return () => clearInterval(interval);
  }, [activeModel]);

  return (
    <View className="flex-row items-center py-1">
      <ActivityIndicator size="small" color="#10b981" style={{ marginRight: 8 }} />
      <Text
        style={{ fontFamily: 'Fredoka_400Regular' }}
        className="text-stone-400 text-xs italic"
      >
        {phrases[phraseIndex]}
      </Text>
    </View>
  );
}

function TypewriterBubble({
  text,
  isUser,
  isDark,
  onHeightChange,
  renderMessageText,
}: {
  text: string;
  isUser: boolean;
  isDark: boolean;
  onHeightChange?: () => void;
  renderMessageText: (text: string, isUser: boolean) => React.ReactNode;
}) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (index < text.length) {
      const timer = setTimeout(() => {
        setIndex((prev) => {
          const next = Math.min(prev + 4, text.length);
          if (next % 12 === 0 && onHeightChange) {
            onHeightChange();
          }
          return next;
        });
      }, 8);
      return () => clearTimeout(timer);
    } else if (index === text.length && onHeightChange) {
      onHeightChange();
    }
  }, [index, text]);

  const visibleText = text.slice(0, index);
  return <View>{renderMessageText(visibleText, isUser)}</View>;
}

function TypingIndicator({ activeModel, isDark }: { activeModel: 'flash' | 'deep'; isDark: boolean }) {
  const deepThinkingPhrases = [
    "Bugsok is analyzing the crop symptoms...",
    "Bugsok is in deep thinking...",
    "Bugsok is cross-referencing treatments...",
    "Bugsok is formulating treatment options...",
    "Bugsok is preparing your customized advice..."
  ];

  const [phraseIndex, setPhraseIndex] = useState(0);

  useEffect(() => {
    if (activeModel !== 'deep') return;

    const interval = setInterval(() => {
      setPhraseIndex((prev) => (prev + 1) % deepThinkingPhrases.length);
    }, 2500);

    return () => clearInterval(interval);
  }, [activeModel]);

  const textToShow = activeModel === 'deep'
    ? deepThinkingPhrases[phraseIndex]
    : "Bugsok is typing...";

  return (
    <View className="flex-row mb-4 justify-start">
      <View style={{ marginRight: 10, marginTop: 4 }}>
        <MascotAvatar size={32} />
      </View>
      <View className="flex-col max-w-[80%]">
        <Text
          style={{ fontFamily: 'Fredoka_700Bold' }}
          className={`text-[11px] font-bold mb-1 ml-1 ${isDark ? 'text-stone-300' : 'text-stone-600'}`}
        >
          Bugsok AI
        </Text>
        <View
          className={`rounded-[24px] px-5 py-3.5 border ${isDark ? 'bg-stone-900 border-stone-850' : 'bg-white border-stone-150 shadow-sm'
            }`}
        >
          <Text
            style={{ fontFamily: 'Fredoka_400Regular' }}
            className="text-stone-400 text-xs italic"
          >
            {textToShow}
          </Text>
        </View>
      </View>
    </View>
  );
}

export default function ChatScreen() {
  const router = useRouter();
  const { scanId } = useLocalSearchParams<{ scanId?: string }>();
  const { user } = useAuth();
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const scrollViewRef = useRef<ScrollView>(null);
  const chatAbortControllerRef = useRef<AbortController | null>(null);

  const { diagnosisResult, identifiedCrop } = useScan();
  const { showToast } = useToast();

  // Model selection state: 'flash' vs 'deep'
  const [activeModel, setActiveModel] = useState<'flash' | 'deep'>('flash');
  const [modelDropdownVisible, setModelDropdownVisible] = useState(false);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isLoadingSession, setIsLoadingSession] = useState(false);

  const [chatCropName, setChatCropName] = useState<string>('Plant');
  const [chatCondition, setChatCondition] = useState<string>('General Care');

  // Load chat session from SQLite/Supabase
  const loadChatSession = async () => {
    if (!scanId || !user) {
      // General transient fallback session
      const greetingText = 'Hello! I am Bugsok AI, as your plant care assistant. How can I help you with your crops today?';
      setChatCropName('Plant');
      setChatCondition('General Care');
      setMessages([
        {
          id: '1',
          sender: 'ai',
          text: greetingText,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          modelUsed: 'flash',
        },
      ]);
      setSessionId(null);
      return;
    }

    setIsLoadingSession(true);
    try {
      const scanRow = fetchScanById(scanId, user.id);
      const resolvedCropName = scanRow ? scanRow.crop_name : (diagnosisResult?.cropLocalName || identifiedCrop || 'Plant');
      const resolvedCondition = scanRow ? scanRow.condition_name : (diagnosisResult?.condition || 'General Care');

      setChatCropName(resolvedCropName);
      setChatCondition(resolvedCondition);

      const sessId = await getOrCreateChatSession(scanId, user.id, resolvedCropName);
      setSessionId(sessId);

      const dbMsgs = fetchChatMessages(sessId);
      const mapped = dbMsgs.map((m) => {
        const thoughtMatch = m.message.match(/<thought>([\s\S]*?)<\/thought>/);
        const thought = thoughtMatch ? thoughtMatch[1] : undefined;
        const cleanText = m.message.replace(/<thought>[\s\S]*?<\/thought>/, '');

        return {
          id: m.id,
          sender: m.sender,
          text: cleanText
            .replace(/Hello! I am your plant care assistant/g, 'Hello! I am Bugsok AI, as your plant care assistant')
            .replace(/Hello! I am Bugsok AI, your crops care assistant/g, 'Hello! I am Bugsok AI, as your plant care assistant'),
          thought,
          timestamp: new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          modelUsed: m.model_used as 'flash' | 'deep' | undefined,
        };
      });

      if (mapped.length === 0) {
        // If it's a new session, persist the initial greeting in SQLite/Supabase using resolved details
        const greetingText = scanRow
          ? `Hello! I am Bugsok AI, as your plant care assistant. I noticed from the analysis that your **${scanRow.crop_name}** has **${scanRow.condition_name}** with a severity of **${scanRow.severity}** (${scanRow.health_score}% health score).\n\nDo you have any questions about its treatment, prevention, or care?`
          : diagnosisResult
            ? `Hello! I am Bugsok AI, as your plant care assistant. I noticed from the analysis that your **${diagnosisResult.cropLocalName}** has **${diagnosisResult.condition}** with a severity of **${diagnosisResult.severity}** (${diagnosisResult.healthScore}% health score).\n\nDo you have any questions about its treatment, prevention, or care?`
            : `Hello! I am Bugsok AI, as your plant care assistant. How can I help you with your ${resolvedCropName} today?`;

        await saveChatMessage(sessId, 'ai', greetingText, 'flash');

        const reloaded = fetchChatMessages(sessId);
        setMessages(reloaded.map((m) => {
          const thoughtMatch = m.message.match(/<thought>([\s\S]*?)<\/thought>/);
          const thought = thoughtMatch ? thoughtMatch[1] : undefined;
          const cleanText = m.message.replace(/<thought>[\s\S]*?<\/thought>/, '');

          return {
            id: m.id,
            sender: m.sender,
            text: cleanText
              .replace(/Hello! I am your plant care assistant/g, 'Hello! I am Bugsok AI, as your plant care assistant')
              .replace(/Hello! I am Bugsok AI, your crops care assistant/g, 'Hello! I am Bugsok AI, as your plant care assistant'),
            thought,
            timestamp: new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            modelUsed: m.model_used as 'flash' | 'deep' | undefined,
            isNew: true,
          };
        }));
      } else {
        setMessages(mapped);
      }
    } catch (err) {
      console.error('[Chat Screen] Error loading session:', err);
    } finally {
      setIsLoadingSession(false);
      setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 250);
    }
  };

  useEffect(() => {
    loadChatSession();
  }, [scanId, user]);

  // Clean up abort controllers on unmount
  useEffect(() => {
    return () => {
      if (chatAbortControllerRef.current) {
        chatAbortControllerRef.current.abort();
      }
    };
  }, []);

  const handleSend = async () => {
    if (!inputText.trim()) return;

    const userMsgText = inputText;
    setInputText('');

    const userMsgId = Date.now().toString();
    const userMsg: Message = {
      id: userMsgId,
      sender: 'user',
      text: userMsgText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsTyping(true);
    setIsGenerating(true);

    // Persist user message in DB
    if (sessionId) {
      try {
        await saveChatMessage(sessionId, 'user', userMsgText);
      } catch (err) {
        console.error('[Chat Screen] Save user message error:', err);
      }
    }

    // Scroll to bottom after user sends message
    setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);

    // Get DB metadata context for the current crop
    const cropKey = chatCropName;
    const cropDb = vegetablesDb[cropKey as keyof typeof vegetablesDb];
    const contextString = cropDb ? JSON.stringify(cropDb) : '';

    // Prepare history payload for API
    const apiHistory = [...messages, userMsg].map((m) => ({
      role: m.sender === 'user' ? ('user' as const) : ('assistant' as const),
      content: m.text,
    }));

    let accumulatedText = '';
    let accumulatedThought = '';
    const aiMsgId = (Date.now() + 1).toString();

    // Abort any active chat stream
    if (chatAbortControllerRef.current) {
      chatAbortControllerRef.current.abort();
    }
    chatAbortControllerRef.current = new AbortController();

    chatWithAI(
      apiHistory,
      contextString,
      activeModel,
      // onChunk callback
      (chunk) => {
        if (chunk.thought) {
          accumulatedThought += chunk.thought;
          setIsTyping(false); // Hide standard typing text bubble when thought streams in
          setMessages((prev) => {
            const exists = prev.some((m) => m.id === aiMsgId);
            if (exists) {
              return prev.map((m) => (m.id === aiMsgId ? { ...m, thought: accumulatedThought } : m));
            } else {
              return [
                ...prev,
                {
                  id: aiMsgId,
                  sender: 'ai',
                  text: '',
                  thought: accumulatedThought,
                  timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                  modelUsed: activeModel,
                  isNew: true,
                },
              ];
            }
          });
          scrollViewRef.current?.scrollToEnd({ animated: true });
        }
        if (chunk.text) {
          accumulatedText += chunk.text;
          setIsTyping(false); // Hide standard typing text bubble when text streams in
          setMessages((prev) => {
            const exists = prev.some((m) => m.id === aiMsgId);
            if (exists) {
              return prev.map((m) => (m.id === aiMsgId ? { ...m, text: accumulatedText } : m));
            } else {
              return [
                ...prev,
                {
                  id: aiMsgId,
                  sender: 'ai',
                  text: accumulatedText,
                  thought: accumulatedThought,
                  timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                  modelUsed: activeModel,
                  isNew: true,
                },
              ];
            }
          });
          scrollViewRef.current?.scrollToEnd({ animated: true });
        }
      },
      // onDone callback
      async () => {
        setIsTyping(false);
        setIsGenerating(false);
        // Persist completed AI message in DB (with thoughts encoded)
        const finalMsgText = accumulatedThought
          ? `<thought>${accumulatedThought}</thought>${accumulatedText}`
          : accumulatedText;

        if (sessionId) {
          try {
            await saveChatMessage(sessionId, 'ai', finalMsgText, activeModel);
            // Reload from DB to ensure local message sync state and timestamp match
            const dbMsgs = fetchChatMessages(sessionId);
            setMessages((prev) => {
              const lastPrevMsg = prev[prev.length - 1];
              const wasTyping = lastPrevMsg && lastPrevMsg.sender === 'ai' && lastPrevMsg.isNew;

              return dbMsgs.map((m, idx) => {
                const isLast = idx === dbMsgs.length - 1;
                const thoughtMatch = m.message.match(/<thought>([\s\S]*?)<\/thought>/);
                const thought = thoughtMatch ? thoughtMatch[1] : undefined;
                const cleanText = m.message.replace(/<thought>[\s\S]*?<\/thought>/, '');

                return {
                  id: m.id,
                  sender: m.sender,
                  text: cleanText
                    .replace(/Hello! I am your plant care assistant/g, 'Hello! I am Bugsok AI, as your plant care assistant')
                    .replace(/Hello! I am Bugsok AI, your crops care assistant/g, 'Hello! I am Bugsok AI, as your plant care assistant'),
                  thought,
                  timestamp: new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                  modelUsed: m.model_used as 'flash' | 'deep' | undefined,
                  isNew: isLast && wasTyping ? true : false,
                };
              });
            });
          } catch (err) {
            console.error('[Chat Screen] Save AI response error:', err);
          }
        }
        scrollViewRef.current?.scrollToEnd({ animated: true });
      },
      // onError callback
      (err) => {
        setIsTyping(false);
        setIsGenerating(false);
        showToast({
          type: 'error',
          title: 'Chat Failed',
          message: err,
        });
      },
      chatAbortControllerRef.current.signal
    );
  };

  const handleClearChat = async () => {
    if (chatAbortControllerRef.current) {
      chatAbortControllerRef.current.abort();
    }

    if (sessionId) {
      try {
        // Delete locally
        clearChatMessages(sessionId);

        // Delete remotely
        const { supabase } = require('../lib/supabase');
        await supabase.from('chat_messages').delete().eq('session_id', sessionId);
      } catch (err) {
        console.error('[Chat Screen] Clear messages error:', err);
      }
    }

    const greetingText = chatCondition !== 'General Care'
      ? `Hello! I am your plant care assistant. I noticed from the analysis that your **${chatCropName}** has **${chatCondition}**.\n\nDo you have any questions about its treatment, prevention, or care?`
      : `Hello! I am your plant care assistant. How can I help you with your ${chatCropName} today?`;

    // Persist new initial greeting
    if (sessionId) {
      await saveChatMessage(sessionId, 'ai', greetingText, 'flash');
      const dbMsgs = fetchChatMessages(sessionId);
      setMessages(dbMsgs.map((m) => {
        const thoughtMatch = m.message.match(/<thought>([\s\S]*?)<\/thought>/);
        const thought = thoughtMatch ? thoughtMatch[1] : undefined;
        const cleanText = m.message.replace(/<thought>[\s\S]*?<\/thought>/, '');

        return {
          id: m.id,
          sender: m.sender,
          text: cleanText,
          thought,
          timestamp: new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          modelUsed: m.model_used as 'flash' | 'deep' | undefined,
          isNew: true,
        };
      }));
    } else {
      setMessages([
        {
          id: Date.now().toString(),
          sender: 'ai',
          text: greetingText,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          modelUsed: 'flash',
        },
      ]);
    }
  };

  const renderMessageText = (text: string, isUser: boolean) => {
    // Replace markdown asterisk (*) or dash (-) bullets with proper • bullets
    const formattedText = text.replace(/^(\s*)[\*-]\s/gm, '$1• ');
    const boldParts = formattedText.split('**');
    return (
      <Text
        style={{ fontFamily: 'Fredoka_400Regular' }}
        className={`text-sm leading-6 ${isUser
          ? 'text-white font-medium'
          : isDark
            ? 'text-stone-200'
            : 'text-stone-800'
          }`}
      >
        {boldParts.map((boldPart, boldIndex) => {
          if (boldIndex % 2 === 1) {
            // This is bold text (highlighted)
            return (
              <Text
                key={`bold-${boldIndex}`}
                style={{ fontFamily: 'Fredoka_700Bold' }}
                className={
                  isUser
                    ? 'text-emerald-100 font-bold'
                    : 'text-emerald-600 dark:text-emerald-400 font-bold'
                }
              >
                {boldPart}
              </Text>
            );
          } else {
            // This is regular text, but may contain *italics*
            const italicParts = boldPart.split('*');
            return italicParts.map((italicPart, italicIndex) => {
              if (italicIndex % 2 === 1) {
                // This is italic text (Option 2: soft green/mint italic accent)
                return (
                  <Text
                    key={`italic-${boldIndex}-${italicIndex}`}
                    style={{ fontFamily: 'Fredoka_700Bold', fontStyle: 'italic' }}
                    className={
                      isUser
                        ? 'text-emerald-200 font-bold italic'
                        : 'text-emerald-500 dark:text-emerald-400 font-bold italic'
                    }
                  >
                    {italicPart}
                  </Text>
                );
              }
              return italicPart;
            });
          }
        })}
      </Text>
    );
  };

  const headerTitle = `${chatCropName} Follow-up Chat`;
  const subtitle = chatCondition;

  if (isLoadingSession) {
    return (
      <View className={`flex-1 ${isDark ? 'bg-stone-950' : 'bg-stone-50'} items-center justify-center`}>
        <ActivityIndicator size="large" color="#10b981" />
        <Text style={{ fontFamily: 'Fredoka_400Regular' }} className="text-stone-500 text-sm mt-3">Loading chat history...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior="padding"
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 20}
      className={`flex-1 ${isDark ? 'bg-stone-950' : 'bg-stone-50'}`}
    >
      {/* Header Bar */}
      <View className={`pt-14 pb-4 px-6 flex-row items-center border-b justify-between ${isDark ? 'bg-stone-900 border-stone-850' : 'bg-white border-stone-200/80 shadow-sm'
        }`}>
        <TouchableOpacity
          onPress={() => router.back()}
          className={`w-10 h-10 rounded-2xl items-center justify-center border ${isDark ? 'bg-stone-950 border-stone-800' : 'bg-white border-stone-200'
            }`}
        >
          <Ionicons name="arrow-back" size={20} color={isDark ? '#e7e5e4' : '#292524'} />
        </TouchableOpacity>

        <View className="items-center">
          <Text
            style={{ fontFamily: 'Fredoka_700Bold' }}
            className={`text-base font-bold ${isDark ? 'text-white' : 'text-stone-900'}`}
          >
            {headerTitle}
          </Text>
          <Text
            style={{ fontFamily: 'Fredoka_700Bold' }}
            className={`text-[10px] font-bold uppercase tracking-widest mt-0.5 ${isDark ? 'text-emerald-400' : 'text-emerald-600'
              }`}
          >
            {subtitle}
          </Text>
        </View>

        <TouchableOpacity
          onPress={handleClearChat}
          className={`w-10 h-10 rounded-2xl items-center justify-center border ${isDark ? 'bg-stone-950 border-stone-800' : 'bg-white border-stone-200'
            }`}
        >
          <Ionicons name="trash-outline" size={18} color="#ef4444" />
        </TouchableOpacity>
      </View>

      {/* Model Switcher Area (Top-Left corner of white canvas) */}
      <View
        className={`px-6 py-2.5 flex-row justify-start items-center relative z-40 ${isDark ? 'bg-stone-950' : 'bg-stone-50/50'
          }`}
      >
        <TouchableOpacity
          onPress={() => setModelDropdownVisible(!modelDropdownVisible)}
          activeOpacity={0.85}
          className={`flex-row items-center px-3 py`}
        >
          {activeModel === 'flash' ? (
            <Zap size={16} color="#10b981" style={{ marginRight: 4 }} />
          ) : (
            <Brain size={16} color="#10b981" style={{ marginRight: 4 }} />
          )}
          <Text
            style={{ fontFamily: 'Fredoka_700Bold' }}
            className={`text-[12px] font-bold ${isDark ? 'text-stone-300' : 'text-stone-700'}`}
          >
            {activeModel === 'flash' ? 'Flash' : 'Deep Think'}
          </Text>
          <Ionicons name={modelDropdownVisible ? 'chevron-up' : 'chevron-down'} size={14} color={isDark ? '#a8a29e' : '#78716c'} style={{ marginLeft: 4 }} />
        </TouchableOpacity>

        {/* Collapsible Model Dropdown Overlay relative to this button */}
        {modelDropdownVisible && (
          <View
            className={`absolute left-6 w-[280px] border shadow-2xl p-4 rounded-3xl z-[100] top-[48px] ${isDark ? 'bg-stone-900 border-stone-800' : 'bg-white border-stone-150'
              }`}
          >

            <TouchableOpacity
              onPress={() => {
                setActiveModel('flash');
                setModelDropdownVisible(false);
              }}
              activeOpacity={0.7}
              className={`flex-row items-center justify-between p-3 rounded-2xl ${activeModel === 'flash'
                ? (isDark ? 'bg-stone-800/80' : 'bg-emerald-50')
                : 'bg-transparent'
                }`}
            >
              <View className="flex-row items-center flex-1 mr-4">
                <View className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-950/40 items-center justify-center mr-3">
                  <Zap size={15} color="#10b981" />
                </View>
                <View className="flex-1">
                  <Text
                    style={{ fontFamily: 'Fredoka_700Bold' }}
                    className={`text-xs font-bold ${isDark ? 'text-white' : 'text-stone-900'}`}
                  >
                    Flash Mode
                  </Text>
                  <Text
                    style={{ fontFamily: 'Fredoka_400Regular' }}
                    className="text-stone-500 dark:text-stone-400 text-[10px] mt-0.5"
                  >
                    Fastest answers, short & mascot-friendly.
                  </Text>
                </View>
              </View>
              {activeModel === 'flash' && (
                <Ionicons name="checkmark-circle" size={18} color="#10b981" />
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                setActiveModel('deep');
                setModelDropdownVisible(false);
              }}
              activeOpacity={0.7}
              className={`flex-row items-center justify-between p-3 rounded-2xl mt-1.5 ${activeModel === 'deep'
                ? (isDark ? 'bg-stone-800/80' : 'bg-emerald-50')
                : 'bg-transparent'
                }`}
            >
              <View className="flex-row items-center flex-1 mr-4">
                <View className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-950/40 items-center justify-center mr-3">
                  <Brain size={15} color="#10b981" />
                </View>
                <View className="flex-1">
                  <Text
                    style={{ fontFamily: 'Fredoka_700Bold' }}
                    className={`text-xs font-bold ${isDark ? 'text-white' : 'text-stone-900'}`}
                  >
                    Deep Think Mode
                  </Text>
                  <Text
                    style={{ fontFamily: 'Fredoka_400Regular' }}
                    className="text-stone-500 dark:text-stone-400 text-[10px] mt-0.5"
                  >
                    Detailed reasoning & analytical consultation.
                  </Text>
                </View>
              </View>
              {activeModel === 'deep' && (
                <Ionicons name="checkmark-circle" size={18} color="#10b981" />
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Messages Scroll viewport */}
      <ScrollView
        ref={scrollViewRef}
        className="flex-1 px-6 py-4"
        contentContainerStyle={{ paddingBottom: 20 }}
        showsVerticalScrollIndicator={false}
      >
        {messages.map((msg) => (
          <View
            key={msg.id}
            className={`flex-row mb-4 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {/* AI Avatar */}
            {msg.sender === 'ai' && (
              <View style={{ marginRight: 10, marginTop: 4 }}>
                <MascotAvatar size={32} />
              </View>
            )}

            {/* Bubble & Optional Header container */}
            <View className={`flex-col ${msg.sender === 'user' ? 'max-w-[80%] items-end' : 'max-w-[80%]'}`}>
              {msg.sender === 'ai' && (
                <Text
                  style={{ fontFamily: 'Fredoka_700Bold' }}
                  className={`text-[11px] font-bold mb-1 ml-1 ${isDark ? 'text-stone-300' : 'text-stone-600'}`}
                >
                  Bugsok AI
                </Text>
              )}
              <View
                className={`rounded-[24px] px-4 py-3 ${msg.sender === 'user'
                  ? 'bg-emerald-600 rounded-tr-sm'
                  : isDark
                    ? 'bg-stone-900 border border-stone-850 rounded-tl-sm'
                    : 'bg-white border border-stone-150 rounded-tl-sm shadow-sm'
                  }`}
              >
                {msg.sender === 'ai' && msg.thought ? (
                  <CollapsibleThought thought={msg.thought} isDark={isDark} />
                ) : null}

                {msg.sender === 'ai' && msg.isNew ? (
                  msg.text.trim() ? (
                    <TypewriterBubble
                      text={msg.text}
                      isUser={false}
                      isDark={isDark}
                      onHeightChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
                      renderMessageText={renderMessageText}
                    />
                  ) : isGenerating ? (
                    <ActiveTextLoading activeModel={activeModel} />
                  ) : null
                ) : (
                  renderMessageText(msg.text, msg.sender === 'user')
                )}

                {/* Footer info: time & model tag */}
                <View className="flex-row items-center justify-between mt-2">
                  <Text
                    style={{ fontFamily: 'Fredoka_400Regular' }}
                    className={`text-[9px] ${msg.sender === 'user' ? 'text-emerald-200' : 'text-stone-500'}`}
                  >
                    {msg.timestamp}
                  </Text>

                  {msg.sender === 'ai' && msg.modelUsed && (
                    <View className="bg-emerald-950/20 px-1.5 py-0.5 rounded ml-2 flex-row items-center">
                      {msg.modelUsed === 'flash' ? (
                        <Zap size={10} color="#10b981" style={{ marginRight: 3 }} />
                      ) : (
                        <Brain size={10} color="#10b981" style={{ marginRight: 3 }} />
                      )}
                      <Text
                        style={{ fontFamily: 'Fredoka_700Bold' }}
                        className="text-[8px] text-emerald-500 font-bold uppercase"
                      >
                        {msg.modelUsed === 'flash' ? 'Flash' : 'Deep'}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            </View>
          </View>
        ))}

        {/* Typing Loader Indicator */}
        {isTyping && <TypingIndicator activeModel={activeModel} isDark={isDark} />}
      </ScrollView>



      {/* Chat input block */}
      <View
        className={`px-5 py-4 border-t flex-row items-center ${isDark ? 'bg-stone-950 border-stone-850' : 'bg-white border-stone-150'
          }`}
      >
        <View
          className={`flex-1 flex-row items-center px-4 rounded-full border ${isDark ? 'bg-stone-900 border-stone-800' : 'bg-stone-50 border-stone-250'
            }`}
        >
          <TextInput
            value={inputText}
            onChangeText={setInputText}
            placeholder={chatCropName !== 'Plant' ? `Ask about ${chatCropName}...` : 'Ask about your plant...'}
            placeholderTextColor="#a8a29e"
            className={`flex-1 py-3 text-sm ${isDark ? 'text-white' : 'text-stone-900'}`}
          />
        </View>

        <TouchableOpacity
          onPress={handleSend}
          className="w-12 h-12 bg-emerald-600 rounded-full items-center justify-center ml-3 shadow-md shadow-emerald-600/10"
        >
          <Ionicons name="send" size={16} color="white" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}
