import React, { useState, useRef, useEffect } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, useColorScheme, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useScan } from '../context/ScanContext';
import { useToast } from '../context/ToastContext';
import { chatWithAI } from '../services/api.service';
import vegetablesDb from '../../assets/data/vegetables_db.json';

interface Message {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: string;
  modelUsed?: 'flash' | 'deep';
}

export default function ChatScreen() {
  const router = useRouter();
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const scrollViewRef = useRef<ScrollView>(null);
  const chatAbortControllerRef = useRef<AbortController | null>(null);

  const { diagnosisResult, identifiedCrop } = useScan();
  const { showToast } = useToast();

  // Model selection state: 'flash' vs 'deep'
  const [activeModel, setActiveModel] = useState<'flash' | 'deep'>('flash');
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);

  // Dynamically initialize conversation greeting based on scan results context
  useEffect(() => {
    const greetingText = diagnosisResult
      ? `Hello! I am your plant care assistant. I noticed from the analysis that your **${diagnosisResult.cropLocalName}** has **${diagnosisResult.condition}** with a severity of **${diagnosisResult.severity}** (${diagnosisResult.healthScore}% health score).\n\nDo you have any questions about its treatment, prevention, or care?`
      : 'Hello! I am your plant care assistant. How can I help you with your crops today?';

    setMessages([
      {
        id: '1',
        sender: 'ai',
        text: greetingText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        modelUsed: 'flash',
      },
    ]);
  }, [diagnosisResult]);

  // Clean up abort controllers on unmount
  useEffect(() => {
    return () => {
      if (chatAbortControllerRef.current) {
        chatAbortControllerRef.current.abort();
      }
    };
  }, []);

  const handleSend = () => {
    if (!inputText.trim()) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      sender: 'user',
      text: inputText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setIsTyping(true);

    // Scroll to bottom after user sends message
    setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);

    // Get DB metadata context for the current crop
    const cropKey = identifiedCrop || diagnosisResult?.cropLocalName || 'Talong';
    const cropDb = vegetablesDb[cropKey as keyof typeof vegetablesDb];
    const contextString = cropDb ? JSON.stringify(cropDb) : '';

    // Prepare history payload for API
    const apiHistory = [...messages, userMsg].map((m) => ({
      role: m.sender === 'user' ? ('user' as const) : ('assistant' as const),
      content: m.text,
    }));

    let accumulatedText = '';
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
                  timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                  modelUsed: activeModel,
                },
              ];
            }
          });
          scrollViewRef.current?.scrollToEnd({ animated: true });
        }
      },
      // onDone callback
      () => {
        setIsTyping(false);
        scrollViewRef.current?.scrollToEnd({ animated: true });
      },
      // onError callback
      (err) => {
        setIsTyping(false);
        showToast({
          type: 'error',
          title: 'Chat Failed',
          message: err,
        });
      },
      chatAbortControllerRef.current.signal
    );
  };

  const handleClearChat = () => {
    if (chatAbortControllerRef.current) {
      chatAbortControllerRef.current.abort();
    }

    const greetingText = diagnosisResult
      ? `Hello! I am your plant care assistant. I noticed from the analysis that your **${diagnosisResult.cropLocalName}** has **${diagnosisResult.condition}** with a severity of **${diagnosisResult.severity}** (${diagnosisResult.healthScore}% health score).\n\nDo you have any questions about its treatment, prevention, or care?`
      : 'Hello! I am your plant care assistant. How can I help you with your crops today?';

    setMessages([
      {
        id: Date.now().toString(),
        sender: 'ai',
        text: greetingText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        modelUsed: 'flash',
      },
    ]);
  };

  const cropName = diagnosisResult?.cropLocalName || identifiedCrop || 'Plant';
  const headerTitle = `${cropName} Follow-up Chat`;
  const subtitle = diagnosisResult?.condition || 'General Care';

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      className={`flex-1 ${isDark ? 'bg-stone-950' : 'bg-stone-50'}`}
    >
      {/* Header Bar */}
      <View className="pt-14 pb-4 px-6 flex-row items-center border-b border-stone-800/5 justify-between bg-white">
        <TouchableOpacity
          onPress={() => router.back()}
          className={`w-10 h-10 rounded-2xl items-center justify-center border ${
            isDark ? 'bg-stone-900 border-stone-850' : 'bg-white border-stone-200'
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
            className="text-[10px] text-emerald-500 font-bold uppercase tracking-widest mt-0.5"
          >
            {subtitle}
          </Text>
        </View>

        <TouchableOpacity
          onPress={handleClearChat}
          className={`w-10 h-10 rounded-2xl items-center justify-center border ${
            isDark ? 'bg-stone-900 border-stone-850' : 'bg-white border-stone-200'
          }`}
        >
          <Ionicons name="trash-outline" size={18} color="#ef4444" />
        </TouchableOpacity>
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
              <View className="w-8 h-8 rounded-full bg-emerald-600 items-center justify-center mr-2.5 mt-1">
                <Ionicons name="leaf" size={14} color="white" />
              </View>
            )}

            {/* Bubble */}
            <View
              className={`max-w-[80%] rounded-[24px] px-4 py-3 ${
                msg.sender === 'user'
                  ? 'bg-emerald-600 rounded-tr-sm'
                  : isDark
                  ? 'bg-stone-900 border border-stone-850 rounded-tl-sm'
                  : 'bg-white border border-stone-150 rounded-tl-sm shadow-sm'
              }`}
            >
              <Text
                style={{ fontFamily: 'Fredoka_400Regular' }}
                className={`text-sm leading-5 ${
                  msg.sender === 'user'
                    ? 'text-white font-medium'
                    : isDark
                    ? 'text-stone-200'
                    : 'text-stone-800'
                }`}
              >
                {msg.text}
              </Text>

              {/* Footer info: time & model tag */}
              <View className="flex-row items-center justify-between mt-2">
                <Text
                  style={{ fontFamily: 'Fredoka_450' }}
                  className={`text-[9px] ${msg.sender === 'user' ? 'text-emerald-200' : 'text-stone-500'}`}
                >
                  {msg.timestamp}
                </Text>

                {msg.sender === 'ai' && msg.modelUsed && (
                  <View className="bg-emerald-950/20 px-1.5 py-0.5 rounded ml-2">
                    <Text
                      style={{ fontFamily: 'Fredoka_700Bold' }}
                      className="text-[8px] text-emerald-500 font-bold uppercase"
                    >
                      {msg.modelUsed === 'flash' ? '⚡ Flash' : '🧠 Deep'}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </View>
        ))}

        {/* Typing Loader Indicator */}
        {isTyping && (
          <View className="flex-row items-center mb-4">
            <View className="w-8 h-8 rounded-full bg-emerald-600 items-center justify-center mr-2.5">
              <Ionicons name="leaf" size={14} color="white" />
            </View>
            <View
              className={`rounded-[24px] px-5 py-3.5 border ${
                isDark ? 'bg-stone-900 border-stone-850' : 'bg-white border-stone-150 shadow-sm'
              }`}
            >
              <Text
                style={{ fontFamily: 'Fredoka_400Regular' }}
                className="text-stone-400 text-xs italic"
              >
                AI is typing...
              </Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Model Toggle pill bar directly above input */}
      <View
        className={`px-6 py-2 border-t flex-row items-center justify-between ${
          isDark ? 'bg-stone-900/40 border-stone-850' : 'bg-stone-100/80 border-stone-200'
        }`}
      >
        <Text
          style={{ fontFamily: 'Fredoka_700Bold' }}
          className={`text-[10px] font-bold uppercase tracking-wider ${
            isDark ? 'text-stone-500' : 'text-stone-400'
          }`}
        >
          Model:
        </Text>

        {/* Toggle pill button */}
        <View
          className={`flex-row p-1 rounded-full ${
            isDark ? 'bg-stone-950 border border-stone-850' : 'bg-stone-200/50'
          }`}
        >
          <TouchableOpacity
            onPress={() => setActiveModel('flash')}
            className={`px-3 py-1 rounded-full flex-row items-center ${
              activeModel === 'flash' ? 'bg-emerald-600' : ''
            }`}
          >
            <Text
              style={{ fontFamily: 'Fredoka_700Bold' }}
              className={`text-[10px] font-bold ${
                activeModel === 'flash'
                  ? 'text-white'
                  : isDark
                  ? 'text-stone-500'
                  : 'text-stone-600'
              }`}
            >
              ⚡ Flash
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setActiveModel('deep')}
            className={`px-3 py-1 rounded-full flex-row items-center ${
              activeModel === 'deep' ? 'bg-emerald-600' : ''
            }`}
          >
            <Text
              style={{ fontFamily: 'Fredoka_700Bold' }}
              className={`text-[10px] font-bold ${
                activeModel === 'deep' ? 'text-white' : isDark ? 'text-stone-500' : 'text-stone-600'
              }`}
            >
              🧠 Deep
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Chat input block */}
      <View
        className={`px-5 py-4 border-t flex-row items-center ${
          isDark ? 'bg-stone-950 border-stone-850' : 'bg-white border-stone-150'
        }`}
      >
        <View
          className={`flex-1 flex-row items-center px-4 rounded-full border ${
            isDark ? 'bg-stone-900 border-stone-800' : 'bg-stone-50 border-stone-250'
          }`}
        >
          <TextInput
            value={inputText}
            onChangeText={setInputText}
            placeholder={identifiedCrop ? `Ask about ${identifiedCrop}...` : 'Ask about your plant...'}
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
