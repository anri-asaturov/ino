import { Link } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

export default function NotFoundScreen() {
  return (
    <View style={styles.screen}>
      <Text style={styles.title}>Screen not found</Text>
      <Link href="/" style={styles.link}>
        Go home
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f7f7f2',
    gap: 16,
    padding: 24
  },
  title: {
    color: '#171a17',
    fontSize: 24,
    fontWeight: '700'
  },
  link: {
    color: '#1f6feb',
    fontSize: 17,
    fontWeight: '600'
  }
});
