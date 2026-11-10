import { useState } from 'react';
import { Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import CounterScreen from './src/screens/CounterScreen';
import TodoScreen from './src/screens/TodoScreen';

type Tab = 'counter' | 'todo';

export default function App() {
  const [tab, setTab] = useState<Tab>('counter');
  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.tabs}>
        <Pressable
          testID="tab-counter"
          style={[styles.tab, tab === 'counter' && styles.tabActive]}
          onPress={() => setTab('counter')}
        >
          <Text style={[styles.tabText, tab === 'counter' && styles.tabTextActive]}>
            01-A Contador
          </Text>
        </Pressable>
        <Pressable
          testID="tab-todo"
          style={[styles.tab, tab === 'todo' && styles.tabActive]}
          onPress={() => setTab('todo')}
        >
          <Text style={[styles.tabText, tab === 'todo' && styles.tabTextActive]}>02-B To-Do</Text>
        </Pressable>
      </View>
      {tab === 'counter' ? <CounterScreen /> : <TodoScreen />}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fff', paddingTop: 28 },
  tabs: { flexDirection: 'row', borderBottomWidth: 1, borderColor: '#D9DEE8' },
  tab: { flex: 1, paddingVertical: 14, alignItems: 'center' },
  tabActive: { borderBottomWidth: 3, borderColor: '#3461FF' },
  tabText: { color: '#5B6475', fontWeight: '600' },
  tabTextActive: { color: '#3461FF' },
});
