import { FredokaText as Text } from '@/components/themed-text';
import { Ionicons } from '@expo/vector-icons';
import { Image as ExpoImage } from 'expo-image';
import { useRouter } from 'expo-router';
import { Brain, Zap } from 'lucide-react-native';
import React, { useEffect, useRef, useState } from 'react';
import {
  Image, Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  TextInput,
  TouchableOpacity,
  useColorScheme,
  View
} from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import vegetablesDb from '../../../assets/data/vegetables_db.json';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { chatWithAI } from '../../services/api.service';
import {
  clearGeneralChat,
  fetchGeneralChatMessages,
  fetchUserScans,
  LocalScanRow,
  saveGeneralChatMessage
} from '../../services/scan.service';

interface Message {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  thought?: string;
  timestamp: string;
  modelUsed?: 'flash' | 'deep';
  isNew?: boolean;
  attachedScan?: {
    cropName: string;
    conditionName: string;
  } | null;
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
      <ExpoImage
        source={require('../../../assets/images/mascot-logo.png')}
        style={{
          width: size * 1.05,
          height: size * 1.05,
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
      className={`mt-1 mb-2 rounded-[16px] overflow-hidden border ${isDark ? 'bg-stone-900 border-stone-850' : 'bg-stone-50 border-stone-200'
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
            className={`text-xs leading-5 italic ${isDark ? 'text-stone-400' : 'text-stone-500'}`}
          >
            {thought}
          </Text>
        </View>
      )}
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
          className="text-[11px] font-bold mb-1 ml-1 text-stone-600"
        >
          Bugsok AI
        </Text>
        <View className="rounded-[24px] px-5 py-3.5 border bg-white border-stone-150 shadow-sm">
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
  const { user } = useAuth();
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const scrollViewRef = useRef<ScrollView>(null);
  const chatAbortControllerRef = useRef<AbortController | null>(null);
  const { showToast } = useToast();

  // Mode state: 'flash' vs 'deep'
  const [activeModel, setActiveModel] = useState<'flash' | 'deep'>('flash');
  const [modelDropdownVisible, setModelDropdownVisible] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  // Attachment states
  const [scanHistory, setScanHistory] = useState<LocalScanRow[]>([]);
  const [attachedScan, setAttachedScan] = useState<LocalScanRow | null>(null);
  const [pickerModalVisible, setPickerModalVisible] = useState(false);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  // Animations
  const chevronRotation = useSharedValue(0);
  const [shouldRenderDropdown, setShouldRenderDropdown] = useState(false);
  const dropdownOpacity = useSharedValue(0);
  const dropdownTranslateY = useSharedValue(-10);

  const [shouldRenderDeleteModal, setShouldRenderDeleteModal] = useState(false);
  const deleteModalOpacity = useSharedValue(0);
  const deleteModalScale = useSharedValue(0.9);

  // Load chat messages on mount/session load
  const loadMessages = async () => {
    if (!user) return;
    try {
      const dbMsgs = fetchGeneralChatMessages(user.id);
      const formatted = dbMsgs.map((m) => {
        // Parse thoughts if they are encoded like `<thought>...</thought>`
        let text = m.message;
        let thought = '';
        const match = text.match(/<thought>([\s\S]*?)<\/thought>/);
        if (match) {
          thought = match[1];
          text = text.replace(/<thought>[\s\S]*?<\/thought>/, '');
        }

        // Retrieve attached scan details
        let attachedDetails = null;
        if (m.attached_scan_id) {
          const scans = fetchUserScans(user.id);
          const found = scans.find((s) => s.id === m.attached_scan_id);
          if (found) {
            attachedDetails = {
              cropName: found.crop_name,
              conditionName: found.condition_name,
            };
          }
        }

        return {
          id: m.id,
          sender: m.sender,
          text,
          thought,
          timestamp: new Date(m.created_at).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          }),
          modelUsed: m.model_used as 'flash' | 'deep',
          isNew: false,
          attachedScan: attachedDetails,
        };
      });
      setMessages(formatted);
      setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: false }), 150);
    } catch (err) {
      console.error('[General Chat] Load messages error:', err);
    }
  };

  const loadScanHistoryData = () => {
    if (!user) return;
    const scans = fetchUserScans(user.id);
    setScanHistory(scans);
  };

  useEffect(() => {
    loadMessages();
    loadScanHistoryData();
  }, [user]);

  // Monitor keyboard visibility to dynamically space input bar above bottom tab bar
  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === 'android' ? 'keyboardDidShow' : 'keyboardWillShow',
      () => setIsKeyboardVisible(true)
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === 'android' ? 'keyboardDidHide' : 'keyboardWillHide',
      () => setIsKeyboardVisible(false)
    );
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  // Chevron rotation effect
  useEffect(() => {
    chevronRotation.value = withTiming(modelDropdownVisible ? 180 : 0, {
      duration: 250,
      easing: Easing.bezier(0.25, 1, 0.5, 1),
    });
  }, [modelDropdownVisible]);

  // Dropdown transition effect
  useEffect(() => {
    if (modelDropdownVisible) {
      setShouldRenderDropdown(true);
      dropdownOpacity.value = withTiming(1, { duration: 200 });
      dropdownTranslateY.value = withTiming(0, { duration: 200, easing: Easing.out(Easing.quad) });
    } else {
      dropdownOpacity.value = withTiming(0, { duration: 150 }, (finished) => {
        if (finished) {
          runOnJS(setShouldRenderDropdown)(false);
        }
      });
      dropdownTranslateY.value = withTiming(-10, { duration: 150 });
    }
  }, [modelDropdownVisible]);

  // Delete Modal transition effect
  useEffect(() => {
    if (deleteModalVisible) {
      setShouldRenderDeleteModal(true);
      deleteModalOpacity.value = withTiming(1, { duration: 250 });
      deleteModalScale.value = withTiming(1.0, { duration: 200, easing: Easing.out(Easing.quad) });
    } else {
      deleteModalOpacity.value = withTiming(0, { duration: 200 }, (finished) => {
        if (finished) {
          runOnJS(setShouldRenderDeleteModal)(false);
        }
      });
      deleteModalScale.value = withTiming(0.9, { duration: 200 });
    }
  }, [deleteModalVisible]);

  // Text Formatter for **bold** key terms
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
            : 'text-stone-850'
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
                // This is italic text
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

  // Clean / Clear Conversation thread
  const handleClearConversation = async () => {
    if (!user) return;
    try {
      if (chatAbortControllerRef.current) {
        chatAbortControllerRef.current.abort();
      }
      await clearGeneralChat(user.id);
      setMessages([]);
      setDeleteModalVisible(false);
      showToast({
        type: 'success',
        title: 'Chat Cleared',
        message: 'Your general conversation has been successfully cleared.',
      });
    } catch (err) {
      console.error('[General Chat] Clear error:', err);
    }
  };

  // Send message implementation
  const handleSend = async () => {
    if (!inputText.trim() || isGenerating || !user) return;

    const userMsgText = inputText.trim();
    setInputText('');

    // Attach scan reference context if selected
    const activeAttached = attachedScan;
    setAttachedScan(null); // Clear active attachment for next message

    const userMsg: Message = {
      id: Date.now().toString(),
      sender: 'user',
      text: userMsgText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      attachedScan: activeAttached
        ? {
          cropName: activeAttached.crop_name,
          conditionName: activeAttached.condition_name,
        }
        : null,
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsTyping(true);
    setIsGenerating(true);

    // Persist user message
    try {
      await saveGeneralChatMessage(
        user.id,
        'user',
        userMsgText,
        activeModel,
        activeAttached ? activeAttached.id : null
      );
    } catch (err) {
      console.error('[General Chat] Save user msg error:', err);
    }

    setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);

    // Guardrail Check: Math / Coding rejection logic
    const containsCodingOrMath = (text: string) => {
      const lower = text.toLowerCase();
      const codeKeywords = ['javascript', 'python', 'java', 'programming', 'code', 'coding', 'function', 'class', 'compile', 'react native'];
      const mathKeywords = ['solve', 'equation', 'algebra', 'calculus', 'theorem', 'derivative', 'integral', 'matrix'];
      const arithmeticMatch = text.match(/\b\d+\s*[\+\-\*\/]\s*\d+\b/); // e.g. 2 + 2

      return (
        codeKeywords.some((k) => lower.includes(k)) ||
        mathKeywords.some((k) => lower.includes(k)) ||
        arithmeticMatch
      );
    };

    if (containsCodingOrMath(userMsgText)) {
      // Simulate typing delay before guardrail response
      await new Promise((resolve) => setTimeout(resolve, 1500));
      const rejectText = "I'm sorry, but I can only answer questions related to Philippine agricultural crops, plant health, benefits, and recipes. Please ask me about crop diagnostics or gardening tips! 🌱";
      const aiMsgId = (Date.now() + 1).toString();

      setIsTyping(false);
      setIsGenerating(false);

      setMessages((prev) => [
        ...prev,
        {
          id: aiMsgId,
          sender: 'ai',
          text: rejectText,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          modelUsed: activeModel,
          isNew: true,
        },
      ]);

      try {
        await saveGeneralChatMessage(user.id, 'ai', rejectText, activeModel, null);
      } catch (err) {
        console.error('[General Chat] Save guardrail response error:', err);
      }

      setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
      return;
    }

    // Context Preparation:
    let contextString = '';
    if (activeAttached) {
      // 1. Attached Scan Context
      const cropDb = vegetablesDb[activeAttached.crop_name as keyof typeof vegetablesDb];
      contextString = `
        Attached Crop: ${activeAttached.crop_name}
        Condition Details: ${activeAttached.condition_name}
        Severity level: ${activeAttached.severity}
        Diagnose details: ${activeAttached.diagnosis_text}
        Vegetable DB Reference Profile: ${cropDb ? JSON.stringify(cropDb) : ''}
      `;
    } else {
      // 2. Auto-detect crop mention from message text
      let cropKey = 'Talong'; // default fallback database profile
      for (const key of Object.keys(vegetablesDb)) {
        const dbEntry = vegetablesDb[key as keyof typeof vegetablesDb];
        const lowerMsg = userMsgText.toLowerCase();
        if (
          lowerMsg.includes(key.toLowerCase()) ||
          lowerMsg.includes(dbEntry.local_name.toLowerCase()) ||
          lowerMsg.includes(dbEntry.scientific_name.toLowerCase())
        ) {
          cropKey = key;
          break;
        }
      }
      const cropDb = vegetablesDb[cropKey as keyof typeof vegetablesDb];
      contextString = cropDb ? JSON.stringify(cropDb) : '';
    }

    // Assemble conversation history for backend prompt
    const apiHistory = [...messages, userMsg].map((m) => ({
      role: m.sender === 'user' ? ('user' as const) : ('assistant' as const),
      content: m.text,
    }));

    let accumulatedText = '';
    let accumulatedThought = '';
    const aiMsgId = (Date.now() + 1).toString();

    // Cancel active stream
    if (chatAbortControllerRef.current) {
      chatAbortControllerRef.current.abort();
    }
    chatAbortControllerRef.current = new AbortController();

    chatWithAI(
      apiHistory,
      contextString,
      activeModel,
      // onChunk
      (chunk) => {
        if (chunk.thought) {
          accumulatedThought += chunk.thought;
          setIsTyping(false);
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
          setIsTyping(false);
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
      // onDone
      async () => {
        setIsTyping(false);
        setIsGenerating(false);

        const finalMsgText = accumulatedThought
          ? `<thought>${accumulatedThought}</thought>${accumulatedText}`
          : accumulatedText;

        try {
          await saveGeneralChatMessage(
            user.id,
            'ai',
            finalMsgText,
            activeModel,
            activeAttached ? activeAttached.id : null
          );
          // Set isNew to false to avoid typewriting again on state refresh
          setMessages((prev) =>
            prev.map((m) => (m.id === aiMsgId ? { ...m, isNew: false } : m))
          );
        } catch (err) {
          console.error('[General Chat] Save AI message error:', err);
        }
      },
      // onError
      (error) => {
        setIsTyping(false);
        setIsGenerating(false);
        showToast({
          type: 'error',
          title: 'Connection Issue',
          message: error || 'Failed to connect to chat agent. Check network.',
        });
      },
      chatAbortControllerRef.current.signal
    );
  };

  // Reanimated style declarations
  const animatedChevronStyle = useAnimatedStyle(() => {
    return {
      transform: [{ rotate: `${chevronRotation.value}deg` }],
    };
  });

  const animatedDropdownStyle = useAnimatedStyle(() => {
    return {
      opacity: dropdownOpacity.value,
      transform: [{ translateY: dropdownTranslateY.value }],
    };
  });

  const animatedDeleteModalStyle = useAnimatedStyle(() => {
    return {
      opacity: deleteModalOpacity.value,
      transform: [{ scale: deleteModalScale.value }],
    };
  });

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      className="flex-1 bg-stone-50"
    >
      {/* HEADER SECTION */}
      <View className="pt-14 pb-4 px-6 flex-row justify-between items-center bg-white border-b border-stone-100 z-10">
        <View className="flex-row items-center flex-1">
          <MascotAvatar size={36} />
          <View className="ml-3">
            <Text style={{ fontFamily: 'Fredoka_700Bold' }} className="text-stone-900 text-[15px] font-bold">
              Bugsok AI
            </Text>
            <Text style={{ fontFamily: 'Fredoka_400Regular' }} className="text-stone-400 text-[10px] mt-0.5">
              General Specialist
            </Text>
          </View>
        </View>

        {/* Action Toggles */}
        <View className="flex-row items-center space-x-2">
          {/* AI MODEL DROPDOWN TOGGLE */}
          <TouchableOpacity
            onPress={() => setModelDropdownVisible(!modelDropdownVisible)}
            activeOpacity={0.8}
            className="flex-row items-center bg-stone-100 px-3.5 py-2 rounded-2xl mr-2"
          >
            {activeModel === 'flash' ? (
              <Zap size={13} color="#10b981" fill="#10b981" />
            ) : (
              <Brain size={13} color="#10b981" fill="#10b981" />
            )}
            <Text
              style={{ fontFamily: 'Fredoka_700Bold' }}
              className="text-[10px] font-bold text-stone-700 ml-1.5 uppercase tracking-wide"
            >
              {activeModel}
            </Text>
            <Animated.View style={animatedChevronStyle}>
              <Ionicons name="chevron-down" size={12} color="#57534e" style={{ marginLeft: 6 }} />
            </Animated.View>
          </TouchableOpacity>

          {/* TRASH ICON */}
          <TouchableOpacity
            onPress={() => setDeleteModalVisible(true)}
            activeOpacity={0.85}
            className="w-10 h-10 bg-emerald-50 rounded-2xl items-center justify-center border border-emerald-100"
          >
            <Ionicons name="trash-outline" size={16} color="#10b981" />
          </TouchableOpacity>
        </View>
      </View>

      {/* AI MODEL SELECTOR DROPDOWN */}
      {shouldRenderDropdown && (
        <Animated.View
          style={[animatedDropdownStyle]}
          className="absolute top-[84px] right-16 w-56 bg-white rounded-3xl border border-stone-100 p-2 shadow-lg shadow-stone-200/50 z-20"
        >
          <TouchableOpacity
            onPress={() => {
              setActiveModel('flash');
              setModelDropdownVisible(false);
            }}
            className={`flex-row items-center p-3 rounded-2xl ${activeModel === 'flash' ? 'bg-emerald-50' : 'bg-transparent'}`}
          >
            <Zap size={14} color="#10b981" fill={activeModel === 'flash' ? '#10b981' : 'transparent'} />
            <View className="ml-3">
              <Text style={{ fontFamily: 'Fredoka_700Bold' }} className="text-stone-900 text-xs font-bold">
                Flash Mode
              </Text>
              <Text style={{ fontFamily: 'Fredoka_400Regular' }} className="text-stone-400 text-[9px] mt-0.5">
                Concise & Fast response
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              setActiveModel('deep');
              setModelDropdownVisible(false);
            }}
            className={`flex-row items-center p-3 rounded-2xl ${activeModel === 'deep' ? 'bg-emerald-50' : 'bg-transparent'}`}
          >
            <Brain size={14} color="#10b981" fill={activeModel === 'deep' ? '#10b981' : 'transparent'} />
            <View className="ml-3">
              <Text style={{ fontFamily: 'Fredoka_700Bold' }} className="text-stone-900 text-xs font-bold">
                Deep Think Mode
              </Text>
              <Text style={{ fontFamily: 'Fredoka_400Regular' }} className="text-stone-400 text-[9px] mt-0.5">
                Structured & Reasoning
              </Text>
            </View>
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* CHAT MESSAGES SCROLL AREA */}
      <ScrollView
        ref={scrollViewRef}
        className="flex-1 px-6 pt-4"
        contentContainerStyle={{ paddingBottom: isKeyboardVisible ? 30 : 100 }}
        showsVerticalScrollIndicator={false}
      >
        {messages.length === 0 ? (
          <View className="py-20 items-center justify-center">
            <View className="w-16 h-16 rounded-full bg-emerald-50 items-center justify-center mb-4 border border-emerald-100">
              <Ionicons name="chatbubbles-outline" size={26} color="#10b981" />
            </View>
            <Text style={{ fontFamily: 'Fredoka_700Bold' }} className="text-stone-800 text-sm font-bold text-center">
              General Chat with Bugsok
            </Text>
            <Text style={{ fontFamily: 'Fredoka_400Regular' }} className="text-stone-400 text-xs text-center mt-1 px-6 leading-5">
              Ask general questions about Philippine crops, diseases, organic sprays, or attach a past diagnosis to discuss treatment!
            </Text>
          </View>
        ) : (
          messages.map((m) => {
            const isUser = m.sender === 'user';
            return (
              <View key={m.id} className={`flex-row mb-4 ${isUser ? 'justify-end' : 'justify-start'}`}>
                {/* Mascot Icon for model messages */}
                {!isUser && (
                  <View style={{ marginRight: 10, marginTop: 4 }}>
                    <MascotAvatar size={32} />
                  </View>
                )}

                <View className="flex-col max-w-[80%]">
                  {/* Sender Name label */}
                  <Text
                    style={{ fontFamily: 'Fredoka_700Bold' }}
                    className={`text-[11px] font-bold mb-1 ml-1 ${isUser ? 'text-right mr-1 text-stone-500' : 'text-stone-600'}`}
                  >
                    {isUser ? 'You' : 'Bugsok AI'}
                  </Text>

                  {/* Message bubble itself */}
                  <View
                    className={`rounded-[24px] px-5 py-3.5 border ${isUser
                      ? 'bg-emerald-600 border-emerald-600 rounded-tr-sm'
                      : 'bg-white border-stone-150 rounded-tl-sm shadow-sm'
                      }`}
                  >
                    {/* Collapsible Thoughts if Deep Think was used */}
                    {!isUser && m.thought && <CollapsibleThought thought={m.thought} isDark={isDark} />}

                    {/* Speech content */}
                    {m.isNew && !isUser ? (
                      <TypewriterBubble
                        text={m.text}
                        isUser={isUser}
                        isDark={isDark}
                        onHeightChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
                        renderMessageText={renderMessageText}
                      />
                    ) : (
                      renderMessageText(m.text, isUser)
                    )}

                    {/* Linked Context Tag */}
                    {m.attachedScan && (
                      <View className={`flex-row items-center mt-2.5 pt-2 border-t ${isUser ? 'border-white/20' : 'border-stone-100'}`}>
                        <Ionicons name="attach" size={11} color={isUser ? '#d1fae5' : '#10b981'} />
                        <Text
                          style={{ fontFamily: 'Fredoka_700Bold' }}
                          className={`text-[9px] font-bold uppercase tracking-wider ml-1 ${isUser ? 'text-emerald-100' : 'text-emerald-600'}`}
                        >
                          Linked: {m.attachedScan.cropName} ({m.attachedScan.conditionName})
                        </Text>
                      </View>
                    )}
                  </View>

                  <Text
                    style={{ fontFamily: 'Fredoka_400Regular' }}
                    className={`text-[9px] text-stone-400 mt-1 ml-1 ${isUser ? 'text-right mr-1' : ''}`}
                  >
                    {m.timestamp}
                  </Text>
                </View>
              </View>
            );
          })
        )}

        {isTyping && <TypingIndicator activeModel={activeModel} isDark={isDark} />}
      </ScrollView>

      {/* INPUT / DOCK FOOTER */}
      <View
        className="bg-white border-t border-stone-150"
        style={{
          paddingHorizontal: 16,
          paddingTop: 12,
          paddingBottom: isKeyboardVisible ? 14 : 96,
        }}
      >
        {/* Option A: Attached Diagnosis Preview Chip */}
        {attachedScan && (
          <View className="flex-row items-center self-start bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-100 mb-2">
            <Ionicons name="attach" size={12} color="#059669" />
            <Text
              style={{ fontFamily: 'Fredoka_700Bold' }}
              className="text-emerald-700 text-[10px] font-bold ml-1.5"
              numberOfLines={1}
            >
              {attachedScan.crop_name} — {attachedScan.condition_name}
            </Text>
            <TouchableOpacity
              onPress={() => setAttachedScan(null)}
              className="w-4 h-4 bg-emerald-100 rounded-full items-center justify-center ml-2"
            >
              <Ionicons name="close" size={10} color="#059669" />
            </TouchableOpacity>
          </View>
        )}

        {/* Input Bar wrapper */}
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 10 }}>
          {/* Clip attachment button */}
          <TouchableOpacity
            onPress={() => setPickerModalVisible(true)}
            activeOpacity={0.8}
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: '#f5f5f4',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Ionicons name="attach" size={22} color="#57534e" />
          </TouchableOpacity>

          {/* Multiline auto-growing text field */}
          <View
            style={{
              flex: 1,
              backgroundColor: '#f5f5f4',
              borderRadius: 22,
              paddingHorizontal: 16,
              paddingVertical: 10,
              maxHeight: 120,
              borderWidth: 1,
              borderColor: '#e7e5e4',
            }}
          >
            <TextInput
              value={inputText}
              onChangeText={setInputText}
              placeholder="Ask about crops or attach a..."
              placeholderTextColor="#a8a29e"
              multiline
              style={{
                fontFamily: 'Fredoka_400Regular',
                fontSize: 13,
                color: '#292524',
                padding: 0,
                margin: 0,
                minHeight: 22,
              }}
            />
          </View>

          {/* Send button */}
          <TouchableOpacity
            onPress={handleSend}
            disabled={!inputText.trim() || isGenerating}
            activeOpacity={0.8}
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: !inputText.trim() || isGenerating ? '#f5f5f4' : '#059669',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Ionicons
              name="send"
              size={16}
              color={!inputText.trim() || isGenerating ? '#a8a29e' : '#FFFFFF'}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* SCAN PICKER MODAL (Bottom Sheet overlay) */}
      <Modal
        visible={pickerModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setPickerModalVisible(false)}
      >
        <View className="flex-1 bg-black/50 justify-end">
          {/* Backdrop Touch Clear */}
          <TouchableOpacity
            activeOpacity={1}
            onPress={() => setPickerModalVisible(false)}
            className="flex-1"
          />

          {/* Sheet Body Container */}
          <View className="bg-white rounded-t-[32px] p-6 max-h-[75%] border-t border-stone-100">
            {/* Header section */}
            <View className="flex-row justify-between items-center pb-4 mb-4 border-b border-stone-100">
              <View className="flex-row items-center">
                <Ionicons name="attach-outline" size={18} color="#059669" />
                <Text style={{ fontFamily: 'Fredoka_700Bold' }} className="text-stone-900 text-base font-bold ml-2">
                  Attach Diagnosis History
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setPickerModalVisible(false)}
                className="w-7 h-7 bg-stone-100 rounded-full items-center justify-center"
              >
                <Ionicons name="close" size={14} color="#57534e" />
              </TouchableOpacity>
            </View>

            {/* Scan Card History List */}
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
              {scanHistory.length === 0 ? (
                <View className="py-12 items-center justify-center">
                  <Ionicons name="leaf-outline" size={32} color="#a8a29e" />
                  <Text style={{ fontFamily: 'Fredoka_700Bold' }} className="text-stone-400 text-xs mt-2 text-center">
                    No Diagnoses Available
                  </Text>
                  <Text style={{ fontFamily: 'Fredoka_400Regular' }} className="text-stone-400 text-[10px] mt-0.5 text-center px-4 leading-4">
                    Diagnose a crop leaf first using the 'Scan' screen to log history here.
                  </Text>
                </View>
              ) : (
                scanHistory.map((scan) => {
                  const getSeverityColors = (severity: string) => {
                    if (severity === 'High') return { barColor: '#ef4444', textColor: '#ef4444' };
                    if (severity === 'Moderate') return { barColor: '#f97316', textColor: '#f97316' };
                    if (severity === 'Low') return { barColor: '#eab308', textColor: '#eab308' };
                    return { barColor: '#10b981', textColor: '#10b981' };
                  };

                  const { barColor, textColor } = getSeverityColors(scan.severity);

                  const formatDate = (dateStr: string) => {
                    try {
                      const d = new Date(dateStr);
                      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                    } catch { return dateStr; }
                  };

                  const displayImage = scan.cloud_image_url || scan.local_image_path || null;

                  return (
                    <TouchableOpacity
                      key={scan.id}
                      activeOpacity={0.85}
                      onPress={() => {
                        setAttachedScan(scan);
                        setPickerModalVisible(false);
                      }}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        padding: 14,
                        borderRadius: 20,
                        borderWidth: 1,
                        borderColor: '#f5f5f4',
                        marginBottom: 10,
                        backgroundColor: '#ffffff',
                      }}
                    >
                      {/* Crop Image Thumbnail */}
                      <View style={{ width: 56, height: 56, borderRadius: 14, overflow: 'hidden', marginRight: 14, backgroundColor: '#f5f5f4' }}>
                        {displayImage ? (
                          <Image
                            source={{ uri: displayImage }}
                            style={{ width: '100%', height: '100%' }}
                            resizeMode="cover"
                          />
                        ) : (
                          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                            <Ionicons name="leaf-outline" size={22} color="#a8a29e" />
                          </View>
                        )}
                      </View>

                      {/* Content details */}
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Text style={{ fontFamily: 'Fredoka_700Bold', fontSize: 13, color: '#1c1917' }} numberOfLines={1}>
                            {scan.crop_name}
                          </Text>
                          <Text style={{ fontFamily: 'Fredoka_700Bold', fontSize: 11, color: textColor }}>
                            {scan.health_score}%
                          </Text>
                        </View>

                        <Text style={{ fontFamily: 'Fredoka_400Regular', fontSize: 11, color: '#78716c', marginTop: 2 }} numberOfLines={1}>
                          {scan.condition_name}
                        </Text>

                        {/* Mini health progress bar */}
                        <View style={{ height: 3, backgroundColor: '#f5f5f4', borderRadius: 999, marginTop: 6, overflow: 'hidden' }}>
                          <View style={{ width: `${scan.health_score}%`, height: '100%', backgroundColor: barColor, borderRadius: 999 }} />
                        </View>

                        <Text style={{ fontFamily: 'Fredoka_400Regular', fontSize: 9, color: '#a8a29e', marginTop: 4 }}>
                          {formatDate(scan.created_at)}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* CONFIRM DELETE CONVERSATION MODAL */}
      {shouldRenderDeleteModal && (
        <Modal transparent visible={deleteModalVisible} animationType="none" onRequestClose={() => setDeleteModalVisible(false)}>
          <View className="flex-1 bg-black/60 justify-center items-center px-8">
            <Animated.View
              style={[animatedDeleteModalStyle]}
              className="bg-white rounded-[32px] p-6 w-full max-w-[320px] items-center border border-stone-100"
            >
              {/* Sad Mascot Image */}
              <View className="w-28 h-28 items-center justify-center mb-4">
                <ExpoImage
                  source={require('../../../assets/images/mascot-transparent-sad.png')}
                  style={{ width: '100%', height: '100%' }}
                  contentFit="contain"
                />
              </View>

              <Text style={{ fontFamily: 'Fredoka_700Bold' }} className="text-stone-900 text-[15px] font-bold text-center">
                Clear General Chat?
              </Text>
              <Text style={{ fontFamily: 'Fredoka_400Regular' }} className="text-stone-400 text-xs text-center mt-2 px-1 leading-5">
                This will delete your entire general conversation history. This action cannot be undone.
              </Text>

              {/* Action Buttons */}
              <View className="flex-row w-full space-x-3 mt-6">
                <TouchableOpacity
                  onPress={() => setDeleteModalVisible(false)}
                  className="flex-1 py-3 bg-stone-100 rounded-2xl items-center"
                >
                  <Text style={{ fontFamily: 'Fredoka_700Bold' }} className="text-stone-600 text-xs font-bold">
                    Cancel
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleClearConversation}
                  className="flex-1 py-3 bg-emerald-600 rounded-2xl items-center"
                >
                  <Text style={{ fontFamily: 'Fredoka_700Bold' }} className="text-white text-xs font-bold">
                    Clear Chat
                  </Text>
                </TouchableOpacity>
              </View>
            </Animated.View>
          </View>
        </Modal>
      )}
    </KeyboardAvoidingView>
  );
}
