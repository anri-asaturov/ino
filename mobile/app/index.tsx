import { StyleSheet, Text, View } from 'react-native';

export default function HomeScreen() {
  return (
    <View style={styles.screen}>
      <View style={styles.panel}>
        <Text style={styles.eyebrow}>Ino Mobile</Text>
        <Text style={styles.title}>Test task scaffold</Text>
        <Text style={styles.copy}>
          This app is intentionally empty. Add mobile screens here only if the task needs them.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f7f7f2',
    padding: 24
  },
  panel: {
    width: '100%',
    maxWidth: 420,
    gap: 12
  },
  eyebrow: {
    color: '#58605a',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0,
    textTransform: 'uppercase'
  },
  title: {
    color: '#171a17',
    fontSize: 34,
    fontWeight: '800',
    letterSpacing: 0
  },
  copy: {
    color: '#3f463f',
    fontSize: 17,
    lineHeight: 25
  }
});
