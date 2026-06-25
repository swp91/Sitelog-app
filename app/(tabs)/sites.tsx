import React, { useState } from 'react'
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Dimensions
} from 'react-native'
import { useAppStore } from '../../stores/app-store'
import { useRouter } from 'expo-router'
import { dayTotal, ymd } from '../../lib/utils'
import type { Site, SiteStatus } from '../../lib/types'
import { Plus, Search, MapPin, User, ClipboardList, Pencil, Trash2, X } from 'lucide-react-native'

const TODAY = new Date()
const todayStr = ymd(TODAY)

const statusTone: Record<SiteStatus, string> = {
  '진행중': '#e0f2fe',
  '마감임박': '#fef3c7',
  '완료': '#f1f5f9',
}

const statusText: Record<SiteStatus, string> = {
  '진행중': '#0284c7',
  '마감임박': '#d97706',
  '완료': '#475569',
}

const STATUS_OPTIONS: SiteStatus[] = ['진행중', '마감임박', '완료']

const EMPTY_DRAFT: Omit<Site, 'id'> = {
  name: '', addr: '', status: '진행중', start: '', manager: '',
}

export default function SitesScreen() {
  const { sites, records, addSite, updateSite, deleteSite, flash } = useAppStore()
  const router = useRouter()

  const [search, setSearch] = useState('')
  const [sheet, setSheet] = useState<null | 'new' | Site>(null)
  const [draft, setDraft] = useState<Omit<Site, 'id'>>(EMPTY_DRAFT)

  const filtered = sites.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    (s.addr ?? '').toLowerCase().includes(search.toLowerCase()),
  )

  function openNew() {
    setDraft(EMPTY_DRAFT)
    setSheet('new')
  }

  function openEdit(site: Site) {
    setDraft({
      name: site.name,
      addr: site.addr ?? '',
      status: site.status,
      start: site.start ?? '',
      manager: site.manager ?? ''
    })
    setSheet(site)
  }

  function save() {
    if (!draft.name.trim() || sheet === null) return
    if (sheet === 'new') {
      addSite(draft)
      flash('현장이 추가되었어요')
    } else {
      updateSite({ ...sheet, ...draft })
      flash('현장이 수정되었어요')
    }
    setSheet(null)
  }

  function remove(site: Site) {
    Alert.alert(
      '현장 삭제',
      `"${site.name}"을(를) 삭제할까요? 관련 기록도 모두 삭제됩니다.`,
      [
        { text: '취소', style: 'cancel' },
        {
          text: '삭제',
          style: 'destructive',
          onPress: () => {
            deleteSite(site.id)
            setSheet(null)
            flash('현장이 삭제되었어요')
          }
        }
      ]
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Search Input Bar */}
      <View style={styles.searchBarContainer}>
        <View style={styles.searchBar}>
          <Search color="#94a3b8" size={18} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="현장명 또는 주소 검색"
            placeholderTextColor="#94a3b8"
            value={search}
            onChangeText={setSearch}
            autoCorrect={false}
          />
        </View>
      </View>

      {/* Sites List View */}
      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        {filtered.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>
              {search ? '검색 결과가 없어요' : '등록된 현장이 없습니다.'}
            </Text>
          </View>
        ) : (
          filtered.map((site) => {
            const total = dayTotal(records, site.id, todayStr)
            return (
              <View key={site.id} style={styles.siteCard}>
                <View style={styles.cardHeader}>
                  <View style={styles.cardInfo}>
                    <Text style={styles.siteName}>{site.name}</Text>
                    {site.addr ? (
                      <View style={styles.iconRow}>
                        <MapPin stroke="#94a3b8" size={12} style={styles.rowIcon} />
                        <Text style={styles.addrText} numberOfLines={1}>{site.addr}</Text>
                      </View>
                    ) : null}
                  </View>
                  <View style={[styles.badge, { backgroundColor: statusTone[site.status] }]}>
                    <Text style={[styles.badgeText, { color: statusText[site.status] }]}>
                      {site.status}
                    </Text>
                  </View>
                </View>

                {site.manager ? (
                  <View style={[styles.iconRow, styles.managerRow]}>
                    <User stroke="#64748b" size={13} style={styles.rowIcon} />
                    <Text style={styles.managerText}>담당: {site.manager}</Text>
                  </View>
                ) : null}

                <View style={styles.cardFooter}>
                  <Text style={styles.todayCountText}>오늘 투입 {total}명</Text>
                  <View style={styles.actionButtons}>
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => router.push(`/sites/${site.id}` as any)}
                      activeOpacity={0.7}
                    >
                      <ClipboardList stroke="#2563eb" size={13} style={styles.buttonIcon} />
                      <Text style={styles.actionButtonText}>기록</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.outlineButton]}
                      onPress={() => openEdit(site)}
                      activeOpacity={0.7}
                    >
                      <Pencil stroke="#475569" size={13} style={styles.buttonIcon} />
                      <Text style={[styles.actionButtonText, styles.outlineButtonText]}>수정</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            )
          })
        )}
      </ScrollView>

      {/* Floating Action Button (FAB) */}
      <TouchableOpacity
        style={styles.fab}
        onPress={openNew}
        activeOpacity={0.8}
      >
        <Plus stroke="#ffffff" size={26} />
      </TouchableOpacity>

      {/* Bottom Sheet Form (Modal) */}
      <Modal
        visible={sheet !== null}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setSheet(null)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {sheet === 'new' ? '새 현장 추가' : '현장 수정'}
              </Text>
              <TouchableOpacity
                onPress={() => setSheet(null)}
                style={styles.closeButton}
                activeOpacity={0.7}
              >
                <X stroke="#475569" size={20} />
              </TouchableOpacity>
            </View>

            {/* Modal Body / Input Fields */}
            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              <View style={styles.field}>
                <Text style={styles.label}>현장 이름 *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="현장명을 입력하세요"
                  placeholderTextColor="#94a3b8"
                  value={draft.name}
                  onChangeText={(text) => setDraft((d) => ({ ...d, name: text }))}
                  autoCorrect={false}
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>주소</Text>
                <TextInput
                  style={styles.input}
                  placeholder="현장 주소"
                  placeholderTextColor="#94a3b8"
                  value={draft.addr || ''}
                  onChangeText={(text) => setDraft((d) => ({ ...d, addr: text }))}
                  autoCorrect={false}
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>담당 관리기사</Text>
                <TextInput
                  style={styles.input}
                  placeholder="담당자 이름"
                  placeholderTextColor="#94a3b8"
                  value={draft.manager || ''}
                  onChangeText={(text) => setDraft((d) => ({ ...d, manager: text }))}
                  autoCorrect={false}
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>상태</Text>
                <View style={styles.segmentedControl}>
                  {STATUS_OPTIONS.map((status) => {
                    const isSelected = draft.status === status
                    return (
                      <TouchableOpacity
                        key={status}
                        style={[
                          styles.segmentOption,
                          isSelected && styles.segmentOptionSelected
                        ]}
                        onPress={() => setDraft((d) => ({ ...d, status }))}
                        activeOpacity={0.8}
                      >
                        <Text
                          style={[
                            styles.segmentOptionText,
                            isSelected && styles.segmentOptionTextSelected
                          ]}
                        >
                          {status}
                        </Text>
                      </TouchableOpacity>
                    )
                  })}
                </View>
              </View>

              {/* Action Buttons inside Form */}
              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.saveButton, !draft.name.trim() && styles.saveButtonDisabled]}
                  onPress={save}
                  disabled={!draft.name.trim()}
                  activeOpacity={0.8}
                >
                  <Text style={styles.saveButtonText}>
                    {sheet === 'new' ? '추가' : '저장'}
                  </Text>
                </TouchableOpacity>

                {sheet && sheet !== 'new' ? (
                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={() => remove(sheet as Site)}
                    activeOpacity={0.8}
                  >
                    <Trash2 stroke="#ef4444" size={16} style={styles.buttonIcon} />
                    <Text style={styles.deleteButtonText}>현장 삭제</Text>
                  </TouchableOpacity>
                ) : null}
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
    backgroundColor: '#f8fafc',
  },
  searchBarContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderColor: '#e2e8f0',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderRadius: 10,
    height: 40,
    paddingHorizontal: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#0f172a',
    height: '100%',
    padding: 0, // OS별 텍스트 인풋 내측 여백 차이 리셋
  },
  scrollContainer: {
    padding: 16,
    paddingBottom: 88, // FAB 및 하단 네비 공간 확보
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#94a3b8',
    fontWeight: '500',
  },
  siteCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 12,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cardInfo: {
    flex: 1,
    marginRight: 8,
  },
  siteName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  iconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  rowIcon: {
    marginRight: 4,
  },
  addrText: {
    fontSize: 12,
    color: '#64748b',
    flex: 1,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  managerRow: {
    marginTop: 8,
  },
  managerText: {
    fontSize: 13,
    color: '#475569',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 12,
    marginTop: 14,
  },
  todayCountText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eff6ff', // light blue
    borderRadius: 8,
    paddingHorizontal: 10,
    height: 32,
    justifyContent: 'center',
  },
  buttonIcon: {
    marginRight: 4,
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2563eb',
  },
  outlineButton: {
    backgroundColor: '#f1f5f9', // light slate
  },
  outlineButtonText: {
    color: '#475569',
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 20, // 하단 탭바(Bottom Navigation) 높이 대응
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#2563eb',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.4)', // backdrop slate shadow
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
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderRadius: 10,
    padding: 3,
  },
  segmentOption: {
    flex: 1,
    height: 38,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  segmentOptionSelected: {
    backgroundColor: '#ffffff',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  segmentOptionText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
  },
  segmentOptionTextSelected: {
    color: '#0f172a',
    fontWeight: '700',
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
  deleteButton: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#fca5a5', // light red
    height: 48,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteButtonText: {
    color: '#ef4444',
    fontSize: 14,
    fontWeight: '700',
  },
})
