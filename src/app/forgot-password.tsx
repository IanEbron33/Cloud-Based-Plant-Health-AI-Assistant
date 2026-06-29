import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Animated,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  useColorScheme,
} from 'react-native';
import { FredokaText as Text } from '@/components/themed-text';
import { useRouter } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  ChevronLeft,
  ArrowRight,
  Check,
  Key,
} from 'lucide-react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const OTP_BOX_WIDTH = Math.min(Math.floor((SCREEN_WIDTH - 96 - 40) / 6), 48);

interface PasswordStrength {
  score: number;
  label: string;
  color: string;
  textColor: string;
}

const getPasswordStrength = (pass: string): PasswordStrength => {
  if (!pass) return { score: 0, label: '', color: 'bg-stone-200', textColor: 'text-stone-400' };

  let score = 0;

  // Criteria 1: Length >= 6
  if (pass.length >= 6) score += 1;
  // Criteria 2: Contains numbers or symbols
  if (/[0-9]/.test(pass) || /[^A-Za-z0-9]/.test(pass)) score += 1;
  // Criteria 3: Contains mixed case letters
  if (/[A-Z]/.test(pass) && /[a-z]/.test(pass)) score += 1;

  if (pass.length < 6) {
    return { score: 1, label: 'Weak', color: 'bg-red-500', textColor: 'text-red-500' };
  }

  if (score === 1) {
    return { score: 1, label: 'Weak', color: 'bg-red-500', textColor: 'text-red-500' };
  } else if (score === 2) {
    return { score: 2, label: 'Good', color: 'bg-orange-500', textColor: 'text-orange-500' };
  } else {
    return { score: 3, label: 'Strong', color: 'bg-emerald-500', textColor: 'text-emerald-500' };
  }
};

const formatErrorMessage = (error: any): string => {
  if (!error) return 'An unexpected error occurred.';
  if (typeof error === 'string') {
    if (error.startsWith('{') || error.includes('"status":504') || error.includes('504')) {
      return 'Supabase SMTP gateway timeout (504). Please check your SMTP settings in the dashboard.';
    }
    return error;
  }
  if (error.message) return error.message;
  return JSON.stringify(error);
};

