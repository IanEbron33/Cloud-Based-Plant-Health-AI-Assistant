import React from 'react';
import { View, Text, ScrollView, Image, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { BentoGrid, BentoTile } from '@/components/BentoGrid';
import CircularProgress from '@/components/CircularProgress';
import Animated, { FadeInDown, Easing } from 'react-native-reanimated';

export default function ScanResultsScreen() {
  const router = useRouter();

  // Mock scan diagnosis values with English prioritized
  const diagnosis = {
    cropLocalName: 'Talong',
    cropScientificName: 'Solanum melongena',
    category: 'Vegetables (Gulay)',
    ecologicalStatus: 'Cultivated (Itinatanim)',
    condition: 'Bacterial Wilt (Layong Bakterya)',
    severity: 'High', // None, Low, Moderate, High
    healthScore: 15,
    confidenceScore: 95,
    wateringFrequency: 'Low (2-3 days / araw)',
    wateringDescription: 'Avoid overwatering. Water only when the topsoil is dry (Iwasan ang labis na basa ng lupa. Diligan lamang kapag tuyo na ang ibabaw).',
    symptoms: [
      'Sudden wilting of leaves even when the soil is wet (Biglaang pagkalanta ng mga dahon kahit basa ang lupa).',
      'Browning or blackening of the inner stem/vascular bundle (Pagka-tsokolate o pagka-itim ng loob ng tangkay).',
      'Wilting of the entire plant within a few days (Panghihina ng buong halaman sa loob ng ilang araw).'
    ],
    treatment: [
      'Immediately uproot the entire plant including roots and burn it (Bunutin agad ang buong halaman kasama ang mga ugat at sunugin ito).',
      'Do not compost the infected plant to prevent bacteria spread (Huwag itambak sa compost pile upang hindi kumalat ang bakterya).',
      'Apply a copper-based organic fungicide to the surrounding soil (Lagyan ng copper-based organic fungicide ang katabing lupa).'
    ],
    prevention: [
      'Rotate crops for 3 years using non-host plants like corn or peanuts (Mag-crop rotation ng 3 taon gamit ang mais o mani).',
      'Use certified disease-free seeds (Gumamit ng mga buto na certified disease-free).',
      'Ensure proper soil drainage to avoid water accumulation (Siguraduhing maayos ang drainage ng lupa upang hindi maipon ang tubig).'
    ],
    careTip: 'Apply adequate mulching (dry grass or straw) around the base to maintain soil temperature and prevent soil splashing (Maglagay ng sapat na mulching upang mapanatili ang tamang temperatura ng lupa at iwasan ang talsik ng tubig).',
    imageUrl: 'https://images.unsplash.com/photo-1592417817098-8f3d6eb19675?w=600'
  };

  // Get color and text based on severity
  const getSeverityData = (sev: string) => {
    switch (sev) {
      case 'High':
        return { color: '#ef4444', text: 'High (Mataas)' };
      case 'Moderate':
        return { color: '#f97316', text: 'Moderate (Katamtaman)' };
      case 'Low':
        return { color: '#f59e0b', text: 'Low (Mababa)' };
      default:
        return { color: '#10b981', text: 'Healthy (Malusog)' };
    }
  };

  const severityData = getSeverityData(diagnosis.severity);

  return (
    <View className="flex-1 bg-stone-50">
      
      {/* Top Header */}
      <View className="pt-14 pb-4 px-6 flex-row items-center border-b border-stone-200 justify-between bg-white">
        <TouchableOpacity 
          onPress={() => router.replace('/(tabs)/scan')}
          className="w-10 h-10 rounded-2xl items-center justify-center border bg-white border-stone-200"
        >
          <Ionicons name="arrow-back" size={20} color="#292524" />
        </TouchableOpacity>
        <Text className="text-base font-bold text-stone-900">
          Pagsusuri (Diagnosis)
        </Text>
        <TouchableOpacity 
          onPress={() => router.push('/chat')}
          className="w-10 h-10 rounded-2xl items-center justify-center border bg-white border-stone-200"
        >
          <Ionicons name="chatbubble-ellipses-outline" size={20} color="#292524" />
        </TouchableOpacity>
      </View>

      <ScrollView 
        className="flex-1 px-6 pt-4"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 110 }}
      >
        <BentoGrid>
          
          {/* TILE 1: HERO (2x2 span equivalent - full width) */}
          <Animated.View entering={FadeInDown.springify().damping(18).stiffness(120)} className="w-full">
            <BentoTile colSpan={2} className="overflow-hidden p-0 rounded-[24px]">
              <View className="h-44 relative bg-stone-300 rounded-[23px] overflow-hidden">
                <Image 
                  source={{ uri: diagnosis.imageUrl }} 
                  className="w-full h-full object-cover rounded-[23px]" 
                />
                {/* Darkening Overlay gradient simulation */}
                <View className="absolute inset-0 bg-black/45 justify-end p-5 rounded-[23px]">
                  <Text className="text-emerald-350 text-[10px] uppercase font-bold tracking-wider">
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
          </Animated.View>

          {/* Row 1: Health & Diagnostic */}
          <Animated.View entering={FadeInDown.delay(150).springify().damping(18).stiffness(120)} className="w-full">
            <View className="flex-row justify-between w-full mb-3 items-stretch">
              {/* TILE 2: HEALTH STATUS (1x1 span) */}
              <BentoTile 
                title="HEALTH" 
                icon={<Ionicons name="heart-outline" size={18} color="#ef4444" />}
                className="mb-0"
              >
                <View className="items-center justify-center py-1">
                  <CircularProgress 
                    percentage={diagnosis.healthScore} 
                    color={severityData.color}
                    size={80}
                    strokeWidth={6}
                  />
                  <Text className="text-xs font-bold uppercase mt-2.5 text-center" style={{ color: severityData.color }}>
                    {diagnosis.healthScore <= 30 ? 'CRITICAL' : diagnosis.healthScore <= 70 ? 'WARNING' : 'EXCELLENT'}
                  </Text>
                </View>
              </BentoTile>

              {/* TILE 3: DIAGNOSTIC (1x1 span) */}
              <BentoTile 
                title="DIAGNOSTIC" 
                icon={<Ionicons name="flask-outline" size={18} color="#3b82f6" />}
                className="mb-0"
              >
                <View className="py-0.5">
                  <Text className="text-xs font-semibold leading-5 mb-2.5 text-stone-700">
                    {diagnosis.condition}
                  </Text>
                  
                  <Text className="text-[9px] uppercase font-bold text-stone-400 tracking-wider">
                    SEVERITY
                  </Text>
                  <Text className="text-xs font-semibold mt-0.5 mb-2.5" style={{ color: severityData.color }}>
                    {severityData.text}
                  </Text>
                  
                  <Text className="text-[9px] uppercase font-bold text-stone-400 tracking-wider">
                    CONFIDENCE (KATIYAKAN)
                  </Text>
                  <Text className="text-xs font-semibold mt-0.5 text-stone-700">
                    {diagnosis.confidenceScore}% Confidence
                  </Text>
                </View>
              </BentoTile>
            </View>
          </Animated.View>

          {/* Row 2: Watering & Category */}
          <Animated.View entering={FadeInDown.delay(300).springify().damping(18).stiffness(120)} className="w-full">
            <View className="flex-row justify-between w-full mb-3 items-stretch">
              {/* TILE 4: WATERING NEEDS (1x1 span) */}
              <BentoTile 
                title="WATERING (DILIG)" 
                icon={<Ionicons name="water-outline" size={18} color="#60a5fa" />}
                className="mb-0"
              >
                <Text className="text-xs font-semibold text-stone-700">
                  {diagnosis.wateringFrequency}
                </Text>
                <Text className="text-[11px] leading-4 mt-1.5 text-stone-600">
                  {diagnosis.wateringDescription}
                </Text>
              </BentoTile>

              {/* TILE 5: ECOLOGICAL CAT (1x1 span) */}
              <BentoTile 
                title="CATEGORY" 
                icon={<Ionicons name="options-outline" size={18} color="#10b981" />}
                className="mb-0"
              >
                <Text className="text-[9px] uppercase font-bold text-stone-400 tracking-wider">
                  TYPE (URI)
                </Text>
                <Text className="text-xs font-semibold mt-0.5 mb-2.5 text-stone-700">
                  {diagnosis.category}
                </Text>
                <Text className="text-[9px] uppercase font-bold text-stone-400 tracking-wider">
                  STATUS
                </Text>
                <Text className="text-xs font-semibold mt-0.5 text-stone-700">
                  {diagnosis.ecologicalStatus}
                </Text>
              </BentoTile>
            </View>
          </Animated.View>

          {/* TILE 6: OBSERVED SYMPTOMS (2x1 span) */}
          <Animated.View entering={FadeInDown.delay(450).springify().damping(18).stiffness(120)} className="w-full">
            <BentoTile 
              title="SYMPTOMS FOUND" 
              colSpan={2}
              icon={<Ionicons name="eye-outline" size={18} color="#f59e0b" />}
            >
              <View className="space-y-1.5 py-1">
                {diagnosis.symptoms.map((symptom, idx) => (
                  <View key={idx} className="flex-row items-start" style={{ marginBottom: 6 }}>
                    <Text className="text-emerald-500 font-bold mr-2">•</Text>
                    <Text className="text-sm flex-1 leading-5 text-stone-600">
                      {symptom}
                    </Text>
                  </View>
                ))}
              </View>
            </BentoTile>
          </Animated.View>

          {/* TILE 7: TREATMENT (ORGANIC) (2x2 span) */}
          <Animated.View entering={FadeInDown.delay(600).springify().damping(18).stiffness(120)} className="w-full">
            <BentoTile 
              title="TREATMENT (ORGANIC)" 
              colSpan={2}
              icon={<Ionicons name="medkit-outline" size={18} color="#10b981" />}
            >
              <View className="space-y-2 py-1">
                {diagnosis.treatment.map((step, idx) => (
                  <View key={idx} className="flex-row items-start" style={{ marginBottom: 8 }}>
                    <View className="bg-emerald-600/15 w-5 h-5 rounded-full items-center justify-center mr-2.5 mt-0.5">
                      <Text className="text-emerald-600 text-xs font-bold">{idx + 1}</Text>
                    </View>
                    <Text className="text-sm flex-1 leading-5 text-stone-600">
                      {step}
                    </Text>
                  </View>
                ))}
              </View>
            </BentoTile>
          </Animated.View>

          {/* TILE 8: STEPS TO PREVENT (2x1 span) */}
          <Animated.View entering={FadeInDown.delay(750).springify().damping(18).stiffness(120)} className="w-full">
            <BentoTile 
              title="PREVENTION (PAG-IWAS)" 
              colSpan={2}
              icon={<Ionicons name="shield-checkmark-outline" size={18} color="#059669" />}
            >
              <View className="space-y-2 py-1">
                {diagnosis.prevention.map((step, idx) => (
                  <View key={idx} className="flex-row items-start" style={{ marginBottom: 6 }}>
                    <Ionicons name="checkmark-circle" size={14} color="#10b981" style={{ marginRight: 8, marginTop: 2 }} />
                    <Text className="text-sm flex-1 leading-5 text-stone-600">
                      {step}
                    </Text>
                  </View>
                ))}
              </View>
            </BentoTile>
          </Animated.View>

          {/* BONUS TILE: CARE TIP */}
          <Animated.View entering={FadeInDown.delay(900).springify().damping(18).stiffness(120)} className="w-full">
            <BentoTile 
              title="ADDITIONAL CARE TIP" 
              colSpan={2}
              icon={<Ionicons name="bulb-outline" size={18} color="#f59e0b" />}
              className="border-emerald-600/20 bg-emerald-50/20"
            >
              <Text className="text-sm leading-6 italic text-stone-600">
                "{diagnosis.careTip}"
              </Text>
            </BentoTile>
          </Animated.View>

        </BentoGrid>
      </ScrollView>

      {/* Floating Action Button Bar at Bottom */}
      <View className="absolute bottom-0 left-0 right-0 p-5 bg-white/95 border-t border-stone-150 shadow-lg">
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
