import React, { useRef, useCallback, useState, useEffect } from 'react';
import {
  View,
  TouchableOpacity,
  Modal,
  FlatList,
  Pressable,
  Dimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { FredokaText as Text } from './themed-text';
import { Calendar, Check } from 'lucide-react-native';

const ITEM_HEIGHT = 44;
const VISIBLE_ITEMS = 5;
const PICKER_HEIGHT = ITEM_HEIGHT * VISIBLE_ITEMS;
const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const START_YEAR = 1940;
const END_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: END_YEAR - START_YEAR + 1 }, (_, i) => END_YEAR - i);

function getDaysInMonth(month: number, year: number): number {
  return new Date(year, month, 0).getDate();
}

interface BirthdatePickerModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (date: { year: number; month: number; day: number }) => void;
  initialDate?: { year: number; month: number; day: number };
}

interface WheelColumnProps {
  data: (string | number)[];
  selectedIndex: number;
  onSelect: (index: number) => void;
}

function WheelColumn({ data, selectedIndex, onSelect }: WheelColumnProps) {
  const flatListRef = useRef<FlatList>(null);
  const isScrollingRef = useRef(false);
  const [activeValIndex, setActiveValIndex] = useState(selectedIndex);

  useEffect(() => {
    setActiveValIndex(selectedIndex);
    if (!isScrollingRef.current && flatListRef.current) {
      flatListRef.current.scrollToOffset({
        offset: selectedIndex * ITEM_HEIGHT,
        animated: false,
      });
    }
  }, [selectedIndex]);

  const handleScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const offsetY = e.nativeEvent.contentOffset.y;
      const index = Math.round(offsetY / ITEM_HEIGHT);
      const clampedIndex = Math.max(0, Math.min(index, data.length - 1));
      if (clampedIndex !== activeValIndex) {
        setActiveValIndex(clampedIndex);
      }
    },
    [data.length, activeValIndex]
  );

  const handleMomentumScrollEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const offsetY = e.nativeEvent.contentOffset.y;
      const index = Math.round(offsetY / ITEM_HEIGHT);
      const clampedIndex = Math.max(0, Math.min(index, data.length - 1));
      isScrollingRef.current = false;
      if (clampedIndex !== selectedIndex) {
        onSelect(clampedIndex);
      }
    },
    [data.length, selectedIndex, onSelect]
  );

  const handleScrollBeginDrag = useCallback(() => {
    isScrollingRef.current = true;
  }, []);

  const handleScrollEndDrag = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const velocity = e.nativeEvent.velocity;
      if (!velocity || (velocity.x === 0 && velocity.y === 0)) {
        const offsetY = e.nativeEvent.contentOffset.y;
        const index = Math.round(offsetY / ITEM_HEIGHT);
        const clampedIndex = Math.max(0, Math.min(index, data.length - 1));
        isScrollingRef.current = false;
        if (clampedIndex !== selectedIndex) {
          onSelect(clampedIndex);
        }
      }
    },
    [data.length, selectedIndex, onSelect]
  );

  const getItemLayout = useCallback(
    (_: any, index: number) => ({
      length: ITEM_HEIGHT,
      offset: ITEM_HEIGHT * index,
      index,
    }),
    []
  );

  const renderItem = useCallback(
    ({ item, index }: { item: string | number; index: number }) => {
      const isSelected = index === activeValIndex;
      const distance = Math.abs(index - activeValIndex);
      const opacity = distance === 0 ? 1 : distance === 1 ? 0.45 : 0.2;
      const scale = distance === 0 ? 1 : distance === 1 ? 0.92 : 0.85;

      return (
        <View
          style={{
            height: ITEM_HEIGHT,
            justifyContent: 'center',
            alignItems: 'center',
            transform: [{ scale }],
            opacity,
          }}
        >
          <Text
            style={{
              fontSize: isSelected ? 17 : 15,
              fontWeight: isSelected ? '700' : '400',
              color: isSelected ? '#059669' : '#78716c',
            }}
          >
            {item}
          </Text>
        </View>
      );
    },
    [activeValIndex]
  );

  return (
    <View style={{ flex: 1, height: PICKER_HEIGHT }}>
      <FlatList
        ref={flatListRef}
        data={data}
        keyExtractor={(_, index) => index.toString()}
        renderItem={renderItem}
        getItemLayout={getItemLayout}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_HEIGHT}
        decelerationRate="fast"
        scrollEventThrottle={16}
        onScroll={handleScroll}
        onMomentumScrollEnd={handleMomentumScrollEnd}
        onScrollBeginDrag={handleScrollBeginDrag}
        onScrollEndDrag={handleScrollEndDrag}
        contentContainerStyle={{
          paddingTop: ITEM_HEIGHT * Math.floor(VISIBLE_ITEMS / 2),
          paddingBottom: ITEM_HEIGHT * Math.floor(VISIBLE_ITEMS / 2),
        }}
        initialScrollIndex={selectedIndex}
      />
    </View>
  );
}

