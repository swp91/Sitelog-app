import { Tabs } from 'expo-router';
import { Platform } from 'react-native';
import { LayoutDashboard, Briefcase, Calendar, Coins, Menu } from 'lucide-react-native';
import { useColorScheme } from '@/components/useColorScheme';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const activeColor = '#2563eb'; // SiteLog 브랜드 컬러인 blue-600 적용

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: activeColor,
        tabBarInactiveTintColor: colorScheme === 'dark' ? '#94a3b8' : '#64748b',
        tabBarStyle: {
          borderTopWidth: 1,
          borderTopColor: colorScheme === 'dark' ? '#1e293b' : '#e2e8f0',
          backgroundColor: colorScheme === 'dark' ? '#0f172a' : '#ffffff',
          height: Platform.OS === 'ios' ? 88 : 64,
          paddingBottom: Platform.OS === 'ios' ? 28 : 10,
          paddingTop: 8,
        },
        headerShown: true,
        headerStyle: {
          backgroundColor: colorScheme === 'dark' ? '#0f172a' : '#ffffff',
          shadowOpacity: 0,
          elevation: 0,
          borderBottomWidth: 1,
          borderBottomColor: colorScheme === 'dark' ? '#1e293b' : '#e2e8f0',
        },
        headerTitleStyle: {
          fontWeight: '700',
          fontSize: 18,
          color: colorScheme === 'dark' ? '#f8fafc' : '#0f172a',
        },
        headerTitleAlign: 'center',
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: '홈 요약',
          tabBarLabel: '홈',
          tabBarIcon: ({ color }) => (
            <LayoutDashboard color={color} size={22} />
          ),
        }}
      />
      <Tabs.Screen
        name="sites"
        options={{
          title: '현장 목록',
          tabBarLabel: '현장',
          tabBarIcon: ({ color }) => (
            <Briefcase color={color} size={22} />
          ),
        }}
      />
      <Tabs.Screen
        name="calendar"
        options={{
          title: '통합 일정',
          tabBarLabel: '달력',
          tabBarIcon: ({ color }) => (
            <Calendar color={color} size={22} />
          ),
        }}
      />
      <Tabs.Screen
        name="payroll"
        options={{
          title: '노무비 계산',
          tabBarLabel: '노무비',
          tabBarIcon: ({ color }) => (
            <Coins color={color} size={22} />
          ),
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: '더 보기',
          tabBarLabel: '더보기',
          tabBarIcon: ({ color }) => (
            <Menu color={color} size={22} />
          ),
        }}
      />
    </Tabs>
  );
}
