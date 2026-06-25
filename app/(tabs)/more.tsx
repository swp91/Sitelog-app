import React, { useState } from 'react'
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Modal,
  TextInput,
  Switch,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Dimensions,
  useColorScheme
} from 'react-native'
import { useAppStore } from '../../stores/app-store'
import { useRouter } from 'expo-router'
import { LogOut, RefreshCcw, Bell, Moon, Sun, ChevronRight, User, Settings, X, ShieldAlert } from 'lucide-react-native'

export default function MoreScreen() {
  const {
    user,
    sites,
    records,
    logout,
    updateProfile,
    switchUserType,
    flash,
    theme,
    toggleTheme
  } = useAppStore()
  
  const router = useRouter()
  const colorScheme = useColorScheme()
  const isDark = colorScheme === 'dark'

  const [alerts, setAlerts] = useState({
    missing: true,
    weekly: false,
    trade: true,
  })

  // Profile Edit Modal State
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [editName, setEditName] = useState('')
  const [editPhone, setEditPhone] = useState('')
  const [editBank, setEditBank] = useState('')
  const [editAccount, setEditAccount] = useState('')
  const [editHolder, setEditHolder] = useState('')
  const [saving, setSaving] = useState(false)

  const totalEntries = Object.keys(records).length
  const activeSiteCount = sites.filter((s) => s.status !== '완료').length
  const nextType = user.type === 'worker' ? 'manager' : 'worker'
  const nextLabel = user.type === 'worker' ? '관리자 모드로 전환' : '노동자 모드로 전환'

  async function handleLogout() {
    Alert.alert(
      '로그아웃',
      '정말 로그아웃 하시겠습니까?',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '확인',
          onPress: async () => {
            await logout()
            flash('로그아웃 되었습니다.')
            router.replace('/(auth)/login')
          }
        }
      ]
    )
  }

  function handleSwitchType() {
    switchUserType(nextType)
    flash(nextLabel)
    // 실제 다이어리 화면 분기를 할 때 라우터 리다이렉트 처리
    // 여기서는 탭 변경 메시지로 대체
  }

  function handleOpenEdit() {
    setEditName(user.name || '')
    setEditPhone(user.phone || '')
    setEditBank(user.bank || '')
    setEditAccount(user.account || '')
    setEditHolder(user.holder || '')
    setIsEditOpen(true)
  }

  async function handleSaveProfile() {
    if (!editName.trim()) {
      Alert.alert('오류', '이름을 입력하세요.')
      return
    }
    setSaving(true)
    try {
      await updateProfile({
        name: editName.trim(),
        phone: editPhone.trim() || undefined,
        bank: editBank.trim(),
        account: editAccount.trim(),
        holder: editHolder.trim(),
      })
      flash('프로필이 수정되었습니다.')
      setIsEditOpen(false)
    } catch (err: any) {
      Alert.alert('오류', err.message || '프로필 수정에 실패했습니다.')
    } finally {
      setSaving(false)
    }
  }

  const themeContainerStyle = isDark ? styles.darkContainer : styles.lightContainer
  const themeCardStyle = isDark ? styles.darkCard : styles.lightCard
  const themeTextStyle = isDark ? styles.darkText : styles.lightText
  const themeBorderColor = isDark ? '#334155' : '#e2e8f0'

  return (
    <SafeAreaView style={[styles.container, themeContainerStyle]}>
      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        
        {/* 1. Profile & Info Card */}
        <View style={[styles.card, themeCardStyle]}>
          <View style={styles.profileHeader}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{user.avatar || 'U'}</Text>
            </View>
            <View style={styles.profileInfo}>
              <View style={styles.nameRow}>
                <Text style={[styles.profileName, themeTextStyle]}>{user.name || '사용자'}</Text>
                <View style={[
                  styles.roleBadge, 
                  { backgroundColor: user.type === 'worker' ? '#fef3c7' : '#dbeafe' }
                ]}>
                  <Text style={[
                    styles.roleBadgeText, 
                    { color: user.type === 'worker' ? '#d97706' : '#2563eb' }
                  ]}>
                    {user.type === 'worker' ? '노동자' : '관리자'}
                  </Text>
                </View>
              </View>
              <Text style={styles.profileEmail} numberOfLines={1}>{user.email || '이메일 정보 없음'}</Text>
            </View>
            <TouchableOpacity
              style={styles.editBtn}
              onPress={handleOpenEdit}
              activeOpacity={0.7}
            >
              <Text style={styles.editBtnText}>편집</Text>
            </TouchableOpacity>
          </View>

          {/* User statistics summary */}
          <View style={[styles.statsRow, { borderTopColor: themeBorderColor }]}>
            <View style={styles.statCol}>
              <Text style={styles.statVal}>{activeSiteCount}</Text>
              <Text style={styles.statLabel}>담당 현장</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: themeBorderColor }]} />
            <View style={styles.statCol}>
              <Text style={styles.statVal}>{totalEntries}</Text>
              <Text style={styles.statLabel}>누적 입력</Text>
            </View>
            {user.joined ? (
              <>
                <View style={[styles.statDivider, { backgroundColor: themeBorderColor }]} />
                <View style={styles.statCol}>
                  <Text style={[styles.statVal, styles.statValDate]}>{user.joined}</Text>
                  <Text style={styles.statLabel}>가입일</Text>
                </View>
              </>
            ) : null}
          </View>
        </View>

        {/* 2. Switch Mode Action Button */}
        <View style={[styles.card, themeCardStyle]}>
          <View style={styles.cardHeaderIconRow}>
            <View style={[styles.headerIconBg, { backgroundColor: '#eff6ff' }]}>
              <RefreshCcw size={18} stroke="#2563eb" />
            </View>
            <View style={styles.headerIconTextGroup}>
              <Text style={[styles.cardSectionTitle, themeTextStyle]}>모드 전환</Text>
              <Text style={styles.cardSectionSubtitle}>관리자용 현장 목록과 노동자 장부를 바르게 전환합니다.</Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.switchButton}
            onPress={handleSwitchType}
            activeOpacity={0.8}
          >
            <RefreshCcw size={14} stroke="#2563eb" style={styles.switchButtonIcon} />
            <Text style={styles.switchButtonText}>{nextLabel}</Text>
          </TouchableOpacity>
        </View>

        {/* 3. Screen Theme & Account Info Lists */}
        <Text style={styles.listSectionLabel}>계정 및 화면 설정</Text>
        <View style={[styles.card, themeCardStyle, styles.noPaddingCard]}>
          
          {/* Theme setting row */}
          <View style={[styles.listItem, { borderBottomColor: themeBorderColor }]}>
            <View style={styles.listItemLeft}>
              <View style={styles.listItemIconBg}>
                {theme === 'dark' ? <Moon size={16} stroke="#d97706" /> : <Sun size={16} stroke="#ea580c" />}
              </View>
              <View>
                <Text style={[styles.listItemLabel, themeTextStyle]}>다크 테마 설정</Text>
                <Text style={styles.listItemDesc}>
                  {theme === 'dark' ? '현재 다크 모드 활성화됨' : '현재 라이트 모드 활성화됨'}
                </Text>
              </View>
            </View>
            <Switch
              value={theme === 'dark'}
              onValueChange={toggleTheme}
              trackColor={{ false: '#cbd5e1', true: '#93c5fd' }}
              thumbColor={theme === 'dark' ? '#2563eb' : '#f1f5f9'}
            />
          </View>

          {/* Account Details */}
          <View style={[styles.listItem, { borderBottomColor: themeBorderColor }]}>
            <Text style={[styles.detailItemLabel, themeTextStyle]}>이메일</Text>
            <Text style={styles.detailItemValue}>{user.email || '미등록'}</Text>
          </View>
          
          <View style={[styles.listItem, { borderBottomColor: themeBorderColor }]}>
            <Text style={[styles.detailItemLabel, themeTextStyle]}>휴대폰 번호</Text>
            <Text style={styles.detailItemValue}>{user.phone || '미등록'}</Text>
          </View>

          <View style={styles.listItem}>
            <Text style={[styles.detailItemLabel, themeTextStyle]}>입금 계좌</Text>
            <Text style={styles.detailItemValue} numberOfLines={1}>
              {user.bank && user.account ? `${user.bank} ${user.account} (${user.holder})` : '미등록'}
            </Text>
          </View>
        </View>

        {/* 4. Notifications Toggle Area */}
        <Text style={styles.listSectionLabel}>알림 설정</Text>
        <View style={[styles.card, themeCardStyle, styles.noPaddingCard]}>
          
          <View style={[styles.listItem, { borderBottomColor: themeBorderColor }]}>
            <View style={styles.listItemLeft}>
              <Bell size={16} stroke="#64748b" style={styles.bellIcon} />
              <View>
                <Text style={[styles.listItemLabel, themeTextStyle]}>미입력 현장 알림</Text>
                <Text style={styles.listItemDesc}>출근 기록이 누락된 현장이 있을 때 푸시 알림</Text>
              </View>
            </View>
            <Switch
              value={alerts.missing}
              onValueChange={(val) => setAlerts(a => ({ ...a, missing: val }))}
              trackColor={{ false: '#cbd5e1', true: '#93c5fd' }}
              thumbColor={alerts.missing ? '#2563eb' : '#f1f5f9'}
            />
          </View>

          <View style={[styles.listItem, { borderBottomColor: themeBorderColor }]}>
            <View style={styles.listItemLeft}>
              <Bell size={16} stroke="#64748b" style={styles.bellIcon} />
              <View>
                <Text style={[styles.listItemLabel, themeTextStyle]}>주간 요약 리포트</Text>
                <Text style={styles.listItemDesc}>매주 월요일 지난주 인건비 통계 리포트 받기</Text>
              </View>
            </View>
            <Switch
              value={alerts.weekly}
              onValueChange={(val) => setAlerts(a => ({ ...a, weekly: val }))}
              trackColor={{ false: '#cbd5e1', true: '#93c5fd' }}
              thumbColor={alerts.weekly ? '#2563eb' : '#f1f5f9'}
            />
          </View>

          <View style={styles.listItem}>
            <View style={styles.listItemLeft}>
              <Bell size={16} stroke="#64748b" style={styles.bellIcon} />
              <View>
                <Text style={[styles.listItemLabel, themeTextStyle]}>업체 투입 변동 알림</Text>
                <Text style={styles.listItemDesc}>현장 내 공종별 인원 변동 건수 발생 시 알림</Text>
              </View>
            </View>
            <Switch
              value={alerts.trade}
              onValueChange={(val) => setAlerts(a => ({ ...a, trade: val }))}
              trackColor={{ false: '#cbd5e1', true: '#93c5fd' }}
              thumbColor={alerts.trade ? '#2563eb' : '#f1f5f9'}
            />
          </View>
        </View>

        {/* 5. Logout Button */}
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
          activeOpacity={0.8}
        >
          <LogOut size={16} stroke="#ef4444" style={styles.logoutIcon} />
          <Text style={styles.logoutText}>로그아웃</Text>
        </TouchableOpacity>

      </ScrollView>

      {/* Profile Edit Modal Sheet */}
      <Modal
        visible={isEditOpen}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsEditOpen(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>프로필 편집</Text>
              <TouchableOpacity
                onPress={() => setIsEditOpen(false)}
                style={styles.closeButton}
                activeOpacity={0.7}
              >
                <X stroke="#475569" size={20} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              <View style={styles.field}>
                <Text style={styles.label}>이름</Text>
                <TextInput
                  style={styles.input}
                  placeholder="이름을 입력하세요"
                  placeholderTextColor="#94a3b8"
                  value={editName}
                  onChangeText={setEditName}
                  autoCorrect={false}
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>휴대폰 번호</Text>
                <TextInput
                  style={styles.input}
                  placeholder="휴대폰 번호 (예: 010-1234-5678)"
                  placeholderTextColor="#94a3b8"
                  value={editPhone}
                  onChangeText={setEditPhone}
                  keyboardType="phone-pad"
                  autoCorrect={false}
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>입금 은행</Text>
                <TextInput
                  style={styles.input}
                  placeholder="예: 국민은행"
                  placeholderTextColor="#94a3b8"
                  value={editBank}
                  onChangeText={setEditBank}
                  autoCorrect={false}
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>계좌 번호</Text>
                <TextInput
                  style={styles.input}
                  placeholder="계좌 번호를 입력하세요"
                  placeholderTextColor="#94a3b8"
                  value={editAccount}
                  onChangeText={setEditAccount}
                  keyboardType="number-pad"
                  autoCorrect={false}
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>예금주</Text>
                <TextInput
                  style={styles.input}
                  placeholder="예금주명을 입력하세요"
                  placeholderTextColor="#94a3b8"
                  value={editHolder}
                  onChangeText={setEditHolder}
                  autoCorrect={false}
                />
              </View>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.saveButton, !editName.trim() && styles.saveButtonDisabled]}
                  onPress={handleSaveProfile}
                  disabled={!editName.trim() || saving}
                  activeOpacity={0.8}
                >
                  <Text style={styles.saveButtonText}>
                    {saving ? '저장 중...' : '저장 완료'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => setIsEditOpen(false)}
                  disabled={saving}
                  activeOpacity={0.8}
                >
                  <Text style={styles.cancelButtonText}>취소</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  lightContainer: {
    backgroundColor: '#f8fafc',
  },
  darkContainer: {
    backgroundColor: '#0f172a',
  },
  scrollContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  card: {
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    marginBottom: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 1,
  },
  noPaddingCard: {
    padding: 0,
    overflow: 'hidden',
  },
  lightCard: {
    backgroundColor: '#ffffff',
    borderColor: '#e2e8f0',
  },
  darkCard: {
    backgroundColor: '#1e293b',
    borderColor: '#334155',
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '800',
  },
  profileInfo: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  profileName: {
    fontSize: 18,
    fontWeight: '800',
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  roleBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  profileEmail: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 3,
  },
  editBtn: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  statsRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    paddingTop: 16,
    justifyContent: 'space-between',
  },
  statCol: {
    flex: 1,
    alignItems: 'center',
  },
  statVal: {
    fontSize: 20,
    fontWeight: '800',
    color: '#2563eb',
  },
  statValDate: {
    fontSize: 14,
    color: '#475569',
    height: 24,
    lineHeight: 24,
  },
  statLabel: {
    fontSize: 10,
    color: '#94a3b8',
    fontWeight: '600',
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 24,
    alignSelf: 'center',
  },
  cardHeaderIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerIconBg: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerIconTextGroup: {
    flex: 1,
  },
  cardSectionTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  cardSectionSubtitle: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 2,
  },
  switchButton: {
    flexDirection: 'row',
    height: 40,
    borderRadius: 10,
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  switchButtonIcon: {
    marginRight: 6,
  },
  switchButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2563eb',
  },
  listSectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginLeft: 6,
    marginBottom: 8,
    marginTop: 8,
  },
  listItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  listItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  listItemIconBg: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: '#fff7ed', // light orange
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  bellIcon: {
    marginRight: 10,
  },
  listItemLabel: {
    fontSize: 14,
    fontWeight: '700',
  },
  listItemDesc: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 2,
  },
  detailItemLabel: {
    fontSize: 14,
    fontWeight: '700',
  },
  detailItemValue: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '600',
  },
  logoutButton: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#fca5a5',
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 24,
    backgroundColor: 'rgba(239, 68, 68, 0.02)',
  },
  logoutIcon: {
    marginRight: 6,
  },
  logoutText: {
    color: '#ef4444',
    fontSize: 15,
    fontWeight: '800',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: Dimensions.get('window').height * 0.85,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderColor: '#f1f5f9',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBody: {
    padding: 20,
  },
  field: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    height: 48,
    paddingHorizontal: 14,
    fontSize: 14,
    color: '#0f172a',
  },
  modalActions: {
    marginTop: 8,
    gap: 10,
    marginBottom: 20,
  },
  saveButton: {
    backgroundColor: '#2563eb',
    height: 48,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: '#93c5fd',
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  cancelButton: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    height: 48,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#475569',
    fontSize: 14,
    fontWeight: '700',
  },
  lightText: {
    color: '#0f172a',
  },
  darkText: {
    color: '#f8fafc',
  },
})