export default function BirthdatePickerModal({
  visible,
  onClose,
  onConfirm,
  initialDate,
}: BirthdatePickerModalProps) {
  const defaultDate = initialDate || { year: END_YEAR, month: 1, day: 1 };

  const [selectedMonth, setSelectedMonth] = useState(defaultDate.month - 1);
  const [selectedDay, setSelectedDay] = useState(defaultDate.day - 1);
  const [selectedYear, setSelectedYear] = useState(
    YEARS.indexOf(defaultDate.year) !== -1 ? YEARS.indexOf(defaultDate.year) : 0
  );

  // Reset to initial date when modal opens
  useEffect(() => {
    if (visible && initialDate) {
      setSelectedMonth(initialDate.month - 1);
      setSelectedDay(initialDate.day - 1);
      const yearIdx = YEARS.indexOf(initialDate.year);
      setSelectedYear(yearIdx !== -1 ? yearIdx : 0);
    }
  }, [visible]);

  // Calculate days based on selected month + year
  const currentYear = YEARS[selectedYear] || END_YEAR;
  const currentMonth = selectedMonth + 1;
  const maxDays = getDaysInMonth(currentMonth, currentYear);
  const days = Array.from({ length: maxDays }, (_, i) => i + 1);

  // Clamp day if current selection exceeds max days
  useEffect(() => {
    if (selectedDay >= maxDays) {
      setSelectedDay(maxDays - 1);
    }
  }, [maxDays, selectedDay]);

  const handleConfirm = () => {
    onConfirm({
      year: YEARS[selectedYear],
      month: selectedMonth + 1,
      day: selectedDay + 1,
    });
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={{ flex: 1, justifyContent: 'flex-end' }}>
        {/* Backdrop */}
        <Pressable
          onPress={onClose}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
          }}
        />

        {/* Modal Sheet */}
        <View
          style={{
            backgroundColor: '#ffffff',
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
            paddingBottom: 36,
            maxHeight: SCREEN_HEIGHT * 0.5,
          }}
        >
          {/* Drag Handle */}
          <View style={{ alignItems: 'center', paddingTop: 12, paddingBottom: 4 }}>
            <View
              style={{
                width: 40,
                height: 4,
                borderRadius: 2,
                backgroundColor: '#d6d3d1',
              }}
            />
          </View>

          {/* Title */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              paddingVertical: 12,
              paddingHorizontal: 24,
              gap: 8,
            }}
          >
            <Calendar size={20} color="#059669" />
            <Text
              style={{
                fontSize: 18,
                fontWeight: '700',
                color: '#1c1917',
                fontFamily: 'Fredoka_700Bold',
              }}
            >
              Select Birthdate
            </Text>
          </View>

          {/* Picker Area */}
          <View style={{ paddingHorizontal: 20 }}>
            <View
              style={{
                flexDirection: 'row',
                height: PICKER_HEIGHT,
                position: 'relative',
              }}
            >
              {/* Center Highlight Bar */}
              <View
                style={{
                  position: 'absolute',
                  top: ITEM_HEIGHT * Math.floor(VISIBLE_ITEMS / 2),
                  left: 0,
                  right: 0,
                  height: ITEM_HEIGHT,
                  backgroundColor: 'rgba(5, 150, 105, 0.08)',
                  borderRadius: 12,
                  zIndex: -1,
                }}
              />

              <WheelColumn
                data={MONTHS}
                selectedIndex={selectedMonth}
                onSelect={setSelectedMonth}
              />
              <WheelColumn
                data={days}
                selectedIndex={selectedDay}
                onSelect={setSelectedDay}
              />
              <WheelColumn
                data={YEARS}
                selectedIndex={selectedYear}
                onSelect={setSelectedYear}
              />
            </View>
          </View>

          {/* Confirm Button */}
          <View style={{ paddingHorizontal: 24, paddingTop: 16 }}>
            <TouchableOpacity
              onPress={handleConfirm}
              activeOpacity={0.85}
              style={{
                backgroundColor: '#059669',
                paddingVertical: 16,
                borderRadius: 16,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
              }}
            >
              <Check size={20} color="#ffffff" />
              <Text
                style={{
                  color: '#ffffff',
                  fontSize: 16,
                  fontWeight: '700',
                  fontFamily: 'Fredoka_700Bold',
                  letterSpacing: 0.5,
                }}
              >
                Confirm
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
