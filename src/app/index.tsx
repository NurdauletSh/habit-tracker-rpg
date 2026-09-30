import * as Haptics from 'expo-haptics';
import { useEffect, useRef, useState } from 'react';
import { Alert, Animated, Dimensions, Easing, FlatList, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { supabase } from './supabase';

const { width, height } = Dimensions.get('window');

// Увеличиваем количество снежинок до 1000 для эпичного снегопада
const SNOWFLAKES_COUNT = 50;
const snowflakes = Array.from({ length: SNOWFLAKES_COUNT }).map(() => ({
  id: Math.random(),
  size: Math.floor(Math.random() * 12) + 8, // Разные размеры от маленьких до крупных
  leftPos: Math.random() * width,
  duration: Math.random() * 5000 + 3000, // Скорость падения
  delay: Math.random() * 6000, // Плавное появление по времени
  symbol: ['❄️', '❅', '❄', '٭'][Math.floor(Math.random() * 4)],
}));

export default function App() {
  const [session, setSession] = useState<any>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const [habits, setHabits] = useState<any[]>([]);
  const [newHabit, setNewHabit] = useState('');
  const [category, setCategory] = useState('Здоровье');
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all');

  const [xp, setXp] = useState(0);
  const [coins, setCoins] = useState(0);
  const [level, setLevel] = useState(1);
  const [activeTheme, setActiveTheme] = useState<'default' | 'cyberpunk' | 'forest' | 'newyear'>('newyear');
  const [inventory, setInventory] = useState<string[]>(['default', 'newyear']);
  const [activeTab, setActiveTab] = useState<'habits' | 'shop' | 'achievements' | 'stats' | 'social' | 'notes'>('habits');

  const [noteText, setNoteText] = useState('');
  const [selectedHabitId, setSelectedHabitId] = useState<number | null>(null);
  const [challenges, setChallenges] = useState<any[]>([]);
  const [newChallengeTitle, setNewChallengeTitle] = useState('');
  const [aiMotivation, setAiMotivation] = useState('');

  const achievementsList = [
    { id: 'first', title: '🌱 Первый шаг', desc: 'Выполните хотя бы 1 привычку', condition: (h: any[]) => h.filter(x => x.completed).length >= 1 },
    { id: 'streak7', title: '🔥 Железная воля', desc: 'Достигните стрика от 3 дней', condition: (h: any[]) => h.some(x => (x.streak || 0) >= 3) },
    { id: 'rich', title: '🪙 Накопитель', desc: 'Заработайте 50 монет', condition: () => coins >= 50 },
  ];

  const snowAnims = useRef(snowflakes.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    snowAnims.forEach((anim, index) => {
      const snowflake = snowflakes[index];
      Animated.loop(
        Animated.sequence([
          Animated.delay(snowflake.delay),
          Animated.timing(anim, {
            toValue: 1,
            duration: snowflake.duration,
            easing: Easing.linear,
            useNativeDriver: true,
          }),
        ])
      ).start();
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        fetchUserData(session.user.id);
        generateAiMessage();
      }
    });

    supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        fetchUserData(session.user.id);
        generateAiMessage();
      } else {
        setHabits([]);
        setXp(0);
        setCoins(0);
        setLevel(1);
      }
    });
  }, []);

  function generateAiMessage() {
    const hour = new Date().getHours();
    let greeting = '🎄 С наступающим Новым годом! Время творить чудеса.';
    if (hour < 12) greeting = '❄️ Доброе морозное утро! Сделай шаг навстречу новогодней цели.';
    else if (hour < 18) greeting = '🎁 Экватор дня! Твой новогодний стрик в безопасности?';
    else greeting = '✨ Новогодний вечер! Подведи итоги и заслужи подарок от Деда Мороза.';
    setAiMotivation(greeting);
  }

  async function signIn() {
    Haptics.selectionAsync();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) Alert.alert('Ошибка входа', error.message);
    setLoading(false);
  }

  async function signUp() {
    Haptics.selectionAsync();
    setLoading(true);
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) {
      Alert.alert('Ошибка регистрации', error.message);
    } else {
      await supabase.auth.signOut();
      Alert.alert('Регистрация успешна! 🎄', 'Аккаунт создан. Войдите в систему.');
    }
    setLoading(false);
  }

  async function signOut() {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    await supabase.auth.signOut();
  }

  async function fetchUserData(userId: string) {
    const { data: habitsData, error } = await supabase
      .from('habits')
      .select('*')
      .eq('user_id', userId);

    if (error) {
      if (error.code !== 'PGRST303') console.error('Ошибка загрузки:', error);
    } else {
      const loadedHabits = habitsData || [];
      setHabits(loadedHabits);

      const completedCount = loadedHabits.filter(h => h.completed).length;
      const totalXp = completedCount * 25;
      setXp(totalXp);
      setCoins(completedCount * 10);
      setLevel(Math.floor(totalXp / 100) + 1);
    }

    const { data: chalData } = await supabase.from('challenges').select('*');
    if (chalData) setChallenges(chalData);
  }

  async function addHabit() {
    if (!newHabit.trim() || !session) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const { data, error } = await supabase
      .from('habits')
      .insert([{ title: newHabit, completed: false, category: category, streak: 0, user_id: session.user.id }])
      .select();

    if (!error && data) {
      setHabits([...habits, data[0]]);
      setNewHabit('');
    }
  }

  async function toggleHabit(id: number, currentStatus: boolean, currentStreak: number) {
    const newStatus = !currentStatus;
    const newStreak = newStatus ? currentStreak + 1 : Math.max(0, currentStreak - 1);

    if (newStatus) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    const { error } = await supabase.from('habits').update({ completed: newStatus, streak: newStreak }).eq('id', id);

    if (!error) {
      const updatedHabits = habits.map((habit) => habit.id === id ? { ...habit, completed: newStatus, streak: newStreak } : habit);
      setHabits(updatedHabits);
      const completedCount = updatedHabits.filter(h => h.completed).length;
      setXp(completedCount * 25);
      setCoins(completedCount * 10);
      setLevel(Math.floor((completedCount * 25) / 100) + 1);
    }
  }

  async function deleteHabit(id: number) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const { error } = await supabase.from('habits').delete().eq('id', id);
    if (!error) {
      setHabits(habits.filter((habit) => habit.id !== id));
    }
  }

  async function addChallenge() {
    if (!newChallengeTitle.trim() || !session) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const { error } = await supabase.from('challenges').insert([{ title: newChallengeTitle, creator_id: session.user.id }]);
    if (!error) {
      setNewChallengeTitle('');
      fetchUserData(session.user.id);
    }
  }

  async function addNote() {
    if (!noteText.trim() || !selectedHabitId || !session) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const { error } = await supabase.from('habit_notes').insert([{ habit_id: selectedHabitId, user_id: session.user.id, note: noteText, date: new Date().toISOString() }]);
    if (!error) {
      Alert.alert('Успех!', 'Заметка и рефлексия сохранены.');
      setNoteText('');
      setSelectedHabitId(null);
    }
  }

  function buyTheme(themeName: 'cyberpunk' | 'forest' | 'newyear', cost: number) {
    if (coins < cost) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Недостаточно монет! 🪙');
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setCoins(coins - cost);
    setInventory([...inventory, themeName]);
    setActiveTheme(themeName);
    Alert.alert('Успешно!', 'Тема разблокирована.');
  }

  const getThemeStyles = () => {
    if (activeTheme === 'cyberpunk') return { bg: '#0f172a', cardBg: '#1e1b4b', text: '#38bdf8', button: '#a855f7', itemBg: '#312e81' };
    if (activeTheme === 'forest') return { bg: '#064e3b', cardBg: '#022c22', text: '#34d399', button: '#059669', itemBg: '#065f46' };
    if (activeTheme === 'newyear') return { bg: '#082f49', cardBg: '#0c4a6e', text: '#38bdf8', button: '#e11d48', itemBg: '#075985' };
    return { bg: '#f8fafc', cardBg: '#1e293b', text: '#1e293b', button: '#6366f1', itemBg: '#fff' };
  };

  const theme = getThemeStyles();
  const completedCount = habits.filter(h => h.completed).length;

  if (!session) {
    return (
      <View style={styles.authContainer}>
        <View style={styles.snowContainer} pointerEvents="none">
          {snowflakes.map((snowflake, index) => {
            const translateY = snowAnims[index].interpolate({
              inputRange: [0, 1],
              outputRange: [-50, height + 50],
            });
            const translateX = snowAnims[index].interpolate({
              inputRange: [0, 0.5, 1],
              outputRange: [0, 15, -15],
            });
            return (
              <Animated.Text key={snowflake.id} style={[styles.snowflake, { left: snowflake.leftPos, fontSize: snowflake.size, transform: [{ translateY }, { translateX }] }]}>
                {snowflake.symbol}
              </Animated.Text>
            );
          })}
        </View>

        <Text style={styles.header}>🎄 Новогодний RPG-Трекер</Text>
        <TextInput style={styles.input} placeholder="Email" placeholderTextColor="#888" value={email} onChangeText={setEmail} autoCapitalize="none" />
        <TextInput style={styles.input} placeholder="Пароль" placeholderTextColor="#888" value={password} onChangeText={setPassword} secureTextEntry autoCapitalize="none" />
        <TouchableOpacity style={styles.button} onPress={signIn} disabled={loading}><Text style={styles.buttonText}>Войти в сказку</Text></TouchableOpacity>
        <TouchableOpacity style={[styles.button, styles.secondaryButton]} onPress={signUp} disabled={loading}><Text style={[styles.buttonText, { color: '#e11d48' }]}>Создать персонажа</Text></TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      {activeTheme === 'newyear' && (
        <View style={styles.snowContainer} pointerEvents="none">
          {snowflakes.map((snowflake, index) => {
            const translateY = snowAnims[index].interpolate({
              inputRange: [0, 1],
              outputRange: [-50, height + 50],
            });
            const translateX = snowAnims[index].interpolate({
              inputRange: [0, 0.5, 1],
              outputRange: [0, 15, -15],
            });

            return (
              <Animated.Text
                key={snowflake.id}
                style={[
                  styles.snowflake,
                  {
                    left: snowflake.leftPos,
                    fontSize: snowflake.size,
                    transform: [{ translateY }, { translateX }],
                  },
                ]}
              >
                {snowflake.symbol}
              </Animated.Text>
            );
          })}
        </View>
      )}

      <View style={styles.topBar}>
        <Text style={[styles.header, { color: activeTheme !== 'default' ? '#fff' : '#1e293b' }]}>🎄 Новогодний Трекер</Text>
        <TouchableOpacity onPress={signOut} style={styles.logoutBtn}><Text style={styles.logoutText}>Выход</Text></TouchableOpacity>
      </View>

      <View style={styles.aiCard}>
        <Text style={styles.aiTitle}>🎅 Новогодний Эльф</Text>
        <Text style={styles.aiText}>{aiMotivation}</Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.navScroll}>
        <TouchableOpacity onPress={() => { Haptics.selectionAsync(); setActiveTab('habits'); }} style={[styles.tabBtn, activeTab === 'habits' && styles.activeTab]}><Text style={styles.tabText}>Квесты</Text></TouchableOpacity>
        <TouchableOpacity onPress={() => { Haptics.selectionAsync(); setActiveTab('shop'); }} style={[styles.tabBtn, activeTab === 'shop' && styles.activeTab]}><Text style={styles.tabText}>Магазин</Text></TouchableOpacity>
        <TouchableOpacity onPress={() => { Haptics.selectionAsync(); setActiveTab('achievements'); }} style={[styles.tabBtn, activeTab === 'achievements' && styles.activeTab]}><Text style={styles.tabText}>Ачивки</Text></TouchableOpacity>
        <TouchableOpacity onPress={() => { Haptics.selectionAsync(); setActiveTab('stats'); }} style={[styles.tabBtn, activeTab === 'stats' && styles.activeTab]}><Text style={styles.tabText}>Теплокарта</Text></TouchableOpacity>
        <TouchableOpacity onPress={() => { Haptics.selectionAsync(); setActiveTab('social'); }} style={[styles.tabBtn, activeTab === 'social' && styles.activeTab]}><Text style={styles.tabText}>Челленджи</Text></TouchableOpacity>
        <TouchableOpacity onPress={() => { Haptics.selectionAsync(); setActiveTab('notes'); }} style={[styles.tabBtn, activeTab === 'notes' && styles.activeTab]}><Text style={styles.tabText}>Заметки</Text></TouchableOpacity>
      </ScrollView>

      {activeTab === 'habits' && (
        <View style={{ flex: 1 }}>
          <TextInput style={styles.input} placeholder="Новый новогодний квест..." placeholderTextColor="#888" value={newHabit} onChangeText={setNewHabit} />
          <TouchableOpacity style={[styles.button, { backgroundColor: theme.button }]} onPress={addHabit}><Text style={styles.buttonText}>Добавить квест</Text></TouchableOpacity>

          <FlatList
            data={habits}
            keyExtractor={(item) => item.id.toString()}
            renderItem={({ item }) => (
              <View style={[styles.habitItem, { backgroundColor: theme.itemBg }]}>
                <TouchableOpacity style={[styles.checkbox, item.completed && { backgroundColor: theme.button }]} onPress={() => toggleHabit(item.id, item.completed, item.streak || 0)}>
                  {item.completed && <Text style={styles.checkmark}>✓</Text>}
                </TouchableOpacity>
                <View style={styles.habitInfo}>
                  <Text style={[styles.habitText, activeTheme === 'newyear' && { color: '#fff' }, item.completed && styles.completedText]}>{item.title}</Text>
                  <Text style={styles.streakText}>🔥 Стрик: {item.streak || 0}</Text>
                </View>
                <TouchableOpacity onPress={() => { Haptics.selectionAsync(); setSelectedHabitId(item.id); setActiveTab('notes'); }}>
                  <Text style={{ fontSize: 16 }}>📝</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => deleteHabit(item.id)}><Text style={styles.deleteText}>🗑</Text></TouchableOpacity>
              </View>
            )}
          />
        </View>
      )}

      {activeTab === 'shop' && (
        <ScrollView style={{ flex: 1 }}>
          <Text style={[styles.sectionTitle, activeTheme !== 'default' && { color: '#fff' }]}>🛒 Новогодний Магазин (Баланс: 🪙 {coins})</Text>
          <TouchableOpacity style={styles.shopItem} onPress={() => buyTheme('newyear', 0)}>
            <Text style={styles.shopTitle}>🎄 Тема «Новый год» (Бесплатно)</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.shopItem} onPress={() => buyTheme('cyberpunk', 30)}>
            <Text style={styles.shopTitle}>⚡ Тема «Киберпанк» (30 🪙)</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.shopItem} onPress={() => buyTheme('forest', 30)}>
            <Text style={styles.shopTitle}>🌲 Тема «Лесной дзен» (30 🪙)</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.shopItem} onPress={() => { Haptics.selectionAsync(); setActiveTheme('default'); }}>
            <Text style={styles.shopTitle}>☀ Стандартная тема</Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      {activeTab === 'achievements' && (
        <ScrollView style={{ flex: 1 }}>
          <Text style={[styles.sectionTitle, activeTheme !== 'default' && { color: '#fff' }]}>🏆 Новогодние Достижения</Text>
          {achievementsList.map((ach) => (
            <View key={ach.id} style={[styles.achCard, ach.condition(habits) ? styles.achUnlocked : styles.achLocked]}>
              <Text style={styles.achTitle}>{ach.title}</Text>
              <Text style={styles.achDesc}>{ach.desc}</Text>
            </View>
          ))}
        </ScrollView>
      )}

      {activeTab === 'stats' && (
        <ScrollView style={{ flex: 1 }}>
          <Text style={[styles.sectionTitle, activeTheme !== 'default' && { color: '#fff' }]}>📈 Новогодняя теплокарта</Text>
          <View style={styles.heatmapCard}>
            <Text style={styles.heatSubtitle}>Ваша праздничная активность:</Text>
            <View style={styles.gridRow}>
              {[...Array(28)].map((_, i) => (
                <View key={i} style={[styles.heatBox, i < completedCount * 4 ? styles.heatActive : styles.heatInactive]} />
              ))}
            </View>
            <Text style={{ marginTop: 10, fontSize: 12, color: '#64748b' }}>Выполнено квестов: {completedCount}</Text>
          </View>
        </ScrollView>
      )}

      {activeTab === 'social' && (
        <ScrollView style={{ flex: 1 }}>
          <Text style={[styles.sectionTitle, activeTheme !== 'default' && { color: '#fff' }]}>👥 Новогодние Челленджи</Text>
          <TextInput style={styles.input} placeholder="Название челленджа..." placeholderTextColor="#888" value={newChallengeTitle} onChangeText={setNewChallengeTitle} />
          <TouchableOpacity style={[styles.button, { backgroundColor: theme.button }]} onPress={addChallenge}><Text style={styles.buttonText}>Создать челлендж</Text></TouchableOpacity>
          {challenges.map((c) => (
            <View key={c.id} style={styles.shopItem}>
              <Text style={styles.shopTitle}>🎁 {c.title}</Text>
              <Text style={styles.shopDesc}>Статус: Активен в Supabase</Text>
            </View>
          ))}
        </ScrollView>
      )}

      {activeTab === 'notes' && (
        <ScrollView style={{ flex: 1 }}>
          <Text style={[styles.sectionTitle, activeTheme !== 'default' && { color: '#fff' }]}>📝 Праздничный Дневник</Text>
          <Text style={{ fontSize: 12, color: '#94a3b8', marginBottom: 10 }}>Выбран ID привычки: {selectedHabitId || 'Не выбрана'}</Text>
          <TextInput style={[styles.input, { height: 80 }]} placeholder="Запишите новогоднее обещание или заметку..." placeholderTextColor="#888" multiline value={noteText} onChangeText={setNoteText} />
          <TouchableOpacity style={[styles.button, { backgroundColor: theme.button }]} onPress={addNote}><Text style={styles.buttonText}>Сохранить заметку</Text></TouchableOpacity>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 40, paddingHorizontal: 15 },
  snowContainer: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 99, pointerEvents: 'none' },
  snowflake: { position: 'absolute', opacity: 0.7 },
  authContainer: { flex: 1, backgroundColor: '#082f49', justifyContent: 'center', paddingHorizontal: 30 },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  header: { fontSize: 20, fontWeight: 'bold' },
  aiCard: { backgroundColor: '#bae6fd', padding: 12, borderRadius: 10, marginBottom: 10, borderWidth: 1, borderColor: '#7dd3fc' },
  aiTitle: { fontSize: 13, fontWeight: 'bold', color: '#0369a1', marginBottom: 2 },
  aiText: { fontSize: 12, color: '#0369a1' },
  navScroll: { maxHeight: 45, marginBottom: 10 },
  tabBtn: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 6, backgroundColor: '#e2e8f0', marginRight: 8, height: 35 },
  activeTab: { backgroundColor: '#e11d48' },
  tabText: { fontSize: 12, fontWeight: 'bold', color: '#334155' },
  input: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, paddingHorizontal: 15, height: 42, backgroundColor: '#fff', marginBottom: 10 },
  button: { justifyContent: 'center', alignItems: 'center', paddingVertical: 10, borderRadius: 8, marginBottom: 10 },
  buttonText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  secondaryButton: { backgroundColor: 'transparent', borderWidth: 1, borderColor: '#e11d48' },
  logoutBtn: { paddingVertical: 5, paddingHorizontal: 10, backgroundColor: '#ef4444', borderRadius: 6 },
  logoutText: { color: '#fff', fontSize: 11, fontWeight: 'bold' },
  habitItem: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 10, marginBottom: 8, borderWidth: 1, borderColor: '#cbd5e1' },
  checkbox: { width: 24, height: 24, borderWidth: 2, borderColor: '#e11d48', borderRadius: 6, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  checkmark: { color: '#fff', fontWeight: 'bold' },
  habitInfo: { flex: 1 },
  habitText: { fontSize: 15, fontWeight: '500', color: '#1e293b' },
  completedText: { textDecorationLine: 'line-through', color: '#94a3b8' },
  streakText: { fontSize: 11, color: '#f59e0b', fontWeight: '600', marginTop: 2 },
  deleteText: { fontSize: 16, paddingLeft: 8 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 10, color: '#1e293b' },
  shopItem: { backgroundColor: '#fff', padding: 12, borderRadius: 10, marginBottom: 8, borderWidth: 1, borderColor: '#cbd5e1' },
  shopTitle: { fontSize: 14, fontWeight: 'bold', color: '#1e293b' },
  shopDesc: { fontSize: 11, color: '#64748b' },
  achCard: { padding: 10, borderRadius: 8, marginBottom: 8, borderWidth: 1 },
  achUnlocked: { backgroundColor: '#dcfce7', borderColor: '#86efac' },
  achLocked: { backgroundColor: '#f1f5f9', borderColor: '#cbd5e1' },
  achTitle: { fontSize: 13, fontWeight: 'bold', color: '#1e293b' },
  achDesc: { fontSize: 11, color: '#64748b' },
  heatmapCard: { backgroundColor: '#fff', padding: 15, borderRadius: 10, borderWidth: 1, borderColor: '#cbd5e1' },
  heatSubtitle: { fontSize: 12, color: '#64748b', marginBottom: 10 },
  gridRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  heatBox: { width: 22, height: 22, borderRadius: 4 },
  heatActive: { backgroundColor: '#22c55e' },
  heatInactive: { backgroundColor: '#e2e8f0' },
});