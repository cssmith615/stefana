import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Colors, Typography, Spacing, Radius } from '../../theme';
import { OnboardingStackParams } from '../../navigation';

type Props = {
  navigation: NativeStackNavigationProp<OnboardingStackParams, 'OnboardingWelcome'>;
};

const { height } = Dimensions.get('window');

export default function OnboardingWelcomeScreen({ navigation }: Props) {
  return (
    <SafeAreaView style={styles.safe}>
      <LinearGradient
        colors={['#FDFAF8', '#FAF0E8', '#F5E6D8']}
        style={styles.gradient}
      >
        <View style={styles.container}>
          {/* Top decorative ring */}
          <View style={styles.ringOuter}>
            <View style={styles.ringInner}>
              <Text style={styles.ringEmoji}>💍</Text>
            </View>
          </View>

          {/* Wordmark */}
          <Text style={styles.wordmark}>Stefana</Text>
          <Text style={styles.tagline}>Your wedding, beautifully planned.</Text>

          {/* Feature list */}
          <View style={styles.features}>
            {[
              { emoji: '✅', text: 'Smart timeline checklist' },
              { emoji: '💰', text: 'Budget tracker by category' },
              { emoji: '🌸', text: 'Vendor management' },
              { emoji: '🤖', text: 'AI planning assistant' },
            ].map((f, i) => (
              <View key={i} style={styles.featureRow}>
                <Text style={styles.featureEmoji}>{f.emoji}</Text>
                <Text style={styles.featureText}>{f.text}</Text>
              </View>
            ))}
          </View>

          {/* CTA */}
          <TouchableOpacity
            style={styles.button}
            onPress={() => navigation.navigate('OnboardingEventDate', { eventType: 'wedding' })}
            activeOpacity={0.85}
          >
            <Text style={styles.buttonText}>Let's Plan Your Wedding</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  gradient: { flex: 1 },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xxxl,
  },
  ringOuter: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xl,
  },
  ringInner: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.cream,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringEmoji: { fontSize: 36 },
  wordmark: {
    fontSize: Typography.sizes.display,
    fontWeight: Typography.weights.black,
    color: Colors.primary,
    letterSpacing: 3,
    marginBottom: Spacing.sm,
  },
  tagline: {
    fontSize: Typography.sizes.md,
    color: Colors.textSecondary,
    fontStyle: 'italic',
    marginBottom: Spacing.xxxl,
  },
  features: {
    width: '100%',
    marginBottom: Spacing.xxxl,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
    backgroundColor: Colors.white,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radius.md,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 1,
  },
  featureEmoji: { fontSize: 20, marginRight: Spacing.md },
  featureText: {
    fontSize: Typography.sizes.md,
    color: Colors.textPrimary,
    fontWeight: Typography.weights.medium,
  },
  button: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.full,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.xxxl,
    width: '100%',
    alignItems: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonText: {
    color: Colors.white,
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.bold,
    letterSpacing: 0.5,
  },
});
