import React, { useState } from 'react'
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Dimensions
} from 'react-native'
import { useAppStore } from '../../stores/app-store'
import { dayTotal, allSitesDayTotal, ymd, addDays, isSameDay, startOfMonth, endOfMonth, fmtKDate } from '../../lib/utils'
import { ChevronLeft, ChevronRight } from 'lucide-react-native'
import { useColorScheme } from '@/components/useColorScheme'

const SITE_COLORS = ['#2563EB', '#0EA5E9', '#8B5CF6', '#F59E0B', '#14B8A6', '#EC4899', '#6366F1', '#EF4444']

const TODAY = new Date()
TODAY.setHours(0, 0, 0, 0)

export default function CalendarScreen() {
  const { sites, trades, records } = useAppStore()
  const colorScheme = useColorScheme()
  const isDark = colorScheme === 'dark'

  const [activeSiteIds, setActiveSiteIds] = useState<string[]>(() =>
    sites.filter((s) => s.status !== '완료').map((s) => s.id)
  )
  const [viewMonth, setViewMonth] = useState(() => new Date(TODAY.getFullYear(), TODAY.getMonth(), 1))
  const [selected, setSelected] = useState(TODAY)

  function toggleSite(id: string) {
    setActiveSiteIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  const monthStart = startOfMonth(viewMonth)
  const monthEnd = endOfMonth(viewMonth)
  const startDow = (monthStart.getDay() + 6) % 7
  const gridStart = addDays(monthStart, -startDow)

  const weeks: Date[][] = []
  let cursor = new Date(gridStart)
  while (cursor <= monthEnd || weeks.length < 4) {
    const week: Date[] = []
    for (let i = 0; i < 7; i++) {
      week.push(new Date(cursor))
      cursor = addDays(cursor, 1)
    }
    weeks.push(week)
    if (cursor > monthEnd && weeks.length >= 4) break
  }

  const selectedStr = ymd(selected)
  const selectedDayTotals = activeSiteIds.map((sid) => ({
    site: sites.find((s) => s.id === sid)!,
    total: dayTotal(records, sid, selectedStr),
    color: SITE_COLORS[sites.findIndex((s) => s.id === sid) % SITE_COLORS.length],
  })).filter((x) => x.site)

  const themeContainerStyle = isDark ? styles.darkContainer : styles.lightContainer
  const themeCardStyle = isDark ? styles.darkCard : styles.lightCard
  const themeTextStyle = isDark ? styles.darkText : styles.lightText

  return (
    <SafeAreaView style={[styles.container, themeContainerStyle]}>
      {/* 1. Horizontal Scroll View for Site Filter Chips */}
      <View style={[styles.filterContainer, isDark && styles.darkBorderBottom]}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScroll}
        >
          {sites.map((site, i) => {
            const isActive = activeSiteIds.includes(site.id)
            const dotColor = SITE_COLORS[i % SITE_COLORS.length]
            return (
              <TouchableOpacity
                key={site.id}
                style={[
                  styles.chip,
                  isActive ? styles.chipActive : styles.chipInactive,
                  isDark && isActive && styles.chipActiveDark,
                  isDark && !isActive && styles.chipInactiveDark
                ]}
                onPress={() => toggleSite(site.id)}
                activeOpacity={0.7}
              >
                <View style={[styles.chipDot, { backgroundColor: dotColor }]} />
                <Text style={[
                  styles.chipText,
                  isActive ? styles.chipTextActive : styles.chipTextInactive,
                  isDark && isActive && styles.chipTextActiveDark
                ]}>
                  {site.name}
                </Text>
              </TouchableOpacity>
            )
          })}
        </ScrollView>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        {/* 2. Calendar Header (Month Switcher) */}
        <View style={styles.calendarCard}>
          <View style={styles.calendarHeader}>
            <TouchableOpacity
              style={[styles.headerNavButton, isDark && styles.darkNavButton]}
              onPress={() => setViewMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1))}
              activeOpacity={0.7}
            >
              <ChevronLeft size={20} color={isDark ? '#cbd5e1' : '#475569'} />
            </TouchableOpacity>
            <Text style={[styles.calendarMonthText, themeTextStyle]}>
              {viewMonth.getFullYear()}년 {viewMonth.getMonth() + 1}월
            </Text>
            <TouchableOpacity
              style={[styles.headerNavButton, isDark && styles.darkNavButton]}
              onPress={() => setViewMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1))}
              activeOpacity={0.7}
            >
              <ChevronRight size={20} color={isDark ? '#cbd5e1' : '#475569'} />
            </TouchableOpacity>
          </View>

          {/* 3. Weekdays Row */}
          <View style={styles.weekdaysRow}>
            {['월', '화', '수', '목', '금', '토', '일'].map((d, i) => {
              let dayColor = '#94a3b8' // slate-400
              if (i === 6) dayColor = '#f87171' // red-400 (일요일)
              if (i === 5) dayColor = '#60a5fa' // blue-400 (토요일)
              return (
                <View key={d} style={styles.weekdayCell}>
                  <Text style={[styles.weekdayText, { color: dayColor }]}>{d}</Text>
                </View>
              )
            })}
          </View>

          {/* 4. Days Grid */}
          <View style={styles.daysGrid}>
            {weeks.flat().map((d) => {
              const str = ymd(d)
              const isCurrentMonth = d.getMonth() === viewMonth.getMonth()
              const isSelected = isSameDay(d, selected)
              const isToday = isSameDay(d, TODAY)
              const total = allSitesDayTotal(records, activeSiteIds, str)
              const activeSiteDots = activeSiteIds
                .filter((sid) => dayTotal(records, sid, str) > 0)
                .slice(0, 5) // 모바일 화면폭 고려 최대 5개 노출

              return (
                <TouchableOpacity
                  key={str}
                  onPress={() => setSelected(d)}
                  activeOpacity={0.8}
                  style={[
                    styles.dayCell,
                    !isCurrentMonth && styles.dayCellOpacity,
                    isSelected && styles.dayCellSelected
                  ]}
                >
                  <Text style={[
                    styles.dayText,
                    isSelected ? styles.dayTextSelected : (isToday ? styles.dayTextToday : themeTextStyle),
                    !isCurrentMonth && !isSelected && styles.dayTextInactive
                  ]}>
                    {d.getDate()}
                  </Text>
                  
                  {total > 0 ? (
                    <Text style={[
                      styles.dayCount,
                      isSelected ? styles.dayCountSelected : styles.dayCountNormal
                    ]}>
                      {total}명
                    </Text>
                  ) : (
                    <Text style={styles.dayCountPlaceholder}> </Text>
                  )}

                  {/* Colored Dots for active sites */}
                  <View style={styles.dotsRow}>
                    {activeSiteDots.map((sid) => {
                      const idx = sites.findIndex((s) => s.id === sid)
                      const dotColor = isSelected ? '#ffffff' : SITE_COLORS[idx % SITE_COLORS.length]
                      return (
                        <View
                          key={sid}
                          style={[styles.dot, { backgroundColor: dotColor }]}
                        />
                      )
                    })}
                  </View>
                </TouchableOpacity>
              )
            })}
          </View>
        </View>

        {/* 5. Selection Details Card */}
        <View style={[styles.detailCard, themeCardStyle]}>
          <Text style={styles.detailTitle}>{fmtKDate(selected)}</Text>
          {selectedDayTotals.filter((x) => x.total > 0).length === 0 ? (
            <View style={styles.emptyDetailContainer}>
              <Text style={styles.emptyDetailText}>출근 기록이 없어요</Text>
            </View>
          ) : (
            <View style={styles.detailList}>
              {selectedDayTotals
                .filter((x) => x.total > 0)
                .map(({ site, total, color }) => (
                  <View key={site.id} style={styles.detailItem}>
                    <View style={[styles.detailIndicatorDot, { backgroundColor: color }]} />
                    <Text style={[styles.detailNameText, themeTextStyle]} numberOfLines={1}>
                      {site.name}
                    </Text>
                    <Text style={[styles.detailCountText, themeTextStyle]}>{total}명</Text>
                  </View>
                ))}
            </View>
          )}
        </View>
      </ScrollView>
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
  filterContainer: {
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderColor: '#e2e8f0',
  },
  darkBorderBottom: {
    backgroundColor: '#1e293b',
    borderColor: '#334155',
  },
  filterScroll: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
  },
  chipActive: {
    backgroundColor: '#eff6ff',
    borderColor: '#93c5fd',
  },
  chipActiveDark: {
    backgroundColor: '#1e3a8a',
    borderColor: '#2563eb',
  },
  chipInactive: {
    backgroundColor: '#f8fafc',
    borderColor: '#e2e8f0',
  },
  chipInactiveDark: {
    backgroundColor: '#0f172a',
    borderColor: '#334155',
  },
  chipDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  chipTextActive: {
    color: '#1d4ed8',
  },
  chipTextActiveDark: {
    color: '#dbeafe',
  },
  chipTextInactive: {
    color: '#64748b',
  },
  scrollContainer: {
    padding: 16,
  },
  calendarCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 1,
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerNavButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  darkNavButton: {
    backgroundColor: '#1e293b',
  },
  calendarMonthText: {
    fontSize: 16,
    fontWeight: '800',
  },
  weekdaysRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  weekdayCell: {
    flex: 1,
    alignItems: 'center',
  },
  weekdayText: {
    fontSize: 11,
    fontWeight: '700',
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: '14.28%', // 7 columns grid
    height: 60,
    alignItems: 'center',
    paddingVertical: 6,
    borderRadius: 8,
  },
  dayCellOpacity: {
    opacity: 0.3,
  },
  dayCellSelected: {
    backgroundColor: '#2563eb', // Brand Blue highlight
  },
  dayText: {
    fontSize: 13,
    fontWeight: '700',
  },
  dayTextSelected: {
    color: '#ffffff',
  },
  dayTextToday: {
    color: '#2563eb',
  },
  dayTextInactive: {
    color: '#94a3b8',
  },
  dayCount: {
    fontSize: 9,
    fontWeight: '700',
    marginTop: 2,
  },
  dayCountSelected: {
    color: '#bfdbfe',
  },
  dayCountNormal: {
    color: '#64748b',
  },
  dayCountPlaceholder: {
    fontSize: 9,
    marginTop: 2,
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 3,
    marginTop: 4,
    height: 6,
    width: '100%',
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  detailCard: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
  },
  lightCard: {
    backgroundColor: '#ffffff',
    borderColor: '#e2e8f0',
  },
  darkCard: {
    backgroundColor: '#1e293b',
    borderColor: '#334155',
  },
  detailTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748b',
    marginBottom: 14,
  },
  emptyDetailContainer: {
    paddingVertical: 12,
  },
  emptyDetailText: {
    fontSize: 13,
    color: '#94a3b8',
    fontWeight: '500',
  },
  detailList: {
    gap: 12,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailIndicatorDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  detailNameText: {
    fontSize: 13,
    fontWeight: '700',
    flex: 1,
  },
  detailCountText: {
    fontSize: 13,
    fontWeight: '800',
  },
  lightText: {
    color: '#0f172a',
  },
  darkText: {
    color: '#f8fafc',
  },
})
