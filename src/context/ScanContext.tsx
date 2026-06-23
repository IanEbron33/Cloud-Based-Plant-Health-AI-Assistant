import React, { createContext, useContext, useState, useRef, useEffect } from 'react';
import { router } from 'expo-router';
import * as ImageManipulator from 'expo-image-manipulator';
import { DiagnosisResult, ScanState, ScanActions, ScanContextValue } from '../types';
import { scanCrop } from '../services/api.service';
import { parseDiagnosis } from '../services/diagnosis-parser';
import { useToast } from './ToastContext';
import { useAuth } from './AuthContext';
import { initLocalDatabase, saveScan } from '../services/scan.service';
import vegetablesDb from '../../assets/data/vegetables_db.json';

const ScanContext = createContext<ScanContextValue | undefined>(undefined);

interface ScanProviderProps {
  children: React.ReactNode;
}

export function ScanProvider({ children }: ScanProviderProps) {
  const { showToast } = useToast();
  const { user } = useAuth();

  const [state, setState] = useState<ScanState>({
    isScanning: false,
    scanPhase: 'idle',
    scannedImageUri: null,
    activeModel: 'flash',
    identifiedCrop: null,
    diagnosisResult: null,
    errorMessage: null,
    loadingCaption: 'Identifying crop type...',
    lastSavedScanId: null,
  });

  const accumulatedTextRef = useRef<string>('');
  const abortControllerRef = useRef<AbortController | null>(null);
  const captionIntervalRef = useRef<any>(null);

  const startLoadingCaptionTimer = () => {
    if (captionIntervalRef.current) clearInterval(captionIntervalRef.current);

    let seconds = 0;
    setState((prev) => ({ ...prev, loadingCaption: 'Identifying crop type...' }));

    captionIntervalRef.current = setInterval(() => {
      seconds += 1;
      let caption = 'Identifying crop type...';

      if (seconds >= 12) {
        caption = 'Finalizing analysis report...';
      } else if (seconds >= 7) {
        caption = 'Searching for organic treatments...';
      } else if (seconds >= 3) {
        caption = 'Analyzing leaf damage...';
      }

      setState((prev) => {
        if (!prev.isScanning) {
          if (captionIntervalRef.current) clearInterval(captionIntervalRef.current);
          return prev;
        }
        return { ...prev, loadingCaption: caption };
      });
    }, 1000);
  };

  const startScan = async (imageUri: string, model: 'flash' | 'deep') => {
    // Reset state for new scan
    setState({
      isScanning: true,
      scanPhase: 'classifying',
      scannedImageUri: imageUri,
      activeModel: model,
      identifiedCrop: null,
      diagnosisResult: null,
      errorMessage: null,
      loadingCaption: 'Identifying crop type...',
      lastSavedScanId: null,
    });

    accumulatedTextRef.current = '';

    // Abort any existing pipeline
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    // Start caption rotation timer
    startLoadingCaptionTimer();

    try {
      // 1. Client-Side Image Compression using expo-image-manipulator
      let compressedImageUri = imageUri;
      try {
        const manipResult = await ImageManipulator.manipulateAsync(
          imageUri,
          [{ resize: { width: 1024 } }],
          { compress: 0.5, format: ImageManipulator.SaveFormat.JPEG }
        );
        compressedImageUri = manipResult.uri;
      } catch (manipErr) {
        console.warn('[ScanContext] Image compression failed, using original:', manipErr);
      }

      if (abortControllerRef.current.signal.aborted) return;

      // 2. Gather all support crops from local database to guide classifier
      const supportedCrops = Object.keys(vegetablesDb).join(',');

      // 3. Stringify the entire local database context
      const fullContextString = JSON.stringify(vegetablesDb);

      let identifiedCropLocal: string | null = null;

      // 4. Merged Scan (Classify + Diagnose) via Single SSE Stream
      await scanCrop(
        compressedImageUri,
        supportedCrops,
        fullContextString,
        model,
        // onCropIdentified callback
        (cropName) => {
          identifiedCropLocal = cropName;
          setState((prev) => ({
            ...prev,
            identifiedCrop: cropName,
            scanPhase: 'diagnosing',
          }));
        },
        // onChunk callback
        (chunk) => {
          if (chunk.text) {
            accumulatedTextRef.current += chunk.text;
          }
        },
        // onDone callback
        async () => {
          if (captionIntervalRef.current) clearInterval(captionIntervalRef.current);

          const finalCrop = identifiedCropLocal || 'Talong';
          const parsedResult = parseDiagnosis(accumulatedTextRef.current, finalCrop, imageUri);

          // Write to SQLite and trigger sync
          let savedId = '';
          if (user) {
            try {
              const savedRow = await saveScan(
                user.id,
                finalCrop,
                parsedResult.condition,
                parsedResult.severity,
                parsedResult.healthScore,
                parsedResult.confidenceScore,
                imageUri,
                accumulatedTextRef.current
              );
              savedId = savedRow.id;
            } catch (dbErr) {
              console.error('[ScanContext] SQLite write error:', dbErr);
            }
          }

          setState((prev) => ({
            ...prev,
            isScanning: false,
            scanPhase: 'done',
            diagnosisResult: parsedResult,
            lastSavedScanId: savedId,
          }));

          if (parsedResult.confidenceScore < 20) {
            showToast({
              type: 'warning',
              title: 'Low Confidence Scan',
              message: `Identified as ${parsedResult.cropLocalName} (${parsedResult.confidenceScore}%), but the result may be unreliable. Tap to view details.`,
              duration: 6000,
              onPress: () => {
                router.push({ pathname: '/scan-results', params: { id: savedId } });
              },
            });
          } else {
            showToast({
              type: 'success',
              title: 'Scan Completed',
              message: `Identified crop as ${parsedResult.cropLocalName}. Tap to view results.`,
              duration: 5000,
              onPress: () => {
                router.push({ pathname: '/scan-results', params: { id: savedId } });
              },
            });
          }
        },
        // onError callback
        (err) => {
          if (captionIntervalRef.current) clearInterval(captionIntervalRef.current);

          setState((prev) => ({
            ...prev,
            isScanning: false,
            scanPhase: 'error',
            errorMessage: err,
          }));

          showToast({
            type: 'error',
            title: 'Scan Failed',
            message: err,
            duration: 5000,
          });
        },
        abortControllerRef.current.signal
      );
    } catch (err: any) {
      if (captionIntervalRef.current) clearInterval(captionIntervalRef.current);
      if (abortControllerRef.current?.signal.aborted) return;

      const errMsg = err.message || 'An unknown error occurred';

      setState((prev) => ({
        ...prev,
        isScanning: false,
        scanPhase: 'error',
        errorMessage: errMsg,
      }));

      showToast({
        type: 'error',
        title: 'Scan Failed',
        message: errMsg,
        duration: 4000,
      });
    }
  };

  const cancelScan = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    if (captionIntervalRef.current) {
      clearInterval(captionIntervalRef.current);
    }

    setState((prev) => ({
      ...prev,
      isScanning: false,
      scanPhase: 'idle',
      scannedImageUri: null,
      identifiedCrop: null,
      diagnosisResult: null,
      lastSavedScanId: null,
    }));

    showToast({
      type: 'warning',
      title: 'Scan Cancelled',
      message: 'The plant analysis has been cancelled.',
      duration: 3000,
    });
  };

  const clearResults = () => {
    if (captionIntervalRef.current) {
      clearInterval(captionIntervalRef.current);
    }

    setState({
      isScanning: false,
      scanPhase: 'idle',
      scannedImageUri: null,
      activeModel: 'flash',
      identifiedCrop: null,
      diagnosisResult: null,
      errorMessage: null,
      loadingCaption: 'Identifying crop type...',
      lastSavedScanId: null,
    });
  };

  useEffect(() => {
    initLocalDatabase();
    return () => {
      if (captionIntervalRef.current) clearInterval(captionIntervalRef.current);
      if (abortControllerRef.current) abortControllerRef.current.abort();
    };
  }, []);

  return (
    <ScanContext.Provider value={{ ...state, startScan, cancelScan, clearResults }}>
      {children}
    </ScanContext.Provider>
  );
}

export function useScan() {
  const context = useContext(ScanContext);
  if (context === undefined) {
    throw new Error('useScan must be used within a ScanProvider');
  }
  return context;
}