const STEP_INFO = [
  { title: 'Request Reset', subtitle: 'Enter your account email' },
  { title: 'Verify OTP', subtitle: 'Enter the 6-digit code' },
  { title: 'New Password', subtitle: 'Reset your account security' },
];

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const { sendResetEmail, verifyRecoveryCode, updatePassword, signOut } = useAuth();
  const { showToast } = useToast();

  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  // Form states
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isConfirmPasswordVisible, setIsConfirmPasswordVisible] = useState(false);

  // Timer state for OTP Resend
  const [resendTimer, setResendTimer] = useState(0);

  // Animation refs
  const slideAnim = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(1)).current;
  const strengthAnim = useRef(new Animated.Value(0)).current;

  // Refs for OTP TextInputs
  const otpRefs = useRef<Array<any>>([]);

  // Sync password strength bar animation
  useEffect(() => {
    const score = getPasswordStrength(password).score;
    Animated.timing(strengthAnim, {
      toValue: score,
      duration: 220,
      useNativeDriver: false,
    }).start();
  }, [password]);

  // Sync horizontal progress line
  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: currentStep,
      duration: 320,
      useNativeDriver: false,
    }).start();
  }, [currentStep]);

  // Manage resend OTP countdown timer
  useEffect(() => {
    if (resendTimer <= 0) return;
    const interval = setInterval(() => {
      setResendTimer((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [resendTimer]);

  const animateTransition = (direction: 'forward' | 'backward', callback: () => void) => {
    const toValue = direction === 'forward' ? -SCREEN_WIDTH : SCREEN_WIDTH;
    Animated.timing(slideAnim, {
      toValue,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      callback();
      slideAnim.setValue(direction === 'forward' ? SCREEN_WIDTH : -SCREEN_WIDTH);
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    });
  };

  const handleSendEmail = async () => {
    if (!email.trim() || !email.includes('@')) {
      showToast({
        type: 'error',
        title: 'Invalid Email',
        message: 'Please enter a valid email address.',
      });
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await sendResetEmail(email.trim());
      if (error) {
        showToast({
          type: 'error',
          title: 'Error Requesting Code',
          message: formatErrorMessage(error),
        });
      } else {
        showToast({
          type: 'success',
          title: 'Code Sent',
          message: 'Check your email for the 6-digit recovery code.',
        });
        setResendTimer(60); // Starts 60s cooldown
        animateTransition('forward', () => setCurrentStep(2));
      }
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'Request Failed',
        message: err.message || 'An unexpected error occurred.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (resendTimer > 0) return;
    setIsLoading(true);
    try {
      const { error } = await sendResetEmail(email.trim());
      if (error) {
        showToast({
          type: 'error',
          title: 'Resend Failed',
          message: formatErrorMessage(error),
        });
      } else {
        showToast({
          type: 'success',
          title: 'Code Resent',
          message: 'A new recovery code has been sent to your email.',
        });
        setResendTimer(60);
      }
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'Request Failed',
        message: err.message || 'An unexpected error occurred.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpChange = (text: string, index: number) => {
    const cleanText = text.replace(/[^0-9]/g, '');
    const newOtp = [...otp];
    newOtp[index] = cleanText.substring(0, 1);
    setOtp(newOtp);

    // Auto focus next box
    if (cleanText && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace') {
      // Auto backspace/delete focus back
      if (!otp[index] && index > 0) {
        const newOtp = [...otp];
        newOtp[index - 1] = '';
        setOtp(newOtp);
        otpRefs.current[index - 1]?.focus();
      }
    }
  };

  const handleVerifyOtp = async () => {
    const code = otp.join('');
    if (code.length < 6) {
      showToast({
        type: 'error',
        title: 'Incomplete Code',
        message: 'Please enter all 6 digits of the recovery code.',
      });
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await verifyRecoveryCode(email.trim(), code);
      if (error) {
        showToast({
          type: 'error',
          title: 'Invalid Code',
          message: formatErrorMessage(error),
        });
      } else {
        showToast({
          type: 'success',
          title: 'Code Verified',
          message: 'Code verified successfully. Now, set your new password.',
        });
        animateTransition('forward', () => setCurrentStep(3));
      }
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'Verification Failed',
        message: err.message || 'An unexpected error occurred.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!password.trim() || password.length < 6) {
      showToast({
        type: 'error',
        title: 'Weak Password',
        message: 'Password must be at least 6 characters.',
      });
      return;
    }

    if (password !== confirmPassword) {
      showToast({
        type: 'error',
        title: 'Match Failed',
        message: 'Passwords do not match.',
      });
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await updatePassword(password);
      if (error) {
        showToast({
          type: 'error',
          title: 'Reset Failed',
          message: formatErrorMessage(error),
        });
      } else {
        // Sign out to clean recovery temporary session
        await signOut();
        
        showToast({
          type: 'success',
          title: 'Password Updated',
          message: 'Your password has been reset! Please login manually.',
        });
        router.replace('/login');
      }
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'Reset Error',
        message: err.message || 'An unexpected error occurred.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackStep = () => {
    if (currentStep > 1) {
      animateTransition('backward', () => setCurrentStep(currentStep - 1));
    } else {
      router.back();
    }
  };

  // Rendering Helpers
  const getCircleBgColor = (step: number) => {
    if (step === 1) return '#059669';
    if (step === 2) {
      return progressAnim.interpolate({
        inputRange: [1, 2, 3],
        outputRange: ['#e7e5e4', '#059669', '#059669'],
      });
    }
    return progressAnim.interpolate({
      inputRange: [1, 2, 3],
      outputRange: ['#e7e5e4', '#e7e5e4', '#059669'],
    });
  };

  const getCircleTextColor = (step: number) => {
    if (step === 1) return '#ffffff';
    if (step === 2) {
      return progressAnim.interpolate({
        inputRange: [1, 2, 3],
        outputRange: ['#a8a29e', '#ffffff', '#ffffff'],
      });
    }
    return progressAnim.interpolate({
      inputRange: [1, 2, 3],
      outputRange: ['#a8a29e', '#a8a29e', '#ffffff'],
    });
  };

  const renderProgressIndicator = () => (
    <View className="flex-row items-center justify-between mb-8 px-4" style={{ height: 40, width: '100%', position: 'relative' }}>
      {/* Background Line */}
      <View className="absolute left-6 right-6 h-0.5 bg-stone-200 dark:bg-stone-850" style={{ top: 20 }}>
        <Animated.View
          style={{
            height: '100%',
            backgroundColor: '#059669',
            borderRadius: 1.25,
            width: progressAnim.interpolate({
              inputRange: [1, 2, 3],
              outputRange: ['0%', '50%', '100%'],
            }),
          }}
        />
      </View>

      {/* Steps */}
      {[1, 2, 3].map((step) => (
        <View key={step} className="w-10 h-10 items-center justify-center">
          <Animated.View
            style={{
              width: 32,
              height: 32,
              borderRadius: 16,
              backgroundColor: getCircleBgColor(step),
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Animated.Text
              style={{
                fontSize: 13,
                fontWeight: '700',
                color: getCircleTextColor(step),
                fontFamily: 'Fredoka_700Bold',
              }}
            >
              {step}
            </Animated.Text>
          </Animated.View>
        </View>
      ))}
    </View>
  );

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className={`flex-1 ${isDark ? 'bg-stone-950' : 'bg-stone-50'}`}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        className="flex-1"
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View className="flex-1 justify-center px-6 py-10">
          
          {/* Header */}
          <View style={{ alignItems: 'center', marginBottom: 4 }}>
            <View className="w-14 h-14 rounded-2xl bg-emerald-100 dark:bg-emerald-950/30 items-center justify-center mb-3">
              <Key size={26} color="#059669" />
            </View>
            <Text className={`text-2xl font-bold font-fredoka ${isDark ? 'text-white' : 'text-stone-900'}`}>
              Forgot Password
            </Text>
            <Text className={`text-sm mt-1 text-center font-medium ${isDark ? 'text-stone-400' : 'text-stone-500'}`}>
              Recover access to your account
            </Text>
          </View>

          {/* Progress Circle Indicators */}
          <View style={{ marginTop: 10 }}>
            {renderProgressIndicator()}
          </View>

          {/* Step Subtitles */}
          <View style={{ marginBottom: 12, alignItems: 'center' }}>
            <Text
              style={{
                fontSize: 11,
                fontWeight: '800',
                color: '#059669',
                letterSpacing: 1.5,
                textTransform: 'uppercase',
                marginBottom: 2,
              }}
            >
              Step {currentStep} of 3
            </Text>
            <Text className={`text-lg font-bold font-fredoka ${isDark ? 'text-stone-200' : 'text-stone-800'}`}>
              {STEP_INFO[currentStep - 1].title}
            </Text>
            <Text className={`text-xs mt-0.5 ${isDark ? 'text-stone-500' : 'text-stone-400'}`}>
              {STEP_INFO[currentStep - 1].subtitle}
            </Text>
          </View>

          {/* Wizard Content Card */}
          <Animated.View
            className={`p-6 rounded-[28px] border bg-white border-stone-100 shadow-sm dark:bg-stone-900 dark:border-stone-850`}
            style={{ transform: [{ translateX: slideAnim }] }}
          >
            {/* Step 1: Email Form */}
            {currentStep === 1 && (
              <View>
                <View className="mb-4">
                  <Text className={`text-xs font-bold uppercase tracking-wider mb-2 ${isDark ? 'text-stone-400' : 'text-stone-500'}`}>
                    Email Address
                  </Text>
                  <View className="flex-row items-center px-4 rounded-2xl border bg-stone-50 border-stone-200 dark:bg-stone-950 dark:border-stone-800">
                    <Mail size={19} color="#78716c" />
                    <TextInput
                      value={email}
                      onChangeText={setEmail}
                      placeholder="Enter registered email"
                      placeholderTextColor="#a8a29e"
                      keyboardType="email-address"
                      autoCapitalize="none"
                      className={`flex-1 py-4 px-2 text-base ${isDark ? 'text-white' : 'text-stone-900'}`}
                      style={{ fontSize: 13 }}
                    />
                  </View>
                </View>

                <TouchableOpacity
                  onPress={handleSendEmail}
                  disabled={isLoading}
                  activeOpacity={0.85}
                  className={`py-4 rounded-2xl items-center shadow-lg flex-row justify-center gap-2 ${
                    isLoading ? 'bg-emerald-600/70 shadow-none' : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/10'
                  }`}
                >
                  {isLoading ? (
                    <ActivityIndicator color="white" size="small" />
                  ) : (
                    <>
                      <Text className="text-white text-base font-bold font-fredoka tracking-wide">
                        Send Recovery Code
                      </Text>
                      <ArrowRight size={18} color="white" />
                    </>
                  )}
                </TouchableOpacity>
              </View>
            )}

            {/* Step 2: OTP Verification */}
            {currentStep === 2 && (
              <View>
                <Text className={`text-xs text-center mb-6 leading-5 ${isDark ? 'text-stone-400' : 'text-stone-500'}`}>
                  Type the code sent to <Text className="font-bold text-emerald-600">{email}</Text>
                </Text>

                {/* 6 Digit Box Container */}
                <View className="flex-row justify-center mb-6" style={{ gap: 8 }}>
                  {otp.map((digit, idx) => (
                    <TextInput
                      key={idx}
                      ref={(ref) => {
                        otpRefs.current[idx] = ref;
                      }}
                      value={digit}
                      onChangeText={(text) => handleOtpChange(text, idx)}
                      onKeyPress={(e) => handleOtpKeyPress(e, idx)}
                      keyboardType="number-pad"
                      maxLength={1}
                      selectTextOnFocus
                      className={`h-12 border rounded-lg text-center text-base font-bold text-stone-900 dark:text-white bg-stone-50 border-stone-200 dark:bg-stone-950 dark:border-stone-800`}
                      style={{ width: OTP_BOX_WIDTH, textAlign: 'center' }}
                    />
                  ))}
                </View>

                {/* Resend Cooldown Counter */}
                <View className="items-center mb-6">
                  {resendTimer > 0 ? (
                    <Text className={`text-xs ${isDark ? 'text-stone-500' : 'text-stone-400'}`}>
                      Resend code in <Text className="font-bold">{resendTimer}s</Text>
                    </Text>
                  ) : (
                    <TouchableOpacity onPress={handleResendCode} disabled={isLoading}>
                      <Text className="text-xs font-bold text-emerald-600 hover:text-emerald-700">
                        Resend Recovery Code
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>

                <TouchableOpacity
                  onPress={handleVerifyOtp}
                  disabled={isLoading}
                  activeOpacity={0.85}
                  className={`py-4 rounded-2xl items-center shadow-lg flex-row justify-center gap-2 ${
                    isLoading ? 'bg-emerald-600/70 shadow-none' : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/10'
                  }`}
                >
                  {isLoading ? (
                    <ActivityIndicator color="white" size="small" />
                  ) : (
                    <>
                      <Text className="text-white text-base font-bold font-fredoka tracking-wide">
                        Verify Code
                      </Text>
                      <Check size={18} color="white" />
                    </>
                  )}
                </TouchableOpacity>
              </View>
            )}

            {/* Step 3: Reset Password */}
            {currentStep === 3 && (
              <View>
                {/* New Password */}
                <View className="mb-4">
                  <Text className={`text-xs font-bold uppercase tracking-wider mb-2 ${isDark ? 'text-stone-400' : 'text-stone-500'}`}>
                    New Password
                  </Text>
                  <View className="flex-row items-center px-4 rounded-2xl border bg-stone-50 border-stone-200 dark:bg-stone-950 dark:border-stone-800">
                    <Lock size={19} color="#78716c" />
                    <TextInput
                      value={password}
                      onChangeText={setPassword}
                      placeholder="Create a new password"
                      placeholderTextColor="#a8a29e"
                      secureTextEntry={!isPasswordVisible}
                      autoCapitalize="none"
                      className={`flex-1 py-4 px-2 text-base ${isDark ? 'text-white' : 'text-stone-900'}`}
                      style={{ fontSize: 13 }}
                    />
                    <TouchableOpacity
                      onPress={() => setIsPasswordVisible(!isPasswordVisible)}
                      activeOpacity={0.7}
                      style={{ padding: 4 }}
                    >
                      {isPasswordVisible ? (
                        <EyeOff size={19} color="#78716c" />
                      ) : (
                        <Eye size={19} color="#78716c" />
                      )}
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Password Strength Indicator */}
                {password.length > 0 && (
                  <View className="mb-4 px-1">
                    <View className="flex-row justify-between items-center mb-1.5">
                      <Text className="text-xs font-semibold text-stone-500">
                        Password Strength
                      </Text>
                      <Text className={`text-xs font-bold ${getPasswordStrength(password).textColor}`}>
                        {getPasswordStrength(password).label}
                      </Text>
                    </View>
                    {/* Progress Bar Container */}
                    <View className="h-1.5 w-full bg-stone-100 dark:bg-stone-850 rounded-full overflow-hidden">
                      <Animated.View
                        style={{
                          height: '100%',
                          borderRadius: 4,
                          width: strengthAnim.interpolate({
                            inputRange: [0, 1, 2, 3],
                            outputRange: ['0%', '33%', '66%', '100%'],
                          }),
                          backgroundColor: strengthAnim.interpolate({
                            inputRange: [0, 1, 2, 3],
                            outputRange: [
                              isDark ? '#292524' : '#e7e5e4',
                              '#ef4444',
                              '#f97316',
                              '#10b981',
                            ],
                          }),
                        }}
                      />
                    </View>
                  </View>
                )}

                {/* Confirm Password */}
                <View className="mb-6">
                  <Text className={`text-xs font-bold uppercase tracking-wider mb-2 ${isDark ? 'text-stone-400' : 'text-stone-500'}`}>
                    Confirm Password
                  </Text>
                  <View className="flex-row items-center px-4 rounded-2xl border bg-stone-50 border-stone-200 dark:bg-stone-950 dark:border-stone-800">
                    <Lock size={19} color="#78716c" />
                    <TextInput
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                      placeholder="Confirm your password"
                      placeholderTextColor="#a8a29e"
                      secureTextEntry={!isConfirmPasswordVisible}
                      autoCapitalize="none"
                      className={`flex-1 py-4 px-2 text-base ${isDark ? 'text-white' : 'text-stone-900'}`}
                      style={{ fontSize: 13 }}
                    />
                    <TouchableOpacity
                      onPress={() => setIsConfirmPasswordVisible(!isConfirmPasswordVisible)}
                      activeOpacity={0.7}
                      style={{ padding: 4 }}
                    >
                      {isConfirmPasswordVisible ? (
                        <EyeOff size={19} color="#78716c" />
                      ) : (
                        <Eye size={19} color="#78716c" />
                      )}
                    </TouchableOpacity>
                  </View>
                </View>

                <TouchableOpacity
                  onPress={handleResetPassword}
                  disabled={isLoading}
                  activeOpacity={0.85}
                  className={`py-4 rounded-2xl items-center shadow-lg flex-row justify-center gap-2 ${
                    isLoading ? 'bg-emerald-600/70 shadow-none' : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/10'
                  }`}
                >
                  {isLoading ? (
                    <ActivityIndicator color="white" size="small" />
                  ) : (
                    <>
                      <Text className="text-white text-base font-bold font-fredoka tracking-wide">
                        Reset Password
                      </Text>
                      <Check size={18} color="white" />
                    </>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </Animated.View>

          {/* Navigation Action Buttons (Back) */}
          <View style={{ flexDirection: 'row', marginTop: 20, gap: 12 }}>
            <TouchableOpacity
              onPress={handleBackStep}
              disabled={isLoading}
              activeOpacity={0.8}
              style={{
                flex: 1,
                paddingVertical: 16,
                borderRadius: 16,
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'row',
                gap: 6,
                borderWidth: 1.5,
                borderColor: isDark ? '#292524' : '#d6d3d1',
                backgroundColor: isDark ? '#1c1917' : '#ffffff',
                opacity: isLoading ? 0.5 : 1,
              }}
            >
              <ChevronLeft size={18} color={isDark ? '#d6d3d1' : '#57534e'} />
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: '700',
                  color: isDark ? '#d6d3d1' : '#57534e',
                }}
              >
                {currentStep > 1 ? 'Back to Step ' + (currentStep - 1) : 'Back to Login'}
              </Text>
            </TouchableOpacity>
          </View>

        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
