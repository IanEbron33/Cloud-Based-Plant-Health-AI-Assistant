import React, { useState, useRef } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, useColorScheme, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

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

  // Model selection state: 'flash' vs 'deep'
  const [activeModel, setActiveModel] = useState<'flash' | 'deep'>('flash');
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  // Initial conversation history (Talong Bacterial Wilt context)
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      sender: 'ai',
      text: 'Magandang araw! Ako ang iyong plant care assistant. Nakita ko sa pagsusuri na ang iyong **Talong** ay may **Bacterial Wilt (Layong Bakterya)** na may mataas na severity (15% health score).\n\nMayroon ka bang mga katanungan tungkol sa paggamot, crop rotation, o pag-iwas dito?',
      timestamp: '5:24 PM',
      modelUsed: 'flash'
    },
    {
      id: '2',
      sender: 'user',
      text: 'Paano ba kumakalat ang sakit na ito sa ibang talong?',
      timestamp: '5:25 PM'
    },
    {
      id: '3',
      sender: 'ai',
      text: 'Ang *Ralstonia solanacearum* (bakterya sa likod nito) ay kumakalat sa pamamagitan ng **kontaminadong tubig, lupa, at mga kagamitan sa pagtatanim**.\n\nKapag nagdidilig ka at tumalsik ang tubig mula sa may sakit na halaman papunta sa malusog, o kapag ginamit mo ang parehong gunting/kutsilyo nang hindi dinidisimpekta (gaya ng alcohol), madaling mahawa ang iba. Kumakalat din ito kapag dumadaloy ang tubig sa drainage patungo sa ibang tanim.',
      timestamp: '5:25 PM',
      modelUsed: 'flash'
    }
  ]);

  const handleSend = () => {
    if (!inputText.trim()) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      sender: 'user',
      text: inputText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setIsTyping(true);

    // Scroll to bottom after user sends message
    setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);

    // Simulate AI response based on active model
    setTimeout(() => {
      let aiResponseText = '';
      if (activeModel === 'flash') {
        aiResponseText = 'Para maiwasan ang pagkalat, i-quarantine o bunutin agad ang apektadong talong at sunugin ito. Linisin din ang mga tools gamit ang 70% alcohol bago gamitin sa ibang halaman.';
      } else {
        aiResponseText = 'Ayon sa ating database, napakahalaga na **bunutin at sunugin agad** ang may sakit na talong. \n\nNarito ang detalyadong hakbang:\n1. **Sanitation:** Hugasan at linisin ang mga sapin sa paa, dumi sa gulong, at mga kagamitan. \n2. **Drainage control:** Siguraduhing may sariling daluyan ng tubig ang bawat plot upang hindi madala ng tubig-baha ang bakterya. \n3. **Soil Treatment:** Iwasan munang magtanim ng Solanaceous crops (sili, kamatis, patatas) sa apektadong lupa sa loob ng 2-3 taon.';
      }

      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        sender: 'ai',
        text: aiResponseText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        modelUsed: activeModel
      };

      setMessages(prev => [...prev, aiMsg]);
      setIsTyping(false);

      // Scroll to bottom again after AI reply
      setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
    }, 1500);
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      className={`flex-1 ${isDark ? 'bg-stone-950' : 'bg-stone-50'}`}
    >
      {/* Header Bar */}
      <View className="pt-14 pb-4 px-6 flex-row items-center border-b border-stone-800/5 justify-between">
        <TouchableOpacity 
          onPress={() => router.back()}
          className={`w-10 h-10 rounded-2xl items-center justify-center border ${
            isDark ? 'bg-stone-900 border-stone-850' : 'bg-white border-stone-200'
          }`}
        >
          <Ionicons name="arrow-back" size={20} color={isDark ? '#e7e5e4' : '#292524'} />
        </TouchableOpacity>
        
        <View className="items-center">
          <Text className={`text-base font-bold ${isDark ? 'text-white' : 'text-stone-900'}`}>
            Talong Follow-up Chat
          </Text>
          <Text className="text-[10px] text-emerald-500 font-bold uppercase tracking-widest mt-0.5">
            Bacterial Wilt
          </Text>
        </View>

        <TouchableOpacity 
          onPress={() => setMessages(messages.slice(0, 1))}
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
            <View className={`max-w-[80%] rounded-[24px] px-4 py-3 ${
              msg.sender === 'user'
                ? 'bg-emerald-600 rounded-tr-sm'
                : isDark
                ? 'bg-stone-900 border border-stone-850 rounded-tl-sm'
                : 'bg-white border border-stone-150 rounded-tl-sm shadow-sm'
            }`}>
              <Text className={`text-sm leading-5 ${
                msg.sender === 'user'
                  ? 'text-white font-medium'
                  : isDark
                  ? 'text-stone-200'
                  : 'text-stone-800'
              }`}>
                {msg.text}
              </Text>
              
              {/* Footer info: time & model tag */}
              <View className="flex-row items-center justify-between mt-2">
                <Text className={`text-[9px] ${
                  msg.sender === 'user' 
                    ? 'text-emerald-200' 
                    : 'text-stone-500'
                }`}>
                  {msg.timestamp}
                </Text>

                {msg.sender === 'ai' && msg.modelUsed && (
                  <View className="bg-emerald-950/20 px-1.5 py-0.5 rounded ml-2">
                    <Text className="text-[8px] text-emerald-500 font-bold uppercase">
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
            <View className={`rounded-[24px] px-5 py-3.5 border ${
              isDark ? 'bg-stone-900 border-stone-850' : 'bg-white border-stone-150 shadow-sm'
            }`}>
              <Text className="text-stone-400 text-xs italic">
                Nagsusulat ang AI...
              </Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Model Toggle pill bar directly above input */}
      <View className={`px-6 py-2 border-t flex-row items-center justify-between ${
        isDark ? 'bg-stone-900/40 border-stone-850' : 'bg-stone-100/80 border-stone-200'
      }`}>
        <Text className={`text-[10px] font-bold uppercase tracking-wider ${isDark ? 'text-stone-500' : 'text-stone-400'}`}>
          Gamiting Model:
        </Text>
        
        {/* Toggle pill button */}
        <View className={`flex-row p-1 rounded-full ${isDark ? 'bg-stone-950 border border-stone-850' : 'bg-stone-200/50'}`}>
          <TouchableOpacity
            onPress={() => setActiveModel('flash')}
            className={`px-3 py-1 rounded-full flex-row items-center ${activeModel === 'flash' ? 'bg-emerald-600' : ''}`}
          >
            <Text className={`text-[10px] font-bold ${activeModel === 'flash' ? 'text-white' : isDark ? 'text-stone-500' : 'text-stone-600'}`}>
              ⚡ Flash
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            onPress={() => setActiveModel('deep')}
            className={`px-3 py-1 rounded-full flex-row items-center ${activeModel === 'deep' ? 'bg-emerald-600' : ''}`}
          >
            <Text className={`text-[10px] font-bold ${activeModel === 'deep' ? 'text-white' : isDark ? 'text-stone-500' : 'text-stone-600'}`}>
              🧠 Deep
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Chat input block */}
      <View className={`px-5 py-4 border-t flex-row items-center ${
        isDark ? 'bg-stone-950 border-stone-850' : 'bg-white border-stone-150'
      }`}>
        <View className={`flex-1 flex-row items-center px-4 rounded-full border ${
          isDark ? 'bg-stone-900 border-stone-800' : 'bg-stone-50 border-stone-250'
        }`}>
          <TextInput
            value={inputText}
            onChangeText={setInputText}
            placeholder="Magtanong tungkol sa talong..."
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
