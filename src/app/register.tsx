import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
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
import { useRouter } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { uploadAvatar, updateUserProfile } from '../services/profile.service';
import {
  User,
  AtSign,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Calendar,
  ChevronDown,
  ChevronLeft,
  ArrowRight,
  UserPlus,
  Mars,
  Venus,
} from 'lucide-react-native';
import BirthdatePickerModal from '../components/BirthdatePickerModal';
import ProfilePicturePicker from '../components/ProfilePicturePicker';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

type GenderOption = 'Male' | 'Female' | 'Prefer not to say';

const STEP_INFO = [
  { title: 'Personal Details', subtitle: 'Tell us about yourself' },
  { title: 'Your Credentials', subtitle: 'Secure your account' },
  { title: 'Profile Picture', subtitle: 'Add a personal touch' },
];

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

export default function RegisterScreen() {
  const router = useRouter();
  const { signUp, refreshProfile, setIsRegistering, signOut } = useAuth();
  const { showToast } = useToast();

  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const strengthAnim = useRef(new Animated.Value(0)).current;


  // Wizard step
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const slideAnim = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(1)).current;

  React.useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: currentStep,
      duration: 320,
      useNativeDriver: false,
    }).start();
  }, [currentStep]);

  // Step 1 — Personal Details
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [gender, setGender] = useState<GenderOption>('Male');
  const [birthdate, setBirthdate] = useState({ year: new Date().getFullYear(), month: 1, day: 1 });
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Step 2 — Credentials
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isConfirmPasswordVisible, setIsConfirmPasswordVisible] = useState(false);

  // Step 3 — Profile Picture
  const [profileImage, setProfileImage] = useState<string | null>(null);

  // Validation errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const score = getPasswordStrength(password).score;
    Animated.timing(strengthAnim, {
      toValue: score,
      duration: 220,
      useNativeDriver: false,
    }).start();
  }, [password]);

  const formatBirthdate = () => {
    return `${MONTHS[birthdate.month - 1]} ${birthdate.day}, ${birthdate.year}`;
  };

  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {};

    if (step === 1) {
      if (!fullName.trim()) newErrors.fullName = 'Full name is required';
      if (!username.trim()) newErrors.username = 'Username is required';
    } else if (step === 2) {
      if (!email.trim()) newErrors.email = 'Email is required';
      if (!password.trim()) newErrors.password = 'Password is required';
      else if (password.length < 6) newErrors.password = 'Minimum 6 characters';
      if (!confirmPassword.trim()) newErrors.confirmPassword = 'Please confirm your password';
      else if (password !== confirmPassword) newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

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

  const handleNext = () => {
    if (!validateStep(currentStep)) return;
    if (currentStep < 3) {
      animateTransition('forward', () => setCurrentStep(currentStep + 1));
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setErrors({});
      animateTransition('backward', () => setCurrentStep(currentStep - 1));
    }
  };

  const handleRegister = async () => {
    // Basic final check of validation
    if (!email.trim() || !password.trim()) {
      showToast({
        type: 'error',
        title: 'Required Fields',
        message: 'Please fill in your email and password.',
      });
      return;
    }
    if (!fullName.trim() || !username.trim()) {
      showToast({
        type: 'error',
        title: 'Required Fields',
        message: 'Please fill in your name and username.',
      });
      return;
    }

    setIsLoading(true);
    // Enable the registration flag to pause navigation redirects
    setIsRegistering(true);

    try {
      // 1. Sign up user via AuthContext
      const { user, error: signUpError } = await signUp(
        email.trim(),
        password,
        fullName.trim()
      );

      if (signUpError) {
        showToast({
          type: 'error',
          title: 'Registration Failed',
          message: signUpError,
        });
        setIsRegistering(false);
        setIsLoading(false);
        return;
      }

      if (!user) {
        showToast({
          type: 'success',
          title: 'Registration Complete',
          message: 'Verification email sent, or sign up succeeded.',
        });
        setIsRegistering(false);
        setIsLoading(false);
        return;
      }

      // 2. Upload avatar image if selected (via profile service)
      let avatarUrl: string | null = null;
      if (profileImage) {
        avatarUrl = await uploadAvatar(user.id, profileImage);
      }

      // 3. Update profiles table (via profile service)
      const profileError = await updateUserProfile(user.id, {
        username: username.trim().toLowerCase(),
        gender: gender === 'Prefer not to say' ? 'Other' : gender,
        birthdate: `${birthdate.year}-${String(birthdate.month).padStart(2, '0')}-${String(birthdate.day).padStart(2, '0')}`,
        avatar_url: avatarUrl,
      });

      if (profileError) {
        console.warn('Profile DB update failed:', profileError);
      }

      // 4. Force refresh the profile state in AuthContext to include the uploaded avatar and user details
      try {
        await refreshProfile();
      } catch (refreshErr) {
        console.warn('Failed to refresh profile in auth context:', refreshErr);
      }

      // 5. Sign out the user to destroy the auto-started session
      try {
        await signOut();
      } catch (signOutErr) {
        console.warn('Failed to sign out after registration:', signOutErr);
      }

      // 6. Turn off the registration flag, display success Toast, and redirect to Login
      setIsRegistering(false);

      showToast({
        type: 'success',
        title: 'Registration Successful',
        message: 'Your account has been created! Please log in manually.',
      });

      router.replace('/login');
    } catch (err: any) {
      setIsRegistering(false);
      showToast({
        type: 'error',
        title: 'Registration Error',
        message: err.message || 'An unexpected error occurred.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // === Reusable Input Field ===
  const renderInput = (
    icon: React.ReactNode,
    value: string,
    onChangeText: (text: string) => void,
    placeholder: string,
    errorKey: string,
    options?: {
      keyboardType?: 'email-address' | 'default';
      secureTextEntry?: boolean;
      autoCapitalize?: 'none' | 'sentences' | 'words';
      rightIcon?: React.ReactNode;
    }
  ) => (
    <View className="mb-4">
      <View
        className={`flex-row items-center px-4 rounded-2xl border ${
          errors[errorKey]
            ? 'border-red-400 bg-stone-50'
            : 'bg-stone-50 border-stone-200'
        }`}
      >
        {icon}
        <TextInput
          value={value}
          onChangeText={(text) => {
            onChangeText(text);
            if (errors[errorKey]) {
              setErrors((prev) => {
                const next = { ...prev };
                delete next[errorKey];
                return next;
              });
            }
          }}
          placeholder={placeholder}
          placeholderTextColor="#a8a29e"
          keyboardType={options?.keyboardType || 'default'}
          secureTextEntry={options?.secureTextEntry}
          autoCapitalize={options?.autoCapitalize ?? 'sentences'}
          className="flex-1 py-4 px-2 text-base text-stone-900"
          style={{ fontSize: 14 }}
        />
        {options?.rightIcon}
      </View>
      {errors[errorKey] && (
        <Text className="text-red-400 text-xs mt-1.5 ml-2 font-medium">
          {errors[errorKey]}
        </Text>
      )}
    </View>
  );

  // === Step 1: Personal Details ===
  const renderStep1 = () => (
    <View>
      {renderInput(
        <User size={19} color="#78716c" />,
        fullName,
        setFullName,
        'Enter your full name',
        'fullName',
        { autoCapitalize: 'words' }
      )}

      {renderInput(
        <AtSign size={19} color="#78716c" />,
        username,
        (text) => setUsername(text.toLowerCase().replace(/\s/g, '')),
        'Choose a username',
        'username',
        { autoCapitalize: 'none' }
      )}

      {/* Gender — 2×2 Grid */}
      <View className="mb-4">
        <Text className="text-xs font-bold uppercase tracking-wider mb-2.5 ml-1 text-stone-500">
          Gender
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {(['Male', 'Female', 'Prefer not to say'] as GenderOption[]).map((g) => {
            const isSelected = gender === g;
            const iconColor = isSelected ? '#ffffff' : '#78716c';
            return (
              <TouchableOpacity
                key={g}
                onPress={() => setGender(g)}
                activeOpacity={0.8}
                style={{
                  width: '48%',
                  flexGrow: 1,
                  paddingVertical: 12,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 16,
                  borderWidth: 1.5,
                  backgroundColor: isSelected ? '#059669' : '#fafaf9',
                  borderColor: isSelected ? '#059669' : '#e7e5e4',
                  gap: 6,
                }}
              >
                {g === 'Male' && <Mars size={17} color={iconColor} />}
                {g === 'Female' && <Venus size={17} color={iconColor} />}
                <Text
                  style={{
                    fontWeight: '700',
                    fontSize: 13,
                    color: isSelected ? '#ffffff' : '#57534e',
                  }}
                >
                  {g}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Birthdate — Tap to open modal */}
      <View className="mb-2">
        <Text className="text-xs font-bold uppercase tracking-wider mb-2.5 ml-1 text-stone-500">
          Birthdate
        </Text>
        <TouchableOpacity
          onPress={() => setShowDatePicker(true)}
          activeOpacity={0.8}
          className="flex-row items-center px-4 py-4 rounded-2xl border bg-stone-50 border-stone-200"
        >
          <Calendar size={19} color="#78716c" />
          <Text
            className="flex-1 px-2 text-stone-900"
            style={{ fontSize: 14, fontWeight: '500' }}
          >
            {formatBirthdate()}
          </Text>
          <ChevronDown size={18} color="#78716c" />
        </TouchableOpacity>
      </View>

      <BirthdatePickerModal
        visible={showDatePicker}
        onClose={() => setShowDatePicker(false)}
        onConfirm={(date) => {
          setBirthdate(date);
          setShowDatePicker(false);
        }}
        initialDate={birthdate}
      />
    </View>
  );

  // === Step 2: Credentials ===
  const renderStep2 = () => (
    <View>
      {renderInput(
        <Mail size={19} color="#78716c" />,
        email,
        setEmail,
        'Enter your email address',
        'email',
        { keyboardType: 'email-address', autoCapitalize: 'none' }
      )}

      {renderInput(
        <Lock size={19} color="#78716c" />,
        password,
        setPassword,
        'Create a password',
        'password',
        {
          secureTextEntry: !isPasswordVisible,
          autoCapitalize: 'none',
          rightIcon: (
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
          ),
        }
      )}

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

      {renderInput(
        <Lock size={19} color="#78716c" />,
        confirmPassword,
        setConfirmPassword,
        'Confirm your password',
        'confirmPassword',
        {
          secureTextEntry: !isConfirmPasswordVisible,
          autoCapitalize: 'none',
          rightIcon: (
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
          ),
        }
      )}

      <View className="mt-1 mb-2">
        <Text className="text-xs ml-1 text-stone-400">
          Password must be at least 6 characters
        </Text>
      </View>
    </View>
  );

  // === Step 3: Profile Picture ===
  const renderStep3 = () => (
    <View style={{ alignItems: 'center', paddingVertical: 12 }}>
      <ProfilePicturePicker
        imageUri={profileImage}
        onImageSelected={setProfileImage}
      />
    </View>
  );

  // === Progress Indicator Helpers ===
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

  const getRingOpacity = (step: number) => {
    if (step === 1) {
      return progressAnim.interpolate({
        inputRange: [1, 1.5, 2, 3],
        outputRange: [1, 0, 0, 0],
      });
    }
    if (step === 2) {
      return progressAnim.interpolate({
        inputRange: [1, 1.5, 2, 2.5, 3],
        outputRange: [0, 0, 1, 0, 0],
      });
    }
    return progressAnim.interpolate({
      inputRange: [1, 2, 2.5, 3],
      outputRange: [0, 0, 0, 1],
    });
  };

  const getCircleScale = (step: number) => {
    if (step === 1) {
      return progressAnim.interpolate({
        inputRange: [1, 2, 3],
        outputRange: [1.1, 1, 1],
      });
    }
    if (step === 2) {
      return progressAnim.interpolate({
        inputRange: [1, 2, 3],
        outputRange: [1, 1.1, 1],
      });
    }
    return progressAnim.interpolate({
      inputRange: [1, 2, 3],
      outputRange: [1, 1, 1.1],
    });
  };

  // === Progress Indicator ===
  const renderProgressIndicator = () => (
    <View style={{ width: '100%', paddingHorizontal: 24, marginBottom: 24 }}>
      {/* Background Track Line */}
      <View
        style={{
          position: 'absolute',
          left: 44, // 24 padding + 20 half-circle-container
          right: 44,
          top: 20, // Center vertically in 40px outer container
          height: 2.5,
          backgroundColor: '#e7e5e4',
          borderRadius: 1.25,
          zIndex: 0,
        }}
      >
        {/* Animated Green Progress Line */}
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

      {/* Circle Indicators */}
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          zIndex: 1,
        }}
      >
        {[1, 2, 3].map((step) => (
          <View
            key={step}
            style={{
              width: 40,
              height: 40,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {/* Outer Highlight Ring */}
            <Animated.View
              style={{
                position: 'absolute',
                width: 40,
                height: 40,
                borderRadius: 20,
                borderWidth: 3,
                borderColor: 'rgba(5, 150, 105, 0.25)',
                opacity: getRingOpacity(step),
              }}
            />

            {/* Inner Circle */}
            <Animated.View
              style={{
                width: 32,
                height: 32,
                borderRadius: 16,
                backgroundColor: getCircleBgColor(step),
                alignItems: 'center',
                justifyContent: 'center',
                transform: [{ scale: getCircleScale(step) }],
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
    </View>
  );

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-stone-50"
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        className="flex-1"
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View className="flex-1 justify-center px-6 py-10">
          {/* Header */}
          <View style={{ alignItems: 'center', marginBottom: 8 }}>
            <Text className="text-2xl font-bold font-fredoka text-stone-900">
              Create Account
            </Text>
            <Text className="text-sm mt-1 text-center font-medium text-stone-500">
              Join Bugsok AI to track your crop health
            </Text>
          </View>

          {/* Progress Indicator */}
          <View style={{ marginTop: 20 }}>
            {renderProgressIndicator()}
          </View>

          {/* Step Title */}
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
            <Text className="text-lg font-bold font-fredoka text-stone-800">
              {STEP_INFO[currentStep - 1].title}
            </Text>
            <Text className="text-xs mt-0.5 text-stone-400">
              {STEP_INFO[currentStep - 1].subtitle}
            </Text>
          </View>

          {/* Form Card */}
          <Animated.View
            className="p-6 rounded-[28px] border bg-white border-stone-100 shadow-sm"
            style={{ transform: [{ translateX: slideAnim }] }}
          >
            {currentStep === 1 && renderStep1()}
            {currentStep === 2 && renderStep2()}
            {currentStep === 3 && renderStep3()}
          </Animated.View>

          {/* Navigation Buttons */}
          <View
            style={{
              flexDirection: 'row',
              marginTop: 20,
              gap: 12,
            }}
          >
            {currentStep > 1 && (
              <TouchableOpacity
                onPress={handleBack}
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
                  borderColor: '#d6d3d1',
                  backgroundColor: '#ffffff',
                  opacity: isLoading ? 0.5 : 1,
                }}
              >
                <ChevronLeft size={18} color="#57534e" />
                <Text
                  style={{
                    fontSize: 15,
                    fontWeight: '700',
                    color: '#57534e',
                    fontFamily: 'Fredoka_700Bold',
                  }}
                >
                  Back
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              onPress={currentStep === 3 ? handleRegister : handleNext}
              disabled={isLoading}
              activeOpacity={0.85}
              style={{
                flex: currentStep > 1 ? 1.5 : 1,
                paddingVertical: 16,
                borderRadius: 16,
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'row',
                gap: 8,
                backgroundColor: isLoading ? 'rgba(5, 150, 105, 0.7)' : '#059669',
              }}
            >
              {isLoading ? (
                <ActivityIndicator color="white" size="small" />
              ) : (
                <>
                  <Text
                    style={{
                      fontSize: 15,
                      fontWeight: '700',
                      color: '#ffffff',
                      fontFamily: 'Fredoka_700Bold',
                      letterSpacing: 0.3,
                    }}
                  >
                    {currentStep === 3 ? 'Create Account' : 'Next'}
                  </Text>
                  {currentStep === 3 ? (
                    <UserPlus size={18} color="#ffffff" />
                  ) : (
                    <ArrowRight size={18} color="#ffffff" />
                  )}
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Skip for now (Step 3 only) */}
          {currentStep === 3 && (
            <TouchableOpacity
              onPress={handleRegister}
              disabled={isLoading}
              activeOpacity={0.7}
              style={{ alignItems: 'center', marginTop: 14, opacity: isLoading ? 0.5 : 1 }}
            >
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: '600',
                  color: '#a8a29e',
                }}
              >
                Skip for now
              </Text>
            </TouchableOpacity>
          )}

          {/* Footer — Link to Login */}
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'center',
              alignItems: 'center',
              marginTop: 24,
            }}
          >
            <Text className="text-sm text-stone-600">
              Already have an account?{' '}
            </Text>
            <TouchableOpacity onPress={() => router.back()}>
              <Text className="text-emerald-500 font-bold text-sm">Log In</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
