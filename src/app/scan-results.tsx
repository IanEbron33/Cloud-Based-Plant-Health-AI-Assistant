import React, { useEffect, useRef, useState } from 'react';
import { View, Text, ScrollView, Image, TouchableOpacity, Animated, Easing, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { BentoGrid, BentoTile } from '@/components/BentoGrid';
import CircularProgress from '@/components/CircularProgress';
import { useScan } from '../context/ScanContext';
import { useAuth } from '../context/AuthContext';
import { DiagnosisResult } from '../types';
import { fetchScanById } from '../services/scan.service';
import { parseDiagnosis } from '../services/diagnosis-parser';

export default function ScanResultsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { user } = useAuth();

  const {
    isScanning,
    scanPhase,
    scannedImageUri,
    activeModel,
    identifiedCrop,
    diagnosisResult,
    errorMessage,
    loadingCaption,
    startScan,
    cancelScan,
    clearResults,
  } = useScan();

  const [dbResult, setDbResult] = useState<DiagnosisResult | null>(null);
  const [isLoadingRecord, setIsLoadingRecord] = useState(false);

  // Load record from database if id parameter is provided
  useEffect(() => {
    if (!id || !user) {
      setDbResult(null);
      return;
    }
    setIsLoadingRecord(true);
    try {
      const row = fetchScanById(id, user.id);
      if (row) {
        const parsed = parseDiagnosis(
          row.diagnosis_text,
          row.crop_name,
          row.cloud_image_url || row.local_image_path || ''
        );
        setDbResult(parsed);
      } else {
        setDbResult(null);
      }
    } catch (err) {
      console.error('[Results Screen] DB query error:', err);
    } finally {
      setIsLoadingRecord(false);
    }
  }, [id, user]);

  // Animation values for the loading spinner
  const spinValue = useRef(new Animated.Value(0)).current;
  const pulseValue = useRef(new Animated.Value(1)).current;

  // Set up spinner loop
  useEffect(() => {
    let spinLoop: Animated.CompositeAnimation | null = null;
    let pulseLoop: Animated.CompositeAnimation | null = null;

    if (isScanning) {
      // Rotation animation
      spinValue.setValue(0);
      spinLoop = Animated.loop(
        Animated.timing(spinValue, {
          toValue: 1,
          duration: 1500,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      );
      spinLoop.start();

      // Pulsing dot animation
      pulseValue.setValue(1);
      pulseLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseValue, {
            toValue: 1.6,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseValue, {
            toValue: 1.0,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      );
      pulseLoop.start();
    }

    return () => {
      if (spinLoop) spinLoop.stop();
      if (pulseLoop) pulseLoop.stop();
    };
  }, [isScanning]);

  const handleCancel = () => {
    cancelScan();
    router.replace('/(tabs)/scan');
  };

  const handleRetry = () => {
    if (scannedImageUri) {
      startScan(scannedImageUri, activeModel);
    }
  };

  const handleBackToScan = () => {
    if (isScanning || scanPhase === 'classifying' || scanPhase === 'diagnosing') {
      router.replace('/(tabs)/scan');
    } else {
      clearResults();
      router.replace('/(tabs)/scan');
    }
  };

  // Translate severity into color and display text
  const getSeverityData = (sev: string) => {
    switch (sev) {
      case 'High':
        return { color: '#ef4444', text: 'High' };
      case 'Moderate':
        return { color: '#f97316', text: 'Moderate' };
      case 'Low':
        return { color: '#f59e0b', text: 'Low' };
      default:
        return { color: '#10b981', text: 'Healthy' };
    }
  };

  // State 1: ID provided but loading record from SQLite
  if (id && isLoadingRecord) {
    return (
      <View className="flex-1 bg-stone-50 items-center justify-center">
        <ActivityIndicator size="large" color="#10b981" />
        <Text style={{ fontFamily: 'Fredoka_400Regular' }} className="text-stone-500 text-sm mt-3">Loading analysis report...</Text>
      </View>
    );
  }

  // State 2: ID provided but record does not exist
  if (id && !dbResult && !isLoadingRecord) {
    return (
      <View className="flex-1 bg-stone-50 items-center justify-center px-6">
        <Ionicons name="alert-circle-outline" size={64} color="#ef4444" />
        <Text
          style={{ fontFamily: 'Fredoka_700Bold' }}
          className="text-stone-800 text-lg font-bold mt-4 text-center"
        >
          Record Not Found
        </Text>
        <Text
          style={{ fontFamily: 'Fredoka_400Regular' }}
          className="text-stone-500 text-sm mt-2 text-center max-w-[280px]"
        >
          We couldn't locate this specific diagnosis record in the database.
        </Text>
        <TouchableOpacity
          onPress={() => router.replace('/(tabs)/history')}
          className="bg-emerald-600 px-6 py-3 rounded-xl mt-6 shadow-sm"
        >
          <Text style={{ fontFamily: 'Fredoka_700Bold' }} className="text-white font-bold text-sm">
            Back to History
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  // State 3: Idle (No scan has been initiated and no ID requested)
  if (!id && scanPhase === 'idle' && !diagnosisResult) {
    return (
      <View className="flex-1 bg-stone-50 items-center justify-center px-6">
        <Ionicons name="scan-outline" size={64} color="#a8a29e" />
        <Text
          style={{ fontFamily: 'Fredoka_700Bold' }}
          className="text-stone-800 text-lg font-bold mt-4 text-center"
        >
          No Active Analysis
        </Text>
        <Text
          style={{ fontFamily: 'Fredoka_400Regular' }}
          className="text-stone-500 text-sm mt-2 text-center max-w-[280px]"
        >
          Please select or take a photo of a crop leaf from the Scan screen to analyze its health.
        </Text>
        <TouchableOpacity
          onPress={() => router.replace('/(tabs)/scan')}
          className="bg-emerald-600 px-6 py-3 rounded-xl mt-6 shadow-sm"
        >
          <Text style={{ fontFamily: 'Fredoka_700Bold' }} className="text-white font-bold text-sm">
            Go to Scan Screen
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  // State 4: Error during active scan pipeline
  if (!id && scanPhase === 'error') {
    return (
      <View className="flex-1 bg-stone-50 items-center justify-center px-6">
        <Ionicons name="alert-circle-outline" size={64} color="#ef4444" />
        <Text
          style={{ fontFamily: 'Fredoka_700Bold' }}
          className="text-stone-800 text-lg font-bold mt-4 text-center"
        >
          Analysis Error
        </Text>
        <Text
          style={{ fontFamily: 'Fredoka_400Regular' }}
          className="text-stone-500 text-sm mt-2 text-center max-w-[320px]"
        >
          {errorMessage || 'Something went wrong during the analysis pipeline.'}
        </Text>
        <View className="flex-row mt-6">
          <TouchableOpacity
            onPress={handleBackToScan}
            className="bg-white border border-stone-200 px-6 py-3 rounded-xl mr-3"
          >
            <Text style={{ fontFamily: 'Fredoka_700Bold' }} className="text-stone-600 font-bold text-sm">
              Go Back
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleRetry}
            className="bg-emerald-600 px-6 py-3 rounded-xl shadow-sm"
          >
            <Text style={{ fontFamily: 'Fredoka_700Bold' }} className="text-white font-bold text-sm">
              Try Again
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // State 5: Loading / Scanning (active pipeline in progress)
  if (!id && (isScanning || (scanPhase !== 'done' && !diagnosisResult))) {
    const spin = spinValue.interpolate({
      inputRange: [0, 1],
      outputRange: ['0deg', '360deg'],
    });

    return (
      <View className="flex-1 bg-stone-50">
        {/* Top Header during Loading */}
        <View className="pt-14 pb-4 px-6 flex-row items-center border-b border-stone-200 justify-between bg-white w-full">
          <TouchableOpacity
            onPress={handleBackToScan}
            className="w-10 h-10 rounded-2xl items-center justify-center border bg-white border-stone-200"
          >
            <Ionicons name="arrow-back" size={20} color="#292524" />
          </TouchableOpacity>
          <Text style={{ fontFamily: 'Fredoka_700Bold' }} className="text-base font-bold text-stone-900">
            Analyzing Plant...
          </Text>
          <View className="w-10 h-10" />
        </View>

        {/* Loading Content Container */}
        <View className="flex-1 items-center justify-center px-6">
          {/* Graphic Area */}
          <View className="items-center justify-center relative w-40 h-40 mb-8">
            {/* Animated Spinner Ring */}
            <Animated.View
              style={{
                position: 'absolute',
                width: 140,
                height: 140,
                borderRadius: 70,
                borderWidth: 4,
                borderColor: '#10b981',
                borderTopColor: 'transparent',
                borderRightColor: 'transparent',
                transform: [{ rotate: spin }],
              }}
            />
            {/* Cropped Leaf Image */}
            <View className="w-[116px] h-[116px] rounded-full overflow-hidden bg-stone-200">
              {scannedImageUri ? (
                <Image source={{ uri: scannedImageUri }} className="w-full h-full object-cover" />
              ) : (
                <ActivityIndicator size="large" color="#10b981" className="mt-[44px]" />
              )}
            </View>
          </View>

          {/* Captions */}
          <View className="flex-row items-center justify-center mb-2">
            <Animated.View
              style={{ transform: [{ scale: pulseValue }] }}
              className="w-2 h-2 rounded-full bg-emerald-500 mr-2"
            />
            <Text
              style={{ fontFamily: 'Fredoka_700Bold' }}
              className="text-stone-800 text-base font-bold"
            >
              {scanPhase === 'classifying' ? 'Classifying Plant...' : 'Analyzing Health...'}
            </Text>
          </View>
          <Text
            style={{ fontFamily: 'Fredoka_400Regular' }}
            className="text-stone-500 text-sm text-center mb-8 px-4"
          >
            {loadingCaption}
          </Text>

          {/* Action Button */}
          <TouchableOpacity
            onPress={handleCancel}
            activeOpacity={0.8}
            className="bg-white border border-stone-200 px-6 py-3 rounded-xl shadow-sm"
          >
            <Text style={{ fontFamily: 'Fredoka_700Bold' }} className="text-red-500 font-bold text-xs">
              Cancel Analysis
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // State 6: Completed (Show results)
  const result = (id ? dbResult : diagnosisResult) as DiagnosisResult;
  const severityData = getSeverityData(result.severity);
  const scanRecordId = id || '';

  return (
    <View className="flex-1 bg-stone-50">
      {/* Top Header */}
      <View className="pt-14 pb-4 px-6 flex-row items-center border-b border-stone-200 justify-between bg-white">
        <TouchableOpacity
          onPress={handleBackToScan}
          className="w-10 h-10 rounded-2xl items-center justify-center border bg-white border-stone-200"
        >
          <Ionicons name="arrow-back" size={20} color="#292524" />
        </TouchableOpacity>
        <Text style={{ fontFamily: 'Fredoka_700Bold' }} className="text-base font-bold text-stone-900">
          Crop Analysis
        </Text>
        <TouchableOpacity
          onPress={() => router.push({ pathname: '/chat', params: { scanId: scanRecordId } })}
          disabled={!scanRecordId}
          className={`w-10 h-10 rounded-2xl items-center justify-center border bg-white border-stone-200 ${!scanRecordId ? 'opacity-40' : ''}`}
        >
          <Ionicons name="chatbubble-ellipses-outline" size={20} color="#292524" />
        </TouchableOpacity>
      </View>


      <ScrollView
        className="flex-1 px-6 pt-4"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 110 }}
      >
        {result.confidenceScore < 20 && (
          <View className="flex-row items-center bg-amber-50 border border-amber-200 p-4 rounded-[20px] mb-4 shadow-sm">
            <Ionicons name="warning-outline" size={24} color="#d97706" style={{ marginRight: 12 }} />
            <View className="flex-1">
              <Text style={{ fontFamily: 'Fredoka_700Bold' }} className="text-amber-800 text-sm font-bold">
                Low Confidence Score ({result.confidenceScore}%)
              </Text>
              <Text style={{ fontFamily: 'Fredoka_400Regular' }} className="text-amber-750 text-xs mt-0.5 leading-4">
                This result may be unreliable. Please try scanning again with a clearer, well-lit, close-up photo of the leaf.
              </Text>
            </View>
          </View>
        )}
        <BentoGrid>
          {/* TILE 1: HERO */}
          <BentoTile colSpan={2} className="overflow-hidden p-0 rounded-[24px]">
            <View className="h-44 relative bg-stone-300 rounded-[23px] overflow-hidden">
              <Image source={{ uri: result.imageUri }} className="w-full h-full object-cover rounded-[23px]" />
              {/* Darkening Overlay gradient */}
              <View className="absolute inset-0 bg-black/45 justify-end p-5 rounded-[23px]">
                <Text style={{ fontFamily: 'Fredoka_700Bold' }} className="text-emerald-400 text-[10px] uppercase font-bold tracking-wider">
                  Scanned Crop
                </Text>
                <Text style={{ fontFamily: 'Fredoka_700Bold' }} className="text-white text-2xl font-black mt-0.5">
                  {result.cropLocalName}
                </Text>
                <Text style={{ fontFamily: 'Fredoka_400Regular' }} className="text-emerald-100 text-xs italic mt-0.5">
                  {result.cropScientificName}
                </Text>
              </View>
            </View>
          </BentoTile>

          {/* Row 1: Health & Diagnostic */}
          <View className="flex-row justify-between w-full mb-3 items-stretch">
            {/* TILE 2: HEALTH STATUS */}
            <BentoTile title="HEALTH" icon={<Ionicons name="heart-outline" size={18} color="#ef4444" />} className="mb-0">
              <View className="items-center justify-center py-1">
                <CircularProgress
                  percentage={result.healthScore}
                  color={severityData.color}
                  size={80}
                  strokeWidth={10}
                />
                <Text
                  style={{ fontFamily: 'Fredoka_700Bold', color: severityData.color }}
                  className="text-[10px] font-bold uppercase mt-2.5 text-center"
                >
                  {result.healthScore <= 30
                    ? 'CRITICAL'
                    : result.healthScore <= 70
                    ? 'WARNING'
                    : 'EXCELLENT'}
                </Text>
              </View>
            </BentoTile>

            {/* TILE 3: DIAGNOSTIC */}
            <BentoTile
              title="DIAGNOSTIC"
              icon={<Ionicons name="flask-outline" size={18} color="#3b82f6" />}
              className="mb-0"
            >
              <View className="py-0.5">
                <Text style={{ fontFamily: 'Fredoka_700Bold' }} className="text-xs font-semibold leading-5 mb-2.5 text-stone-700">
                  {result.condition}
                </Text>

                <Text style={{ fontFamily: 'Fredoka_700Bold' }} className="text-[9px] uppercase font-bold text-stone-400 tracking-wider">
                  SEVERITY
                </Text>
                <Text
                  style={{ fontFamily: 'Fredoka_700Bold', color: severityData.color }}
                  className="text-xs font-semibold mt-0.5 mb-2.5"
                >
                  {severityData.text}
                </Text>

                <Text style={{ fontFamily: 'Fredoka_700Bold' }} className="text-[9px] uppercase font-bold text-stone-400 tracking-wider">
                  CONFIDENCE
                </Text>
                <Text style={{ fontFamily: 'Fredoka_400Regular' }} className="text-xs font-semibold mt-0.5 text-stone-700">
                  {result.confidenceScore}% Confidence
                </Text>
              </View>
            </BentoTile>
          </View>

          {/* Row 2: Watering & Category */}
          <View className="flex-row justify-between w-full mb-3 items-stretch">
            {/* TILE 4: WATERING NEEDS */}
            <BentoTile
              title="WATERING"
              icon={<Ionicons name="water-outline" size={18} color="#60a5fa" />}
              className="mb-0"
            >
              <Text style={{ fontFamily: 'Fredoka_700Bold' }} className="text-xs font-semibold text-stone-700">
                {result.wateringFrequency}
              </Text>
              <Text style={{ fontFamily: 'Fredoka_400Regular' }} className="text-[11px] leading-4 mt-1.5 text-stone-600">
                {result.wateringDescription}
              </Text>
            </BentoTile>

            {/* TILE 5: CATEGORY */}
            <BentoTile
              title="CATEGORY"
              icon={<Ionicons name="options-outline" size={18} color="#10b981" />}
              className="mb-0"
            >
              <Text style={{ fontFamily: 'Fredoka_700Bold' }} className="text-[9px] uppercase font-bold text-stone-400 tracking-wider">
                CATEGORY
              </Text>
              <Text style={{ fontFamily: 'Fredoka_400Regular' }} className="text-xs font-semibold mt-0.5 mb-2.5 text-stone-700">
                {result.category}
              </Text>
              <Text style={{ fontFamily: 'Fredoka_700Bold' }} className="text-[9px] uppercase font-bold text-stone-400 tracking-wider">
                STATUS
              </Text>
              <Text style={{ fontFamily: 'Fredoka_400Regular' }} className="text-xs font-semibold mt-0.5 text-stone-700">
                {result.ecologicalStatus}
              </Text>
            </BentoTile>
          </View>

          {/* TILE 6: SYMPTOMS FOUND */}
          <BentoTile
            title="SYMPTOMS FOUND"
            colSpan={2}
            icon={<Ionicons name="eye-outline" size={18} color="#f59e0b" />}
          >
            <View className="space-y-1.5 py-1">
              {result.symptoms.map((symptom: string, idx: number) => (
                <View key={idx} className="flex-row items-start" style={{ marginBottom: 6 }}>
                  <Text className="text-emerald-500 font-bold mr-2">•</Text>
                  <Text style={{ fontFamily: 'Fredoka_400Regular' }} className="text-sm flex-1 leading-5 text-stone-600">
                    {symptom}
                  </Text>
                </View>
              ))}
            </View>
          </BentoTile>

          {/* TILE 7: TREATMENT (ORGANIC) */}
          <BentoTile
            title="TREATMENT (ORGANIC)"
            colSpan={2}
            icon={<Ionicons name="medkit-outline" size={18} color="#10b981" />}
          >
            <View className="space-y-2 py-1">
              {result.treatment.map((step: string, idx: number) => (
                <View key={idx} className="flex-row items-start" style={{ marginBottom: 8 }}>
                  <View className="bg-emerald-600/15 w-5 h-5 rounded-full items-center justify-center mr-2.5 mt-0.5">
                    <Text style={{ fontFamily: 'Fredoka_700Bold' }} className="text-emerald-600 text-xs font-bold">{idx + 1}</Text>
                  </View>
                  <Text style={{ fontFamily: 'Fredoka_400Regular' }} className="text-sm flex-1 leading-5 text-stone-600">
                    {step}
                  </Text>
                </View>
              ))}
            </View>
          </BentoTile>

          {/* TILE 8: PREVENTIVE STEPS */}
          <BentoTile
            title="PREVENTION"
            colSpan={2}
            icon={<Ionicons name="shield-checkmark-outline" size={18} color="#059669" />}
          >
            <View className="space-y-2 py-1">
              {result.prevention.map((step: string, idx: number) => (
                <View key={idx} className="flex-row items-start" style={{ marginBottom: 6 }}>
                  <Ionicons
                    name="checkmark-circle"
                    size={14}
                    color="#10b981"
                    style={{ marginRight: 8, marginTop: 2 }}
                  />
                  <Text style={{ fontFamily: 'Fredoka_400Regular' }} className="text-sm flex-1 leading-5 text-stone-600">
                    {step}
                  </Text>
                </View>
              ))}
            </View>
          </BentoTile>

          {/* TILE 9: CARE TIP */}
          <BentoTile
            title="ADDITIONAL CARE TIP"
            colSpan={2}
            icon={<Ionicons name="bulb-outline" size={18} color="#f59e0b" />}
            className="border-emerald-600/20 bg-emerald-50/20"
          >
            <Text style={{ fontFamily: 'Fredoka_400Regular' }} className="text-sm leading-6 italic text-stone-600">
              "{result.careTip}"
            </Text>
          </BentoTile>
        </BentoGrid>
      </ScrollView>

      {/* Floating Action Button Bar at Bottom */}
      <View className="absolute bottom-0 left-0 right-0 p-5 bg-white/95 border-t border-stone-150 shadow-lg">
        <TouchableOpacity
          onPress={() => router.push({ pathname: '/chat', params: { scanId: scanRecordId } })}
          disabled={!scanRecordId}
          activeOpacity={0.8}
          className={`bg-emerald-600 py-4 rounded-2xl flex-row items-center justify-center shadow-lg shadow-emerald-600/20 ${!scanRecordId ? 'opacity-40' : ''}`}
        >
          <Ionicons name="chatbubbles" size={20} color="white" />
          <Text style={{ fontFamily: 'Fredoka_700Bold' }} className="text-white font-bold ml-2 text-base">
            Start Follow-up Chat
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
