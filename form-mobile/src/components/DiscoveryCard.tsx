import { useFocusEffect } from 'expo-router';
import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler';
import Animated, { cancelAnimation, Easing, interpolate, useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { scheduleOnRN, scheduleOnUI } from 'react-native-worklets';
import type { Product, ReviewStatus } from '../domain/types';
import { swipeDecision, swipeExitVector, verticalDragOffset } from '../domain/discoveryGesture';
import { useReduceMotion } from '../hooks/useReduceMotion';
import { colors } from '../theme/tokens';
import { family } from '../theme/typography';
import { tactile } from '../utils/haptics';
import { DiscoveryCardFace } from './DiscoveryCardFace';

interface Props {
  product: Product; reason: string; cardHeight: number;
  canUndo: boolean; onUndo: () => void;
  onOpen: () => void; onReview: (status: ReviewStatus) => void;
}
export function DiscoveryCard({ product, reason, cardHeight, canUndo, onUndo, onOpen, onReview }: Props) {
  const { width, height } = useWindowDimensions();
  const reduced = useReduceMotion();
  const pose = useSharedValue({ x: 0, y: 0, tilt: 0 });
  const originX = useSharedValue(0), originY = useSharedValue(0);
  const touchX = useSharedValue(0), touchY = useSharedValue(0);
  const locked = useSharedValue(false), dragging = useSharedValue(false), focused = useSharedValue(true), epoch = useSharedValue(0);
  const alive = useRef(true);
  const latest = useRef({ productId: product.id, onReview });
  const [pending, setPending] = useState<string | null>(null);
  const busy = pending === product.id;
  useLayoutEffect(() => { latest.current = { productId: product.id, onReview }; }, [product.id, onReview]);

  const restore = useCallback(() => {
    'worklet';
    epoch.set(epoch.get() + 1);
    cancelAnimation(pose);
    pose.set({ x: 0, y: 0, tilt: 0 });
    originX.set(0); originY.set(0);
    locked.set(false); dragging.set(false);
  }, [dragging, epoch, locked, originX, originY, pose]);
  useFocusEffect(useCallback(() => {
    alive.current = true;
    focused.set(true);
    scheduleOnUI(restore);
    setPending(null);
    return () => {
      alive.current = false;
      focused.set(false);
      scheduleOnUI(restore);
    };
  }, [focused, restore]));
  useLayoutEffect(() => { scheduleOnUI(restore); }, [product.id, reduced, restore]);

  const beginDecision = useCallback((status: ReviewStatus, productId: string, token: number) => {
    if (!alive.current || latest.current.productId !== productId || epoch.get() !== token) return;
    setPending(productId);
    tactile(status === 'saved' ? 'saved' : 'soft');
  }, [epoch]);
  const commitDecision = useCallback((status: ReviewStatus, productId: string, token: number) => {
    if (!alive.current || latest.current.productId !== productId || epoch.get() !== token) return;
    setPending(null);
    latest.current.onReview(status);
  }, [epoch]);
  const settle = () => {
    'worklet';
    if (reduced) { pose.set({ x: 0, y: 0, tilt: 0 }); return; }
    const spring = { stiffness: 320, damping: 32, mass: 0.8, overshootClamping: true };
    pose.set(withSpring({ x: 0, y: 0, tilt: 0 }, spring));
  };
  const launch = (status: ReviewStatus, dx: number, dy: number, velocity: number) => {
    'worklet';
    if (locked.get() || !focused.get()) return;
    locked.set(true);
    const token = epoch.get();
    scheduleOnRN(beginDecision, status, product.id, token);
    if (reduced) { scheduleOnRN(commitDecision, status, product.id, token); return; }
    const travel = swipeExitVector(dx, dy, width, height);
    const duration = Math.max(200, Math.min(300, Math.hypot(travel.x, travel.y) / Math.max(1.8, velocity)));
    const timing = { duration, easing: Easing.out(Easing.quad) };
    pose.set(withTiming({ x: pose.get().x + travel.x, y: pose.get().y + travel.y, tilt: status === 'saved' ? 16 : -16 }, timing, finished => {
      if (finished && focused.get() && epoch.get() === token) scheduleOnRN(commitDecision, status, product.id, token);
    }));
  };
  // Recognition, tracking, return and exit all run on the UI thread. JavaScript
  // only receives the decision/haptic events, never individual drag frames.
  const pan = usePanGesture({
    enabled: focused, activeOffsetX: [-8, 8], failOffsetY: [-28, 28], maxPointers: 1,
    onTouchesDown: event => {
      'worklet';
      const touch = event.changedTouches[0];
      if (touch && !locked.get()) {
        touchX.set(touch.absoluteX); touchY.set(touch.absoluteY);
        dragging.set(false);
      }
    },
    onTouchesMove: event => {
      'worklet';
      const touch = event.changedTouches[0];
      if (touch && !locked.get() && Math.hypot(touch.absoluteX - touchX.get(), touch.absoluteY - touchY.get()) > 8) dragging.set(true);
    },
    onBegin: () => {
      'worklet';
      if (!locked.get()) dragging.set(false);
    },
    onActivate: () => {
      'worklet';
      if (locked.get()) return;
      cancelAnimation(pose);
      originX.set(pose.get().x); originY.set(pose.get().y);
      dragging.set(true);
    },
    onUpdate: event => {
      'worklet';
      if (locked.get()) return;
      const nextX = reduced ? 0 : originX.get() + event.translationX;
      pose.set({
        x: nextX,
        y: reduced ? 0 : Math.max(-14, Math.min(14, originY.get() + verticalDragOffset(event.translationY))),
        tilt: reduced ? 0 : Math.max(-5, Math.min(5, nextX / width * 5)),
      });
    },
    onDeactivate: event => {
      'worklet';
      if (locked.get()) return;
      const status = event.canceled ? null : swipeDecision(event.translationX, event.translationY, width - 40);
      if (status) launch(status, event.translationX, event.translationY, Math.hypot(event.velocityX, event.velocityY) / 1000);
      else settle();
    },
    onFinalize: event => {
      'worklet';
      if (event.canceled && dragging.get() && !locked.get()) settle();
    },
  });
  const frontMotion = useAnimatedStyle(() => ({ transform: [{ translateX: pose.get().x }, { translateY: pose.get().y }, { rotate: `${pose.get().tilt}deg` }] }));
  const saveMotion = useAnimatedStyle(() => ({ opacity: interpolate(pose.get().x, [20, 95], [0, 1], 'clamp') }));
  const passMotion = useAnimatedStyle(() => ({ opacity: interpolate(pose.get().x, [-95, -20], [1, 0], 'clamp') }));
  const canPress = () => !dragging.get() && !locked.get();
  return <View>
    <GestureDetector gesture={pan}>
      <Animated.View renderToHardwareTextureAndroid shouldRasterizeIOS style={frontMotion}>
        <DiscoveryCardFace key={product.id} product={product} reason={reason} cardHeight={cardHeight} interactive busy={busy}
          canUndo={canUndo}
          onOpen={() => { if (canPress()) onOpen(); }} onUndo={() => { if (canPress()) onUndo(); }}
          onReview={status => { if (canPress()) scheduleOnUI(launch, status, status === 'saved' ? 1 : -1, 0, 0); }}>
          <Animated.View renderToHardwareTextureAndroid shouldRasterizeIOS pointerEvents="none" style={[styles.feedback, styles.saveFeedback, saveMotion]}><Text style={[styles.feedbackText, styles.saveFeedbackText]}>SAVE</Text></Animated.View>
          <Animated.View renderToHardwareTextureAndroid shouldRasterizeIOS pointerEvents="none" style={[styles.feedback, styles.passFeedback, passMotion]}><Text style={[styles.feedbackText, styles.passFeedbackText]}>PASS</Text></Animated.View>
        </DiscoveryCardFace>
      </Animated.View>
    </GestureDetector>
  </View>;
}
const styles = StyleSheet.create({
  feedback: { position: 'absolute', top: 76, borderWidth: 2, borderRadius: 8, paddingHorizontal: 16, paddingVertical: 7, backgroundColor: colors.card },
  saveFeedback: { left: 24, borderColor: '#68735F', transform: [{ rotate: '-12deg' }] },
  passFeedback: { right: 24, borderColor: '#9B6F61', transform: [{ rotate: '12deg' }] },
  feedbackText: { fontFamily: family.sansMedium, fontSize: 26, letterSpacing: 2 },
  saveFeedbackText: { color: '#68735F' },
  passFeedbackText: { color: '#9B6F61' },
});
