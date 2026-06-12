import React from 'react';
import { View, Text, ScrollView, Image, TouchableOpacity, useColorScheme } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { BentoGrid, BentoTile } from '@/components/BentoGrid';
import CircularProgress from '@/components/CircularProgress';

export default function ScanResultsScreen() {
  const router = useRouter();
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';

  // Mock scan diagnosis values (matching Talong Bacterial Wilt example in blueprint)
  const diagnosis = {
    cropLocalName: 'Talong',
    cropScientificName: 'Solanum melongena',
    category: 'Gulay (Vegetable)',
    ecologicalStatus: 'Cultivated (Itinatanim)',
    condition: 'Bacterial Wilt (Layong Bakterya)',
    severity: 'High', // None, Low, Moderate, High
    healthScore: 15,
    confidenceScore: 95,
    wateringFrequency: 'Mababa (2-3 araw)',
    wateringDescription: 'Iwasan ang labis na basa ng lupa. Diligan lamang kapag tuyo na ang ibabaw.',
    symptoms: [
      'Biglaang pagkalanta ng mga dahon kahit basa ang lupa.',
      'Pagka-tsokolate o pagka-itim ng loob ng tangkay (vascular bundle).',
      'Panghihina ng buong halaman sa loob ng ilang araw.'
    ],
    treatment: [
      'Bunutin agad ang buong halaman kasama ang mga ugat at sunugin ito.',
      'Huwag itambak sa compost pile upang hindi kumalat ang bakterya.',
      'Lagyan ng copper-based organic fungicide ang katabing lupa.'
    ],
    prevention: [
      'Mag-crop rotation ng 3 taon gamit ang mga pananim na hindi kamag-anak ng talong (gaya ng mais o mani).',
      'Gumamit ng mga buto na certified disease-free.',
      'Siguraduhing maayos ang drainage ng lupa upang hindi maipon ang tubig.'
    ],
    careTip: 'Maglagay ng sapat na mulching (tuyong damo o dayami) sa paligid upang mapanatili ang tamang temperatura ng lupa at iwasan ang talsik ng tubig na may dalang bakterya.',
    imageUrl: 'https://images.unsplash.com/photo-1590483736622-39da8af75bba?w=600'
  };

  // Get color and Tagalog text based on severity
  const getSeverityData = (sev: string) => {
    switch (sev) {
      case 'High':
        return { color: '#ef4444', text: 'Mataas (High) 🔴' };
      case 'Moderate':
        return { color: '#f97316', text: 'Katamtaman (Moderate) 🟠' };
      case 'Low':
        return { color: '#f59e0b', text: 'Mababa (Low) 🟡' };
      default:
        return { color: '#10b981', text: 'Malusog (Healthy) 🟢' };
    }
  };

  const severityData = getSeverityData(diagnosis.severity);

  return (
    <View className={`flex-1 ${isDark ? 'bg-stone-950' : 'bg-stone-50'}`}>
      
      {/* Top Header */}
      <View className="pt-14 pb-4 px-6 flex-row items-center border-b border-stone-800/5 justify-between">
        <TouchableOpacity 
          onPress={() => router.replace('/(tabs)/scan')}
          className={`w-10 h-10 rounded-2xl items-center justify-center border ${
            isDark ? 'bg-stone-900 border-stone-850' : 'bg-white border-stone-200'
          }`}
        >
          <Ionicons name="arrow-back" size={20} color={isDark ? '#e7e5e4' : '#292524'} />
        </TouchableOpacity>
        <Text className={`text-base font-bold ${isDark ? 'text-white' : 'text-stone-900'}`}>
          Pagsusuri (Diagnosis)
        </Text>
        <TouchableOpacity 
          onPress={() => router.push('/chat')}
          className={`w-10 h-10 rounded-2xl items-center justify-center border ${
            isDark ? 'bg-stone-900 border-stone-850' : 'bg-white border-stone-200'
          }`}
        >
          <Ionicons name="chatbubble-ellipses-outline" size={20} color={isDark ? '#e7e5e4' : '#292524'} />
        </TouchableOpacity>
      </View>

      <ScrollView 
        className="flex-1 px-6 pt-4"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 110 }}
      >
        <BentoGrid>
          
          {/* TILE 1: HERO (2x2 span equivalent - full width) */}
          <BentoTile colSpan={2} className="overflow-hidden p-0 rounded-[32px]">
            <View className="h-44 relative bg-stone-300">
              <Image 
                source={{ uri: diagnosis.imageUrl }} 
                className="w-full h-full object-cover" 
              />
              {/* Darkening Overlay gradient simulation */}
              <View className="absolute inset-0 bg-black/40 justify-end p-5">
                <Text className="text-emerald-300 text-[10px] uppercase font-bold tracking-wider">
                  Pananim na Sinuri
                </Text>
                <Text className="text-white text-2xl font-black mt-0.5">
                  {diagnosis.cropLocalName}
                </Text>
                <Text className="text-emerald-100 text-xs italic mt-0.5">
                  {diagnosis.cropScientificName}
                </Text>
              </View>
            </View>
          </BentoTile>

          {/* TILE 2: HEALTH STATUS (1x1 span) */}
          <BentoTile 
            title="Kalusugan (Health)" 
            icon={<Ionicons name="heart-outline" size={14} color="#ef4444" />}
          >
            <View className="items-center py-2">
              <CircularProgress 
                percentage={diagnosis.healthScore} 
                color={severityData.color}
                size={80}
                strokeWidth={6}
              />
              <Text className="text-[10px] uppercase font-bold text-center mt-2" style={{ color: severityData.color }}>
                {diagnosis.healthScore <= 30 ? 'CRITICAL' : diagnosis.healthScore <= 70 ? 'WARNING' : 'EXCELLENT'}
              </Text>
            </View>
          </BentoTile>

          {/* TILE 3: COND & SEVERITY & CONFIDENCE (1x1 span) */}
          <BentoTile 
            title="Pagsusuri" 
            icon={<Ionicons name="shield-outline" size={14} color="#3b82f6" />}
          >
            <View className="py-1">
              <Text className={`text-xs font-bold leading-5 mb-2 ${isDark ? 'text-white' : 'text-stone-900'}`} numberOfLines={2}>
                {diagnosis.condition}
              </Text>
              
              <Text className={`text-[10px] uppercase font-bold ${isDark ? 'text-stone-500' : 'text-stone-400'}`}>
                Severity
              </Text>
              <Text className="text-xs font-bold mt-0.5" style={{ color: severityData.color }}>
                {severityData.text}
              </Text>
              
              <Text className={`text-[10px] uppercase font-bold mt-2 ${isDark ? 'text-stone-500' : 'text-stone-400'}`}>
                Katiyakan (Confidence)
              </Text>
              <Text className={`text-xs font-bold mt-0.5 ${isDark ? 'text-white' : 'text-stone-900'}`}>
                {diagnosis.confidenceScore}% sigurado
              </Text>
            </View>
          </BentoTile>

          {/* TILE 4: WATERING NEEDS (1x1 span) */}
          <BentoTile 
            title="Dilig (Watering)" 
            icon={<Ionicons name="water-outline" size={14} color="#60a5fa" />}
          >
            <Text className={`text-sm font-bold ${isDark ? 'text-white' : 'text-stone-900'}`}>
              {diagnosis.wateringFrequency}
            </Text>
            <Text className={`text-[11px] leading-4 mt-1.5 ${isDark ? 'text-stone-400' : 'text-stone-600'}`}>
              {diagnosis.wateringDescription}
            </Text>
          </BentoTile>

          {/* TILE 5: ECOLOGICAL CAT (1x1 span) */}
          <BentoTile 
            title="Kategorya" 
            icon={<Ionicons name="options-outline" size={14} color="#10b981" />}
          >
            <Text className={`text-xs font-semibold ${isDark ? 'text-stone-500' : 'text-stone-400'}`}>
              Uri:
            </Text>
            <Text className={`text-sm font-bold mb-1.5 ${isDark ? 'text-white' : 'text-stone-900'}`}>
              {diagnosis.category}
            </Text>
            <Text className={`text-xs font-semibold ${isDark ? 'text-stone-500' : 'text-stone-400'}`}>
              Status sa Pilipinas:
            </Text>
            <Text className={`text-sm font-bold ${isDark ? 'text-white' : 'text-stone-900'}`}>
              {diagnosis.ecologicalStatus}
            </Text>
          </BentoTile>

          {/* TILE 6: OBSERVED SYMPTOMS (2x1 span) */}
          <BentoTile 
            title="Mga Sintomas na Nakita" 
            colSpan={2}
            icon={<Ionicons name="eye-outline" size={14} color="#f59e0b" />}
          >
            <View className="space-y-1.5 py-1">
              {diagnosis.symptoms.map((symptom, idx) => (
                <View key={idx} className="flex-row items-start" style={{ marginBottom: 6 }}>
                  <Text className="text-emerald-500 font-bold mr-2">•</Text>
                  <Text className={`text-sm flex-1 leading-5 ${isDark ? 'text-stone-300' : 'text-stone-650'}`}>
                    {symptom}
                  </Text>
                </View>
              ))}
            </View>
          </BentoTile>

          {/* TILE 7: STEPS TO TREAT (ORGANIC RECIPE) (2x2 span) */}
          <BentoTile 
            title="Gabay sa Paggamot (Organic)" 
            colSpan={2}
            icon={<Ionicons name="color-filter-outline" size={14} color="#10b981" />}
          >
            <View className="space-y-2 py-1">
              {diagnosis.treatment.map((step, idx) => (
                <View key={idx} className="flex-row items-start" style={{ marginBottom: 8 }}>
                  <View className="bg-emerald-600/15 w-5 h-5 rounded-full items-center justify-center mr-2.5 mt-0.5">
                    <Text className="text-emerald-600 text-xs font-bold">{idx + 1}</Text>
                  </View>
                  <Text className={`text-sm flex-1 leading-5 ${isDark ? 'text-stone-300' : 'text-stone-650'}`}>
                    {step}
                  </Text>
                </View>
              ))}
            </View>
          </BentoTile>

          {/* TILE 8: STEPS TO PREVENT (2x1 span) */}
          <BentoTile 
            title="Mga Hakbang sa Pag-iwas (Prevention)" 
            colSpan={2}
            icon={<Ionicons name="shield-checkmark-outline" size={14} color="#059669" />}
          >
            <View className="space-y-2 py-1">
              {diagnosis.prevention.map((step, idx) => (
                <View key={idx} className="flex-row items-start" style={{ marginBottom: 6 }}>
                  <Ionicons name="checkmark-circle" size={14} color="#10b981" className="mr-2 mt-0.5" style={{ marginRight: 8 }} />
                  <Text className={`text-sm flex-1 leading-5 ${isDark ? 'text-stone-300' : 'text-stone-650'}`}>
                    {step}
                  </Text>
                </View>
              ))}
            </View>
          </BentoTile>

          {/* BONUS TILE: CARE TIP */}
          <BentoTile 
            title="Dagdag na Tip" 
            colSpan={2}
            icon={<Ionicons name="bulb-outline" size={14} color="#f59e0b" />}
            className="border-emerald-600/30 bg-emerald-950/10"
          >
            <Text className={`text-sm leading-6 italic ${isDark ? 'text-stone-300' : 'text-stone-650'}`}>
              "{diagnosis.careTip}"
            </Text>
          </BentoTile>

        </BentoGrid>
      </ScrollView>

      {/* Floating Action Button Bar at Bottom */}
      <View className={`absolute bottom-0 left-0 right-0 p-5 ${
        isDark ? 'bg-stone-950/95 border-t border-stone-850' : 'bg-white/95 border-t border-stone-150 shadow-lg'
      }`}>
        <TouchableOpacity 
          onPress={() => router.push('/chat')}
          activeOpacity={0.8}
          className="bg-emerald-600 py-4 rounded-2xl flex-row items-center justify-center shadow-lg shadow-emerald-600/20"
        >
          <Ionicons name="chatbubbles" size={20} color="white" />
          <Text className="text-white font-bold ml-2 text-base">
            Magsimula ng Follow-up Chat
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
